import type { SupabaseClient } from '@supabase/supabase-js'
import {
    buildInstallmentSchedule,
    computeLoanStatus,
    mapLoanAccountRow,
    toLocalDateString,
    type LoanKind,
    type LoanPaymentFrequency,
} from '@/lib/loans'

export interface CreateLoanInput {
    contactName: string
    contactEmail?: string
    contactPhone?: string
    amount: number
    currencyCode: string
    dueDate?: string
    notes?: string
    interestRate?: number
    accountId: string
    interestType: 'SIMPLE' | 'COMPOUND'
    paymentFrequency: LoanPaymentFrequency
    totalInstallments: number
}

export interface LoanPaymentInput {
    paymentAmount: number
    principalAmount?: number
    interestAmount?: number
    accountId: string
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER'
    notes?: string
}

async function findOrCreateCategory(
    supabase: SupabaseClient,
    table: 'expense_categories' | 'income_categories',
    userId: string,
    name: string,
    icon: string,
    color: string,
    budgetRule?: string
): Promise<string | null> {
    const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', userId)
        .ilike('name', name)
        .maybeSingle()

    if (existing?.id) return existing.id

    const insertData: Record<string, any> = {
        user_id: userId,
        name,
        icon,
        color,
        is_system: false,
        is_active: true,
    }
    if (table === 'expense_categories' && budgetRule) {
        insertData.budget_rule = budgetRule
    }

    const { data: created } = await supabase
        .from(table)
        .insert(insertData)
        .select('id')
        .single()

    return created?.id || null
}

function getTableName(kind: LoanKind) {
    return kind === 'RECEIVABLE' ? 'accounts_receivable' : 'accounts_payable'
}

function getForeignKeyColumn(kind: LoanKind) {
    return kind === 'RECEIVABLE' ? 'account_receivable_id' : 'account_payable_id'
}

