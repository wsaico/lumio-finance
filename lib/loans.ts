import { addDays, addMonths, addWeeks, differenceInCalendarDays, startOfDay } from 'date-fns'

export type LoanKind = 'RECEIVABLE' | 'PAYABLE'
export type LoanPaymentFrequency = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'

/**
 * Parses a YYYY-MM-DD date string as local midnight to prevent UTC timezone shifts
 * (e.g. "2026-11-20" showing as "19 Nov" in UTC-5).
 */
export function parseLocalDate(value?: string | Date | null): Date | null {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (dateOnlyMatch) {
        const [, y, m, d] = dateOnlyMatch
        return new Date(Number(y), Number(m) - 1, Number(d))
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formats a local Date as YYYY-MM-DD (never shifts day via UTC).
 */
export function toLocalDateString(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/**
 * Calendar days between today and target date:
 * > 0: days until due
 * = 0: due today
 * < 0: days overdue
 */
export function getCalendarDaysUntil(dateValue?: string | Date | null): number | null {
    const target = parseLocalDate(dateValue)
    if (!target) return null
    return differenceInCalendarDays(startOfDay(target), startOfDay(new Date()))
}

export function formatPaymentFrequency(freq?: string | null): string {
    switch (freq) {
        case 'MONTHLY':
            return 'Mensual'
        case 'WEEKLY':
            return 'Semanal'
        case 'BIWEEKLY':
            return 'Quincenal'
        case 'SINGLE':
            return 'Pago único'
        default:
            return 'Mensual'
    }
}

export interface GeneratedInstallment {
    installmentNumber: number
    dueDate: Date
    dueDateString: string
    principalAmount: number
    interestAmount: number
    totalAmount: number
}

/**
 * Deterministic installment schedule generator shared by both the CreateLoanModal preview
 * and the AR/AP POST endpoints so preview and persisted records always match.
 */
export function buildInstallmentSchedule(params: {
    amount: number
    interestRate?: number
    totalInstallments?: number
    paymentFrequency?: LoanPaymentFrequency
    firstDueDate?: string | Date | null
}): GeneratedInstallment[] {
    const amount = Number(params.amount || 0)
    const frequency: LoanPaymentFrequency = params.paymentFrequency || 'MONTHLY'
    const count = frequency === 'SINGLE' ? 1 : Math.max(1, Math.floor(Number(params.totalInstallments || 1)))
    const interestRate = Math.max(0, Number(params.interestRate || 0))

    if (amount <= 0) return []

    const principalBase = Math.round((amount / count) * 100) / 100
    const totalInterest = Math.round(amount * (interestRate / 100) * 100) / 100
    const interestBase = Math.round((totalInterest / count) * 100) / 100

    let currentDate = parseLocalDate(params.firstDueDate)
    if (!currentDate) {
        currentDate = startOfDay(new Date())
        if (frequency === 'MONTHLY') currentDate = addMonths(currentDate, 1)
        else if (frequency === 'WEEKLY') currentDate = addWeeks(currentDate, 1)
        else if (frequency === 'BIWEEKLY') currentDate = addDays(currentDate, 14)
    }

    const schedule: GeneratedInstallment[] = []

    for (let i = 1; i <= count; i++) {
        const isLast = i === count
        const principalAmount = isLast
            ? Math.round((amount - principalBase * (count - 1)) * 100) / 100
            : principalBase
        const interestAmount = isLast
            ? Math.round((totalInterest - interestBase * (count - 1)) * 100) / 100
            : interestBase
        const totalAmount = Math.round((principalAmount + interestAmount) * 100) / 100

        schedule.push({
            installmentNumber: i,
            dueDate: new Date(currentDate),
            dueDateString: toLocalDateString(currentDate),
            principalAmount,
            interestAmount,
            totalAmount,
        })

        if (frequency === 'MONTHLY') currentDate = addMonths(currentDate, 1)
        else if (frequency === 'WEEKLY') currentDate = addWeeks(currentDate, 1)
        else if (frequency === 'BIWEEKLY') currentDate = addDays(currentDate, 14)
    }

    return schedule
}

/**
 * Computes the effective persisted status for a loan after balance changes.
 */
export function computeLoanStatus(params: {
    kind: LoanKind
    originalAmount: number
    outstandingBalance: number
    dueDate?: string | null
    currentStatus?: string | null
}): string {
    if (params.currentStatus === 'CANCELLED') return 'CANCELLED'

    const balance = Math.max(0, Number(params.outstandingBalance || 0))
    const original = Math.max(0, Number(params.originalAmount || 0))

    if (balance <= 0.009) {
        return params.kind === 'RECEIVABLE' ? 'COLLECTED' : 'PAID'
    }

    const daysUntil = getCalendarDaysUntil(params.dueDate)
    if (daysUntil !== null && daysUntil < 0) {
        return 'OVERDUE'
    }

    if (original - balance > 0.009) {
        return 'PARTIAL'
    }

    return 'PENDING'
}

/**
 * Unified mapper for both accounts_receivable and accounts_payable rows.
 */
export function mapLoanAccountRow(row: any, kind: LoanKind) {
    if (!row) return null

    const originalAmount = Number(row.original_amount || 0)
    const outstandingBalance = Math.max(0, Number(row.outstanding_balance || 0))
    const totalPaid = Math.max(0, Math.round((originalAmount - outstandingBalance) * 100) / 100)
    const percentPaid =
        originalAmount > 0 ? Math.min(100, Math.max(0, (totalPaid / originalAmount) * 100)) : 0

    const daysUntil = getCalendarDaysUntil(row.due_date)
    const daysOverdue =
        outstandingBalance > 0.009 && daysUntil !== null && daysUntil < 0
            ? Math.abs(daysUntil)
            : undefined

    const effectiveStatus = computeLoanStatus({
        kind,
        originalAmount,
        outstandingBalance,
        dueDate: row.due_date,
        currentStatus: row.status,
    })

    // Self-healing installment statuses based on total principal paid + overdue date
    let accumulatedPrincipalPaid = 0
    const installments = (row.loan_installments || [])
        .slice()
        .sort((a: any, b: any) => a.installment_number - b.installment_number)
        .map((i: any) => {
            const principal = Number(i.principal_amount || 0)
            const interest = Number(i.interest_amount || 0)
            const computedTotal = Math.round((principal + interest) * 100) / 100
            const totalAmount =
                i.total_amount !== null && i.total_amount !== undefined && Number(i.total_amount) > 0
                    ? Number(i.total_amount)
                    : computedTotal

            let instStatus = i.status || 'PENDING'
            if (accumulatedPrincipalPaid + (principal - 0.001) <= totalPaid && totalPaid > 0.001) {
                instStatus = 'PAID'
            } else if (instStatus !== 'PAID' && instStatus !== 'CANCELLED') {
                const instDays = getCalendarDaysUntil(i.due_date)
                if (instDays !== null && instDays < 0) {
                    instStatus = 'OVERDUE'
                }
            }

            accumulatedPrincipalPaid = Math.round((accumulatedPrincipalPaid + principal) * 100) / 100

            return {
                id: i.id,
                installmentNumber: i.installment_number,
                dueDate: i.due_date,
                principalAmount: principal,
                interestAmount: interest,
                totalAmount,
                status: instStatus,
                paidAt: i.paid_at,
            }
        })

    const payments = (row.payments || [])
        .slice()
        .sort(
            (a: any, b: any) =>
                new Date(b.payment_date || b.created_at).getTime() -
                new Date(a.payment_date || a.created_at).getTime()
        )
        .map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            accountReceivableId: p.account_receivable_id || undefined,
            accountPayableId: p.account_payable_id || undefined,
            amount: Number(p.amount || 0),
            principalAmount: Number(p.principal_amount || 0),
            interestAmount: Number(p.interest_amount || 0),
            currencyCode: p.currency_code,
            paymentDate: p.payment_date,
            transactionId: p.transaction_id || undefined,
            notes: p.notes || undefined,
            paymentMethod: p.payment_method || undefined,
            createdAt: p.created_at,
        }))

    return {
        id: row.id,
        userId: row.user_id,
        contactName: row.contact_name,
        contactEmail: row.contact_email || undefined,
        contactPhone: row.contact_phone || undefined,
        originalAmount,
        outstandingBalance,
        currencyCode: row.currency_code,
        status: effectiveStatus,
        loanDate: row.loan_date || row.created_at,
        dueDate: row.due_date || undefined,
        collectedAt: row.collected_at || undefined,
        paidAt: row.paid_at || undefined,
        notes: row.notes || undefined,
        interestRate: Number(row.interest_rate || 0),
        linkedTransactionId: row.linked_transaction_id || undefined,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payments,
        totalPaid,
        percentPaid,
        daysOverdue,
        interestType: row.interest_type || 'SIMPLE',
        paymentFrequency: row.payment_frequency || 'MONTHLY',
        totalInstallments: Number(row.total_installments || 1),
        startDate: row.start_date || undefined,
        installments,
    }
}
