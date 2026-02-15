export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPayableSchema = z.object({
    contactName: z.string().min(1, 'El nombre del contacto es requerido'),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    amount: z.number().positive('El monto debe ser positivo'),
    currencyCode: z.string().length(3),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    interestRate: z.number().min(0).max(100).optional(),
    accountId: z.string().uuid('Cuenta inválida'),
    // Expert Loan Fields
    interestType: z.enum(['SIMPLE', 'COMPOUND']).default('SIMPLE'),
    paymentFrequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'SINGLE']).default('MONTHLY'),
    totalInstallments: z.number().int().positive().default(1),
})

const updateBalanceSchema = z.object({
    paymentAmount: z.number().positive('El monto debe ser positivo'),
    principalAmount: z.number().min(0).optional(),
    interestAmount: z.number().min(0).optional(),
    accountId: z.string().uuid(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER']).optional(),
    notes: z.string().optional(),
})

// ============================================
// MAPPERS
// ============================================

function mapAccountPayable(row: any): any {
    if (!row) return null

    // Self-Healing Status Logic:
    // Enhanced precision: Use exact rounding and a smaller epsilon (0.001).
    const totalPrincipalPaid = Math.round((Number(row.original_amount) - Number(row.outstanding_balance)) * 100) / 100
    let accumulatedPrincipalPaid = 0

    const installments = (row.loan_installments || [])
        .sort((a: any, b: any) => a.installment_number - b.installment_number)
        .map((i: any) => {
            const principal = Number(i.principal_amount)
            let status = i.status

            if (accumulatedPrincipalPaid + (principal - 0.001) <= totalPrincipalPaid) {
                status = 'PAID'
            }

            accumulatedPrincipalPaid = Math.round((accumulatedPrincipalPaid + principal) * 100) / 100

            return {
                id: i.id,
                installmentNumber: i.installment_number,
                dueDate: i.due_date,
                principalAmount: principal,
                interestAmount: Number(i.interest_amount),
                totalAmount: Number(i.total_amount),
                status: status,
                paidAt: i.paid_at,
            }
        })

    return {
        id: row.id,
        userId: row.user_id,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        originalAmount: Number(row.original_amount),
        outstandingBalance: Number(row.outstanding_balance),
        currencyCode: row.currency_code,
        status: row.status,
        loanDate: row.created_at,
        dueDate: row.due_date,
        notes: row.notes,
        interestRate: Number(row.interest_rate || 0),
        linkedTransactionId: row.linked_transaction_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payments: (row.payments || []).map((p: any) => ({
            id: p.id,
            amount: Number(p.amount),
            currencyCode: p.currency_code,
            paymentDate: p.payment_date,
            notes: p.notes,
            paymentMethod: p.payment_method,
        })),
        totalPaid: Number(row.totalPaid || 0),
        percentPaid: Number(row.percentPaid || 0),
        daysOverdue: row.daysOverdue,
        // Expert Fields Mapping
        interestType: row.interest_type,
        paymentFrequency: row.payment_frequency,
        totalInstallments: row.total_installments,
        startDate: row.start_date,
        installments: installments,
    }
}

// ============================================
// GET - List all accounts payable
// ============================================

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        let query = supabase
            .from('accounts_payable')
            .select(`
                *,
                payments:loan_payments(*),
                loan_installments(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (status && status !== 'ALL') {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            console.error('[ACCOUNTS_PAYABLE_GET] Query Error:', error)
            throw error
        }


        // Enrich with computed fields
        const enriched = (data || []).map((payable: any) => {
            const totalPaid = payable.original_amount - payable.outstanding_balance
            const percentPaid = (totalPaid / payable.original_amount) * 100

            let daysOverdue = 0
            if (payable.due_date && payable.outstanding_balance > 0) {
                const dueDate = new Date(payable.due_date)
                const today = new Date()
                const diffTime = today.getTime() - dueDate.getTime()
                daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (daysOverdue < 0) daysOverdue = 0
            }

            return {
                ...payable,
                totalPaid,
                percentPaid,
                daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            }
        })

        return NextResponse.json(enriched.map(mapAccountPayable))
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ACCOUNTS_PAYABLE_GET] Error:', error)
        return NextResponse.json(
            { error: 'Error al obtener cuentas por pagar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// POST - Create new account payable
// ============================================

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = createPayableSchema.parse(body)

        // 1.0 Robust Categorization: Find or Create 'Préstamos' Income Category
        let categoryId = null
        const categoryName = 'Préstamos'

        const { data: existingCat } = await supabase
            .from('income_categories')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', categoryName)
            .single()

        if (existingCat) {
            categoryId = existingCat.id
        } else {
            const { data: newCat } = await supabase
                .from('income_categories')
                .insert({
                    user_id: user.id,
                    name: categoryName,
                    icon: 'landmark',
                    color: '#10b981',
                    is_system: false,
                    is_active: true
                })
                .select('id')
                .single()
            if (newCat) categoryId = newCat.id
        }

        // 1. Create cash inflow transaction (money entering your account as debt)
        const transactionPayload = {
            user_id: user.id,
            transaction_type: 'INCOME',
            account_id: validated.accountId,
            amount: validated.amount,
            currency_code: validated.currencyCode,
            transaction_date: new Date().toISOString(),
            description: `Préstamo recibido de ${validated.contactName}`,
            income_category_id: categoryId, // CATEGORIZED
            metadata: {
                isLoanMovement: true,
                hideFromList: false, // Show it now
                loanType: 'BORROWED',
            },
        }

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert(transactionPayload)
            .select()
            .single()

        if (txError) throw txError

        // 1.1 Update Account Balance (Financial Inflow)
        const { data: account } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', validated.accountId)
            .single()

        if (account) {
            const newBalance = Number(account.current_balance) + validated.amount
            await supabase
                .from('accounts')
                .update({ current_balance: newBalance })
                .eq('id', validated.accountId)
        }

        // 2. Create account payable record
        const payablePayload = {
            user_id: user.id,
            contact_name: validated.contactName,
            contact_email: validated.contactEmail || null,
            contact_phone: validated.contactPhone || null,
            original_amount: validated.amount,
            outstanding_balance: validated.amount,
            currency_code: validated.currencyCode,
            due_date: validated.dueDate || null,
            notes: validated.notes || null,
            interest_rate: validated.interestRate || 0,
            linked_transaction_id: transaction.id,
            metadata: {},
            // Expert Fields
            interest_type: validated.interestType,
            payment_frequency: validated.paymentFrequency,
            total_installments: validated.totalInstallments,
            start_date: new Date().toISOString()
        }


        const { data: payable, error: payError } = await supabase
            .from('accounts_payable')
            .insert(payablePayload)
            .select()
            .single()

        if (payError) {
            console.error('[ACCOUNTS_PAYABLE_POST] Insert Error:', payError)
            throw payError
        }

        // 3. Generate Installments (Automatic Payment Scheduling)
        // Adapted from expert loans logic with 2-decimal rounding and remainder adjustment
        const totalInstallments = validated.totalInstallments || 1
        if (totalInstallments > 0) {
            const installments = []
            // Use 2-decimal rounded base values
            const principalPerInstallment = Math.round((validated.amount / totalInstallments) * 100) / 100
            const interestRate = validated.interestRate || 0
            const totalInterest = Math.round((validated.amount * (interestRate / 100)) * 100) / 100
            const interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100

            let currentDate = new Date(validated.dueDate ? validated.dueDate : new Date())
            if (!validated.dueDate) {
                currentDate = new Date()
                if (validated.paymentFrequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1)
                else if (validated.paymentFrequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7)
                else if (validated.paymentFrequency === 'BIWEEKLY') currentDate.setDate(currentDate.getDate() + 14)
            }

            for (let i = 1; i <= totalInstallments; i++) {
                const isLast = i === totalInstallments
                const instPrincipal = isLast
                    ? Math.round((validated.amount - (principalPerInstallment * (totalInstallments - 1))) * 100) / 100
                    : principalPerInstallment
                const instInterest = isLast
                    ? Math.round((totalInterest - (interestPerInstallment * (totalInstallments - 1))) * 100) / 100
                    : interestPerInstallment

                installments.push({
                    account_payable_id: payable.id, // Linked to this AP
                    installment_number: i,
                    due_date: currentDate.toISOString(),
                    principal_amount: instPrincipal,
                    interest_amount: instInterest,
                    status: 'PENDING'
                })

                if (validated.paymentFrequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1)
                else if (validated.paymentFrequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7)
                else if (validated.paymentFrequency === 'BIWEEKLY') currentDate.setDate(currentDate.getDate() + 14)
            }

            const { error: instError } = await supabase.from('loan_installments').insert(installments)
            if (instError) console.error('[ACCOUNTS_PAYABLE_POST] Error creating installments:', instError)
        }



        return NextResponse.json(mapAccountPayable(payable), { status: 201 })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ACCOUNTS_PAYABLE_POST] Error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Error al crear cuenta por pagar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// DELETE - Delete account payable and revert balance
// ============================================

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        // 1. Get the loan details
        const { data: loan, error: fetchError } = await supabase
            .from('accounts_payable')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !loan) {
            return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
        }

        // 2. Revert Account Balance
        // For Payable: We BORROWED money (Income). Balance increased.
        // To revert: Balance -= Original Amount.
        // But we might have paid some back (Expense). Balance decreased.
        // To revert payments: Balance += Paid Amount.
        // Net Change: Balance -= (Original - Paid)

        if (loan.linked_transaction_id) {
            const { data: transaction } = await supabase
                .from('transactions')
                .select('account_id')
                .eq('id', loan.linked_transaction_id)
                .single()

            if (transaction && transaction.account_id) {
                const { data: acc } = await supabase.from('accounts').select('current_balance').eq('id', transaction.account_id).single()

                if (acc) {
                    const { data: payments } = await supabase
                        .from('loan_payments')
                        .select('amount')
                        .eq('account_payable_id', id)

                    const totalPaidBack = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0

                    const amountToDeduct = Number(loan.original_amount) - totalPaidBack
                    const newBalance = Number(acc.current_balance) - amountToDeduct

                    await supabase
                        .from('accounts')
                        .update({ current_balance: newBalance })
                        .eq('id', transaction.account_id)
                }
            }
        }

        // 3. Delete Linked Transaction (Initial Income)
        if (loan.linked_transaction_id) {
            await supabase.from('transactions').delete().eq('id', loan.linked_transaction_id)
        }

        // 4. Delete Payment Transactions
        const { data: paymentsToDelete } = await supabase
            .from('loan_payments')
            .select('transaction_id')
            .eq('account_payable_id', id)

        if (paymentsToDelete && paymentsToDelete.length > 0) {
            const txIds = paymentsToDelete.map((p: any) => p.transaction_id).filter(Boolean)
            if (txIds.length > 0) {
                await supabase.from('transactions').delete().in('id', txIds)
            }
        }

        // 5. Delete Loan Record
        const { error: deleteError } = await supabase
            .from('accounts_payable')
            .delete()
            .eq('id', id)

        if (deleteError) throw deleteError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ACCOUNTS_PAYABLE_DELETE] Error:', error)
        return NextResponse.json(
            { error: 'Error al eliminar el préstamo', details: error.message },
            { status: 500 }
        )
    }
}


// ============================================
// PATCH - Update account payable (partial payment)
// ============================================

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        // If it's a payment, handle specially
        if (updateData.paymentAmount) {
            const validated = updateBalanceSchema.parse(updateData)

            // Get current payable
            const { data: payable, error: fetchError } = await supabase
                .from('accounts_payable')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (fetchError || !payable) {
                return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
            }

            // 1. Expert Accounting: Split between Principal and Interest
            const principalAmount = validated.principalAmount ?? validated.paymentAmount
            const interestAmount = validated.interestAmount ?? 0

            // VALIDATION: Principal component cannot exceed outstanding principal balance
            // But total payment CAN exceed it (if it includes interest)
            if (principalAmount > (payable.outstanding_balance + 0.001)) { // Smaller epsilon
                return NextResponse.json(
                    { error: 'El abono a capital excede el saldo pendiente' },
                    { status: 400 }
                )
            }

            // VALIDATION: Check balance before paying debt
            const { data: account } = await supabase
                .from('accounts')
                .select('current_balance, name')
                .eq('id', validated.accountId)
                .single()

            if (account) {
                const currentBalance = Number(account.current_balance)
                const requestedAmount = validated.paymentAmount

                if (currentBalance < requestedAmount) {
                    const shortage = requestedAmount - currentBalance
                    return NextResponse.json(
                        {
                            error: 'Saldo insuficiente',
                            details: `La cuenta "${account.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas pagar ${requestedAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${payable.currency_code}`,
                            balanceInfo: {
                                currentBalance,
                                requestedAmount,
                                shortage
                            }
                        },
                        { status: 400 }
                    )
                }
            }

            // 1. Expert Accounting: Split between Principal and Interest
            // Variables already declared above for validation

            // 1.1 Find/Create Interest Expense Category
            let interestCategoryId = null
            const { data: intCat } = await supabase
                .from('expense_categories')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', 'Gastos por Intereses')
                .single()

            if (intCat) {
                interestCategoryId = intCat.id
            } else {
                const { data: newCat } = await supabase
                    .from('expense_categories')
                    .insert({
                        user_id: user.id,
                        name: 'Gastos por Intereses',
                        icon: 'trending-up',
                        color: '#ef4444',
                        budget_rule: 'NEEDS', // Interest is usually a commitment/need
                        is_system: false,
                        is_active: true
                    })
                    .select('id')
                    .single()
                if (newCat) interestCategoryId = newCat.id
            }

            // 1.1b Find/Create 'Préstamos' Expense Category for Principal Payment
            let principalCategoryId = null
            const { data: princCat } = await supabase
                .from('expense_categories')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', 'Préstamos')
                .single()

            if (princCat) {
                principalCategoryId = princCat.id
            } else {
                const { data: newPCat } = await supabase
                    .from('expense_categories')
                    .insert({
                        user_id: user.id,
                        name: 'Préstamos',
                        icon: 'landmark',
                        color: '#10b981',
                        budget_rule: 'SAVINGS',
                        is_system: false,
                        is_active: true
                    })
                    .select('id')
                    .single()
                if (newPCat) principalCategoryId = newPCat.id
            }

            // 1.2 Create transactions (Split Strategy)
            let principalTransactionId = null
            let interestTransactionId = null

            // Transaction A: Principal (Debt Reduction)
            if (principalAmount > 0) {
                const principalPayload = {
                    user_id: user.id,
                    transaction_type: 'EXPENSE',
                    account_id: validated.accountId,
                    amount: principalAmount,
                    currency_code: payable.currency_code,
                    transaction_date: new Date().toISOString(),
                    description: `Pago capital: ${payable.contact_name}`,
                    expense_category_id: principalCategoryId, // CATEGORIZED
                    metadata: {
                        isDebtPayment: true,
                        isPrincipal: true,
                        accountPayableId: id,
                    },
                }

                const { data: pTx, error: pError } = await supabase
                    .from('transactions')
                    .insert(principalPayload)
                    .select()
                    .single()

                if (pError) throw pError
                principalTransactionId = pTx.id
            }

            // Transaction B: Interest (Financial Expense)
            if (interestAmount > 0) {
                const interestPayload = {
                    user_id: user.id,
                    transaction_type: 'EXPENSE',
                    account_id: validated.accountId,
                    amount: interestAmount,
                    currency_code: payable.currency_code,
                    transaction_date: new Date().toISOString(),
                    description: `Interés pagado: ${payable.contact_name}`,
                    expense_category_id: interestCategoryId, // Valid Expense
                    metadata: {
                        isDebtPayment: true,
                        isInterest: true,
                        accountPayableId: id,
                    },
                }

                const { data: iTx, error: iError } = await supabase
                    .from('transactions')
                    .insert(interestPayload)
                    .select()
                    .single()

                if (iError) throw iError
                interestTransactionId = iTx.id
            }

            // 1.3 Update Account Balance (Financial Outflow) - use existing account data
            if (account) {
                const updatedBalance = Number(account.current_balance) - validated.paymentAmount
                await supabase
                    .from('accounts')
                    .update({ current_balance: updatedBalance })
                    .eq('id', validated.accountId)
            }

            // 2. Record payment with split details
            const paymentPayload = {
                user_id: user.id,
                account_payable_id: id,
                amount: validated.paymentAmount,
                principal_amount: principalAmount,
                interest_amount: interestAmount,
                currency_code: payable.currency_code,
                transaction_id: principalTransactionId || interestTransactionId,
                payment_method: validated.paymentMethod || 'TRANSFER',
                notes: validated.notes || null,
                metadata: {
                    principalTransactionId,
                    interestTransactionId
                }
            }

            const { error: paymentError } = await supabase
                .from('loan_payments')
                .insert(paymentPayload)

            if (paymentError) throw paymentError

            // 2.1 Update Installment Statuses (Waterfall Method - Payable)
            let remainingPrincipalPayment = principalAmount

            const { data: installments } = await supabase
                .from('loan_installments')
                .select('*')
                .eq('account_payable_id', id)
                .order('installment_number', { ascending: true })

            if (installments) {
                for (const inst of installments) {
                    if (remainingPrincipalPayment <= 0.001) break
                    if (inst.status === 'PAID') continue

                    const openAmount = Number(inst.principal_amount)

                    if (remainingPrincipalPayment >= (openAmount - 0.001)) {
                        await supabase
                            .from('loan_installments')
                            .update({ status: 'PAID', paid_at: new Date().toISOString() })
                            .eq('id', inst.id)

                        remainingPrincipalPayment -= openAmount
                    } else {
                        remainingPrincipalPayment = 0
                    }
                }
            }

            // 3. Update outstanding balance (Only reduce by Principal)
            // Ensure strict rounding and check for zero-balance
            let newBalance = Math.round((payable.outstanding_balance - principalAmount) * 100) / 100
            if (newBalance < 0.01) newBalance = 0 // Forced zero closure

            const { data: updated, error: updateError } = await supabase
                .from('accounts_payable')
                .update({ outstanding_balance: newBalance })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            return NextResponse.json(mapAccountPayable(updated))
        }

        // Regular update
        const { data, error } = await supabase
            .from('accounts_payable')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(mapAccountPayable(data))
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ACCOUNTS_PAYABLE_PATCH] Error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: `Error al actualizar cuenta: ${error.message}`, details: error.message },
            { status: 500 }
        )
    }
}