export async function listLoanAccounts(
    supabase: SupabaseClient,
    userId: string,
    kind: LoanKind,
    statusFilter?: string | null
) {
    const table = getTableName(kind)

    const { data, error } = await supabase
        .from(table)
        .select(`
            *,
            payments:loan_payments(*),
            loan_installments(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) throw error

    const mapped = (data || []).map((row: any) => mapLoanAccountRow(row, kind)).filter(Boolean)

    if (statusFilter && statusFilter !== 'ALL') {
        return mapped.filter((item: any) => item.status === statusFilter)
    }

    return mapped
}

export async function createLoanAccount(
    supabase: SupabaseClient,
    userId: string,
    kind: LoanKind,
    validated: CreateLoanInput
) {
    const isReceivable = kind === 'RECEIVABLE'
    const table = getTableName(kind)
    const fkCol = getForeignKeyColumn(kind)

    // 1. Validate account ownership & balance
    const { data: accountData, error: accError } = await supabase
        .from('accounts')
        .select('id, current_balance, name, currency_code')
        .eq('id', validated.accountId)
        .eq('user_id', userId)
        .single()

    if (accError || !accountData) {
        return {
            error: { status: 404, body: { error: 'Cuenta no encontrada' } },
        }
    }

    const currentBalance = Number(accountData.current_balance || 0)
    if (isReceivable && currentBalance < validated.amount) {
        const shortage = validated.amount - currentBalance
        return {
            error: {
                status: 400,
                body: {
                    error: 'Saldo insuficiente',
                    details: `La cuenta "${accountData.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas prestar ${validated.amount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${validated.currencyCode}`,
                    balanceInfo: {
                        currentBalance,
                        requestedAmount: validated.amount,
                        shortage,
                    },
                },
            },
        }
    }

    // 2. Find or create 'Préstamos' category
    const categoryId = isReceivable
        ? await findOrCreateCategory(supabase, 'expense_categories', userId, 'Préstamos', 'landmark', '#10b981', 'SAVINGS')
        : await findOrCreateCategory(supabase, 'income_categories', userId, 'Préstamos', 'landmark', '#10b981')

    // 3. Create initial cash movement transaction
    const nowIso = new Date().toISOString()
    const transactionPayload: Record<string, any> = {
        user_id: userId,
        transaction_type: isReceivable ? 'EXPENSE' : 'INCOME',
        account_id: validated.accountId,
        amount: validated.amount,
        currency_code: validated.currencyCode,
        transaction_date: nowIso,
        description: isReceivable
            ? `Préstamo otorgado a ${validated.contactName}`
            : `Préstamo recibido de ${validated.contactName}`,
        metadata: {
            isLoanMovement: true,
            hideFromList: false,
            loanType: isReceivable ? 'LENT' : 'BORROWED',
        },
    }
    if (isReceivable) transactionPayload.expense_category_id = categoryId
    else transactionPayload.income_category_id = categoryId

    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert(transactionPayload)
        .select()
        .single()

    if (txError) throw txError

    // 4. Update account balance
    const nextBalance = isReceivable
        ? Math.round((currentBalance - validated.amount) * 100) / 100
        : Math.round((currentBalance + validated.amount) * 100) / 100

    await supabase
        .from('accounts')
        .update({ current_balance: nextBalance })
        .eq('id', validated.accountId)
        .eq('user_id', userId)

    // 5. Generate installment schedule (same formula as UI preview)
    const schedule = buildInstallmentSchedule({
        amount: validated.amount,
        interestRate: validated.interestRate || 0,
        totalInstallments: validated.totalInstallments || 1,
        paymentFrequency: validated.paymentFrequency,
        firstDueDate: validated.dueDate,
    })

    // Final maturity date = last installment's due date (or validated.dueDate)
    const finalDueDate =
        schedule.length > 0
            ? schedule[schedule.length - 1].dueDateString
            : validated.dueDate || null

    const todayStr = toLocalDateString(new Date())

    // 6. Insert AR/AP record
    const { data: createdLoan, error: loanError } = await supabase
        .from(table)
        .insert({
            user_id: userId,
            contact_name: validated.contactName.trim(),
            contact_email: validated.contactEmail || null,
            contact_phone: validated.contactPhone || null,
            original_amount: validated.amount,
            outstanding_balance: validated.amount,
            currency_code: validated.currencyCode,
            status: 'PENDING',
            loan_date: nowIso,
            due_date: finalDueDate,
            notes: validated.notes || null,
            interest_rate: validated.interestRate || 0,
            linked_transaction_id: transaction.id,
            metadata: {},
            interest_type: validated.interestType,
            payment_frequency: validated.paymentFrequency,
            total_installments: schedule.length || 1,
            start_date: todayStr,
        })
        .select()
        .single()

    if (loanError) throw loanError

    // 7. Persist installments
    if (schedule.length > 0) {
        const rows = schedule.map((inst) => ({
            [fkCol]: createdLoan.id,
            installment_number: inst.installmentNumber,
            due_date: inst.dueDateString,
            principal_amount: inst.principalAmount,
            interest_amount: inst.interestAmount,
            status: 'PENDING',
        }))

        const { error: instError } = await supabase.from('loan_installments').insert(rows)
        if (instError) {
            console.error(`[LOANS_SERVICE] Error creating installments for ${table}:`, instError)
        }
    }

    return { data: mapLoanAccountRow(createdLoan, kind) }
}

export async function registerLoanPayment(
    supabase: SupabaseClient,
    userId: string,
    kind: LoanKind,
    id: string,
    validated: LoanPaymentInput
) {
    const isReceivable = kind === 'RECEIVABLE'
    const table = getTableName(kind)
    const fkCol = getForeignKeyColumn(kind)

    // 1. Fetch loan
    const { data: loan, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (fetchError || !loan) {
        return { error: { status: 404, body: { error: 'Préstamo no encontrado' } } }
    }

    const outstandingBalance = Number(loan.outstanding_balance || 0)
    const principalAmount = validated.principalAmount ?? validated.paymentAmount
    const interestAmount = validated.interestAmount ?? 0

    if (principalAmount > outstandingBalance + 0.01) {
        return {
            error: {
                status: 400,
                body: { error: 'El abono a capital excede el saldo pendiente' },
            },
        }
    }

    // 2. Verify account ownership & balance (for payable outflows)
    const { data: account, error: accError } = await supabase
        .from('accounts')
        .select('id, current_balance, name')
        .eq('id', validated.accountId)
        .eq('user_id', userId)
        .single()

    if (accError || !account) {
        return { error: { status: 404, body: { error: 'Cuenta no encontrada' } } }
    }

    const currentAccBalance = Number(account.current_balance || 0)
    if (!isReceivable && currentAccBalance < validated.paymentAmount) {
        const shortage = validated.paymentAmount - currentAccBalance
        return {
            error: {
                status: 400,
                body: {
                    error: 'Saldo insuficiente',
                    details: `La cuenta "${account.name}" tiene un saldo de ${currentAccBalance.toFixed(2)} pero intentas pagar ${validated.paymentAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${loan.currency_code}`,
                    balanceInfo: {
                        currentBalance: currentAccBalance,
                        requestedAmount: validated.paymentAmount,
                        shortage,
                    },
                },
            },
        }
    }

    // 3. Categories
    const catTable = isReceivable ? 'income_categories' : 'expense_categories'
    const [interestCategoryId, principalCategoryId] = await Promise.all([
        findOrCreateCategory(
            supabase,
            catTable,
            userId,
            isReceivable ? 'Ingresos por Intereses' : 'Gastos por Intereses',
            'trending-up',
            isReceivable ? '#10b981' : '#ef4444',
            isReceivable ? undefined : 'NEEDS'
        ),
        findOrCreateCategory(
            supabase,
            catTable,
            userId,
            'Préstamos',
            'landmark',
            '#10b981',
            isReceivable ? undefined : 'SAVINGS'
        ),
    ])

    // 4. Create split transactions
    const nowIso = new Date().toISOString()
    let principalTransactionId: string | null = null
    let interestTransactionId: string | null = null

    if (principalAmount > 0) {
        const payload: Record<string, any> = {
            user_id: userId,
            transaction_type: isReceivable ? 'INCOME' : 'EXPENSE',
            account_id: validated.accountId,
            amount: principalAmount,
            currency_code: loan.currency_code,
            transaction_date: nowIso,
            description: isReceivable
                ? `Cobro capital: ${loan.contact_name}`
                : `Pago capital: ${loan.contact_name}`,
            metadata: {
                [isReceivable ? 'isLoanCollection' : 'isDebtPayment']: true,
                isPrincipal: true,
                [isReceivable ? 'accountReceivableId' : 'accountPayableId']: id,
            },
        }
        if (isReceivable) payload.income_category_id = principalCategoryId
        else payload.expense_category_id = principalCategoryId

        const { data: pTx, error: pErr } = await supabase
            .from('transactions')
            .insert(payload)
            .select('id')
            .single()

        if (pErr) throw pErr
        principalTransactionId = pTx.id
    }

    if (interestAmount > 0) {
        const payload: Record<string, any> = {
            user_id: userId,
            transaction_type: isReceivable ? 'INCOME' : 'EXPENSE',
            account_id: validated.accountId,
            amount: interestAmount,
            currency_code: loan.currency_code,
            transaction_date: nowIso,
            description: isReceivable
                ? `Interés ganado: ${loan.contact_name}`
                : `Interés pagado: ${loan.contact_name}`,
            metadata: {
                [isReceivable ? 'isLoanCollection' : 'isDebtPayment']: true,
                isInterest: true,
                [isReceivable ? 'accountReceivableId' : 'accountPayableId']: id,
            },
        }
        if (isReceivable) payload.income_category_id = interestCategoryId
        else payload.expense_category_id = interestCategoryId

        const { data: iTx, error: iErr } = await supabase
            .from('transactions')
            .insert(payload)
            .select('id')
            .single()

        if (iErr) throw iErr
        interestTransactionId = iTx.id
    }

    // 5. Update account balance
    const nextAccBalance = isReceivable
        ? Math.round((currentAccBalance + validated.paymentAmount) * 100) / 100
        : Math.round((currentAccBalance - validated.paymentAmount) * 100) / 100

    await supabase
        .from('accounts')
        .update({ current_balance: nextAccBalance })
        .eq('id', validated.accountId)
        .eq('user_id', userId)

    // 6. Insert payment record
    const { error: paymentError } = await supabase.from('loan_payments').insert({
        user_id: userId,
        [fkCol]: id,
        amount: validated.paymentAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        currency_code: loan.currency_code,
        transaction_id: principalTransactionId || interestTransactionId,
        payment_method: validated.paymentMethod || 'TRANSFER',
        notes: validated.notes || null,
        metadata: {
            principalTransactionId,
            interestTransactionId,
            accountId: validated.accountId,
        },
    })

    if (paymentError) throw paymentError

    // 7. Update installment statuses (waterfall)
    let remainingPrincipalPayment = principalAmount
    const { data: installments } = await supabase
        .from('loan_installments')
        .select('*')
        .eq(fkCol, id)
        .order('installment_number', { ascending: true })

    if (installments) {
        for (const inst of installments) {
            if (remainingPrincipalPayment <= 0.001) break
            if (inst.status === 'PAID') continue

            const openAmount = Number(inst.principal_amount || 0)
            if (remainingPrincipalPayment >= openAmount - 0.001) {
                await supabase
                    .from('loan_installments')
                    .update({ status: 'PAID', paid_at: nowIso })
                    .eq('id', inst.id)
                remainingPrincipalPayment -= openAmount
            } else {
                remainingPrincipalPayment = 0
            }
        }
    }

    // 8. Update outstanding balance, status, and completion timestamp
    let newBalance = Math.round((outstandingBalance - principalAmount) * 100) / 100
    if (newBalance < 0.01) newBalance = 0

    const nextStatus = computeLoanStatus({
        kind,
        originalAmount: Number(loan.original_amount || 0),
        outstandingBalance: newBalance,
        dueDate: loan.due_date,
        currentStatus: loan.status,
    })

    const loanUpdate: Record<string, any> = {
        outstanding_balance: newBalance,
        status: nextStatus,
        updated_at: nowIso,
    }
    if (newBalance === 0) {
        loanUpdate[isReceivable ? 'collected_at' : 'paid_at'] = nowIso
    }

    const { data: updated, error: updateError } = await supabase
        .from(table)
        .update(loanUpdate)
        .eq('id', id)
        .eq('user_id', userId)
        .select(`
            *,
            payments:loan_payments(*),
            loan_installments(*)
        `)
        .single()

    if (updateError) throw updateError

    return { data: mapLoanAccountRow(updated, kind) }
}

export async function deleteLoanAccount(
    supabase: SupabaseClient,
    userId: string,
    kind: LoanKind,
    id: string
) {
    const isReceivable = kind === 'RECEIVABLE'
    const table = getTableName(kind)
    const fkCol = getForeignKeyColumn(kind)

    // 1. Fetch loan owned by user
    const { data: loan, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

    if (fetchError || !loan) {
        return { error: { status: 404, body: { error: 'Préstamo no encontrado' } } }
    }

    // 2. Collect ALL linked transaction IDs (initial + payment principal + payment interest)
    const txIdsToDelete = new Set<string>()
    if (loan.linked_transaction_id) txIdsToDelete.add(loan.linked_transaction_id)

    const { data: payments } = await supabase
        .from('loan_payments')
        .select('id, transaction_id, metadata')
        .eq(fkCol, id)
        .eq('user_id', userId)

    for (const p of payments || []) {
        if (p.transaction_id) txIdsToDelete.add(p.transaction_id)
        const meta = p.metadata as Record<string, any> | null
        if (meta?.principalTransactionId) txIdsToDelete.add(meta.principalTransactionId)
        if (meta?.interestTransactionId) txIdsToDelete.add(meta.interestTransactionId)
    }

    // 3. Revert balance PER ACCOUNT based on each actual transaction
    if (txIdsToDelete.size > 0) {
        const txIdList = Array.from(txIdsToDelete)
        const { data: txs } = await supabase
            .from('transactions')
            .select('id, account_id, amount, transaction_type')
            .in('id', txIdList)
            .eq('user_id', userId)

        // Aggregate net delta per account_id
        const accountDeltas: Record<string, number> = {}
        for (const tx of txs || []) {
            if (!tx.account_id) continue
            const amt = Number(tx.amount || 0)
            // Reverting EXPENSE adds money back (+amt); reverting INCOME deducts money (-amt)
            const delta = tx.transaction_type === 'EXPENSE' ? amt : -amt
            accountDeltas[tx.account_id] = (accountDeltas[tx.account_id] || 0) + delta
        }

        for (const [accountId, delta] of Object.entries(accountDeltas)) {
            if (Math.abs(delta) < 0.001) continue
            const { data: acc } = await supabase
                .from('accounts')
                .select('current_balance')
                .eq('id', accountId)
                .eq('user_id', userId)
                .single()

            if (acc) {
                const reverted = Math.round((Number(acc.current_balance || 0) + delta) * 100) / 100
                await supabase
                    .from('accounts')
                    .update({ current_balance: reverted })
                    .eq('id', accountId)
                    .eq('user_id', userId)
            }
        }

        // Delete all linked transactions
        await supabase
            .from('transactions')
            .delete()
            .in('id', txIdList)
            .eq('user_id', userId)
    }

    // 4. Clean up installments & payments explicitly before deleting loan
    await supabase.from('loan_installments').delete().eq(fkCol, id)
    await supabase.from('loan_payments').delete().eq(fkCol, id).eq('user_id', userId)

    const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

    if (deleteError) throw deleteError

    return { data: { success: true, kind: isReceivable ? 'RECEIVABLE' : 'PAYABLE' } }
}
