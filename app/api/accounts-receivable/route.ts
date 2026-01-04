import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReceivableSchema = z.object({
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

function mapAccountReceivable(row: any): any {
    if (!row) return null

    // Self-Healing Status Logic:
    // Determine which installments MUST be paid based on current Outstanding Balance.
    // This fixes stale "PENDING" statuses if the DB didn't update correctly.
    const totalPrincipalPaid = Number(row.original_amount) - Number(row.outstanding_balance)
    let accumulatedPrincipalPaid = 0

    const installments = (row.loan_installments || [])
        .sort((a: any, b: any) => a.installment_number - b.installment_number)
        .map((i: any) => {
            const principal = Number(i.principal_amount)
            let status = i.status

            // Virtual Status Override
            // If we have covered this installment in the total paid, force it to 'PAID'
            if (accumulatedPrincipalPaid + (principal - 0.05) <= totalPrincipalPaid) {
                status = 'PAID'
            }

            accumulatedPrincipalPaid += principal

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
        installments: installments, // Use the self-healed list
    }
}

// ============================================
// GET - List all accounts receivable
// ============================================

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // Filter by status

        let query = supabase
            .from('accounts_receivable')
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
            console.error('[ACCOUNTS_RECEIVABLE_GET] Query Error:', error)
            throw error
        }


        // Enrich with computed fields
        const enriched = (data || []).map((receivable: any) => {
            const totalPaid = receivable.original_amount - receivable.outstanding_balance
            const percentPaid = (totalPaid / receivable.original_amount) * 100

            let daysOverdue = 0
            if (receivable.due_date && receivable.outstanding_balance > 0) {
                const dueDate = new Date(receivable.due_date)
                const today = new Date()
                const diffTime = today.getTime() - dueDate.getTime()
                daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (daysOverdue < 0) daysOverdue = 0
            }

            return {
                ...receivable,
                totalPaid,
                percentPaid,
                daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            }
        })

        return NextResponse.json(enriched.map(mapAccountReceivable))
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_GET] Error:', error)
        return NextResponse.json(
            { error: 'Error al obtener cuentas por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// POST - Create new account receivable
// ============================================

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = createReceivableSchema.parse(body)

        // VALIDATION: Check balance before lending money
        const { data: accountData } = await supabase
            .from('accounts')
            .select('current_balance, name')
            .eq('id', validated.accountId)
            .single()

        if (!accountData) {
            return NextResponse.json(
                { error: 'Cuenta no encontrada' },
                { status: 404 }
            )
        }

        const currentBalance = Number(accountData.current_balance)
        const requestedAmount = validated.amount

        if (currentBalance < requestedAmount) {
            const shortage = requestedAmount - currentBalance
            return NextResponse.json(
                {
                    error: 'Saldo insuficiente',
                    details: `La cuenta "${accountData.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas prestar ${requestedAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${validated.currencyCode}`,
                    balanceInfo: {
                        currentBalance,
                        requestedAmount,
                        shortage
                    }
                },
                { status: 400 }
            )
        }

        // 1.0 Robust Categorization: Find or Create 'Préstamos' Category
        let categoryId = null
        const categoryName = 'Préstamos'

        // Find if user already has an expense category named 'Préstamos'
        const { data: existingCat } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', categoryName)
            .single()

        if (existingCat) {
            categoryId = existingCat.id
        } else {
            // Create it if it doesn't exist
            const { data: newCat } = await supabase
                .from('expense_categories')
                .insert({
                    user_id: user.id,
                    name: categoryName,
                    icon: 'landmark',
                    color: '#10b981',
                    budget_rule: 'SAVINGS',
                    is_system: false,
                    is_active: true
                })
                .select('id')
                .single()
            if (newCat) categoryId = newCat.id
        }

        // 1. Create cash outflow transaction (money leaving your account)
        const transactionPayload = {
            user_id: user.id,
            transaction_type: 'EXPENSE',
            account_id: validated.accountId,
            amount: validated.amount,
            currency_code: validated.currencyCode,
            transaction_date: new Date().toISOString(),
            description: `Préstamo otorgado a ${validated.contactName}`,
            expense_category_id: categoryId, // CATEGORIZED
            metadata: {
                isLoanMovement: true,
                hideFromList: false, // Show it now that it has a category
                loanType: 'LENT',
            },
        }

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert(transactionPayload)
            .select()
            .single()

        if (txError) throw txError

        // 1.1 Update Account Balance (Financial Outflow)
        const newBalance = currentBalance - validated.amount
        await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', validated.accountId)

        // 2. Create account receivable record
        const receivablePayload = {
            user_id: user.id,
            contact_name: validated.contactName,
            contact_email: validated.contactEmail || null,
            contact_phone: validated.contactPhone || null,
            original_amount: validated.amount,
            outstanding_balance: validated.amount, // Initially full amount
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


        const { data: receivable, error: recError } = await supabase
            .from('accounts_receivable')
            .insert(receivablePayload)
            .select()
            .single()

        if (recError) {
            console.error('[ACCOUNTS_RECEIVABLE_POST] Insert Error:', recError)
            throw recError
        }

        // 3. Generate Installments (Automatic Payment Scheduling)
        // Adapted from expert loans logic to work with unified schema
        const totalInstallments = validated.totalInstallments || 1
        if (totalInstallments > 0) {
            const installments = []
            const principalPerInstallment = validated.amount / totalInstallments
            // Simple interest calculation for the whole period default
            // Future improvement: Support compound interest or amortization formulas
            const interestRate = validated.interestRate || 0
            const totalInterest = (validated.amount * (interestRate / 100))
            const interestPerInstallment = totalInterest / totalInstallments

            // Determine start date (loan date or today)
            let currentDate = new Date(validated.dueDate ? validated.dueDate : new Date())
            // If dueDate is set, that's the first payment. If not, maybe 1 month from now?
            // "dueDate" in form usually means "First Payment Date" or "Maturity"?
            // Let's assume validated.dueDate is the first installment date if provided,
            // otherwise start 1 period from now.
            if (!validated.dueDate) {
                currentDate = new Date()
                if (validated.paymentFrequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1)
                else if (validated.paymentFrequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7)
                else if (validated.paymentFrequency === 'BIWEEKLY') currentDate.setDate(currentDate.getDate() + 14)
            }


            for (let i = 1; i <= totalInstallments; i++) {
                installments.push({
                    account_receivable_id: receivable.id, // Linked to this AR
                    installment_number: i,
                    due_date: currentDate.toISOString(),
                    principal_amount: principalPerInstallment,
                    interest_amount: interestPerInstallment,
                    status: 'PENDING'
                })

                // Advance date for next installment
                if (validated.paymentFrequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1)
                else if (validated.paymentFrequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7)
                else if (validated.paymentFrequency === 'BIWEEKLY') currentDate.setDate(currentDate.getDate() + 14)
            }

            const { error: instError } = await supabase.from('loan_installments').insert(installments)
            if (instError) console.error('[ACCOUNTS_RECEIVABLE_POST] Error creating installments:', instError)
        }



        return NextResponse.json(mapAccountReceivable(receivable), { status: 201 })
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_POST] Error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Error al crear cuenta por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// DELETE - Delete account receivable and revert balance
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

        // 1. Get the loan details to know amounts and linked transaction
        const { data: loan, error: fetchError } = await supabase
            .from('accounts_receivable')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !loan) {
            return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
        }

        // 2. Revert Account Balance
        // For Receivable: We LENT money (Expense). To revert, we must ADD back the outstanding balance? 
        // OR the original amount? If we delete the loan, it's as if it never happened.
        // If it never happened, we should refund the ORIGINAL amount to the account.
        // BUT if payments were made, those payments added money back.
        // So: Current Balance = Balance + Original Amount (Refund loan) - Total Paid (Refund payments)

        // Simpler approach:
        // 1. Refund the initial outflow (Original Amount) -> Balance += Original Amount
        // 2. Revert any payments made (Inflows from payments) -> Balance -= Payments Amount

        // Let's get the account
        const { data: account } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', loan.account_id) // Assuming account_id is stored on loan? Or we use transaction.
        // Wait, accounts_receivable table doesn't seem to store account_id directly in the visible schema above?
        // Let's check the POST: It uses `validated.accountId` to create transaction, but does it save to accounts_receivable?
        // Checking POST payload... `metadata`? No.
        // It seems `accounts_receivable` might NOT have `account_id` column?
        // `linked_transaction_id` points to the transaction. The transaction has `account_id`.

        // Fetch linked transaction to get account_id
        if (loan.linked_transaction_id) {
            const { data: transaction } = await supabase
                .from('transactions')
                .select('account_id')
                .eq('id', loan.linked_transaction_id)
                .single()

            if (transaction && transaction.account_id) {
                const { data: acc } = await supabase.from('accounts').select('current_balance').eq('id', transaction.account_id).single()

                if (acc) {
                    // Calculate manual adjustment
                    // We need to fetch all payments for this loan to reverse them too
                    const { data: payments } = await supabase
                        .from('loan_payments')
                        .select('amount')
                        .eq('account_receivable_id', id)

                    const totalPaidBack = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

                    // Logic:
                    // Loan Creation: Balance - 1000
                    // Payment 1: Balance + 200
                    // Current Net Impact: -800
                    // To Undo: Balance + 800 (which is Original - Paid)

                    const amountToRefund = Number(loan.original_amount) - totalPaidBack
                    const newBalance = Number(acc.current_balance) + amountToRefund

                    await supabase
                        .from('accounts')
                        .update({ current_balance: newBalance })
                        .eq('id', transaction.account_id)
                }
            }
        }

        // 3. Delete the Linked Transaction (The initial Expense)
        if (loan.linked_transaction_id) {
            await supabase.from('transactions').delete().eq('id', loan.linked_transaction_id)
        }

        // 4. Delete the Loan Payments (and their linked transactions if any)
        // Note: loan_payments might have linked_transaction_id too. Ideally we delete those txs too.
        // We rely on CASCADE if configured, but let's be safe.
        // Fetch payments with tx ids
        const { data: paymentsToDelete } = await supabase
            .from('loan_payments')
            .select('transaction_id')
            .eq('account_receivable_id', id)

        if (paymentsToDelete && paymentsToDelete.length > 0) {
            const txIds = paymentsToDelete.map(p => p.transaction_id).filter(Boolean)
            if (txIds.length > 0) {
                await supabase.from('transactions').delete().in('id', txIds)
            }
        }

        // 5. Delete the Loan Record (Waterfall delete should handle installments/payments if FK set properly)
        const { error: deleteError } = await supabase
            .from('accounts_receivable')
            .delete()
            .eq('id', id)

        if (deleteError) throw deleteError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_DELETE] Error:', error)
        return NextResponse.json(
            { error: 'Error al eliminar el préstamo', details: error.message },
            { status: 500 }
        )
    }
}


// ============================================
// PATCH - Update account receivable (partial payment)
// ============================================

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
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

            // Get current receivable
            const { data: receivable, error: fetchError } = await supabase
                .from('accounts_receivable')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (fetchError || !receivable) {
                return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
            }

            // 1. Expert Accounting: Split between Principal and Interest
            const principalAmount = validated.principalAmount ?? validated.paymentAmount
            const interestAmount = validated.interestAmount ?? 0

            // VALIDATION: Principal component cannot exceed outstanding principal balance
            // But total payment CAN exceed it (if it includes interest)
            if (principalAmount > (receivable.outstanding_balance + 0.05)) { // Small buffer for rounding
                return NextResponse.json(
                    { error: 'El abono a capital excede el saldo pendiente' },
                    { status: 400 }
                )
            }

            // 1.1 Find/Create Interest Category
            let interestCategoryId = null
            const { data: intCat } = await supabase
                .from('income_categories')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', 'Ingresos por Intereses')
                .single()

            if (intCat) {
                interestCategoryId = intCat.id
            } else {
                const { data: newCat } = await supabase
                    .from('income_categories')
                    .insert({
                        user_id: user.id,
                        name: 'Ingresos por Intereses',
                        icon: 'trending-up',
                        color: '#10b981',
                        is_system: false,
                        is_active: true
                    })
                    .select('id')
                    .single()
                if (newCat) interestCategoryId = newCat.id
            }

            // 1.1b Find/Create 'Préstamos' Income Category for Principal Recovery
            let principalCategoryId = null
            const { data: princCat } = await supabase
                .from('income_categories')
                .select('id')
                .eq('user_id', user.id)
                .ilike('name', 'Préstamos')
                .single()

            if (princCat) {
                principalCategoryId = princCat.id
            } else {
                const { data: newPCat } = await supabase
                    .from('income_categories')
                    .insert({
                        user_id: user.id,
                        name: 'Préstamos',
                        icon: 'landmark',
                        color: '#10b981',
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

            // Transaction A: Principal (Capital Recovery)
            if (principalAmount > 0) {
                const principalPayload = {
                    user_id: user.id,
                    transaction_type: 'INCOME',
                    account_id: validated.accountId,
                    amount: principalAmount,
                    currency_code: receivable.currency_code,
                    transaction_date: new Date().toISOString(),
                    description: `Cobro capital: ${receivable.contact_name}`,
                    income_category_id: principalCategoryId, // CATEGORIZED (Revenue swap)
                    metadata: {
                        isLoanCollection: true,
                        isPrincipal: true,
                        accountReceivableId: id,
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

            // Transaction B: Interest (Revenue)
            if (interestAmount > 0) {
                const interestPayload = {
                    user_id: user.id,
                    transaction_type: 'INCOME',
                    account_id: validated.accountId,
                    amount: interestAmount,
                    currency_code: receivable.currency_code,
                    transaction_date: new Date().toISOString(),
                    description: `Interés ganado: ${receivable.contact_name}`,
                    income_category_id: interestCategoryId, // Counts as Revenue
                    metadata: {
                        isLoanCollection: true,
                        isInterest: true,
                        accountReceivableId: id,
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

            // 1.3 Update Account Balance (Financial Inflow)
            const { data: account } = await supabase
                .from('accounts')
                .select('current_balance')
                .eq('id', validated.accountId)
                .single()

            if (account) {
                const updatedBalance = Number(account.current_balance) + validated.paymentAmount
                await supabase
                    .from('accounts')
                    .update({ current_balance: updatedBalance })
                    .eq('id', validated.accountId)
            }

            // 2. Record payment with split details
            const paymentPayload = {
                user_id: user.id,
                account_receivable_id: id,
                amount: validated.paymentAmount,
                principal_amount: principalAmount,
                interest_amount: interestAmount,
                currency_code: receivable.currency_code,
                transaction_id: principalTransactionId || interestTransactionId, // Link to main tx
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

            // 2.1 Update Installment Statuses (Waterfall Method)
            // We apply the PRINCIPAL payment to the oldest pending installments
            let remainingPrincipalPayment = principalAmount

            const { data: installments } = await supabase
                .from('loan_installments')
                .select('*')
                .eq('account_receivable_id', id)
                .order('installment_number', { ascending: true })

            if (installments) {
                for (const inst of installments) {
                    if (remainingPrincipalPayment <= 0.01) break // Done distributing
                    if (inst.status === 'PAID') continue

                    // How much does this installment owe?
                    // Simplified: We assume installments match principal. 
                    // Use total_amount or principal_amount depending on if interest is capitalized.
                    // Here we focus on Principal reduction.

                    const openAmount = Number(inst.principal_amount) // Assuming simple tracking

                    if (remainingPrincipalPayment >= (openAmount - 0.05)) {
                        // Fully cover this installment
                        await supabase
                            .from('loan_installments')
                            .update({ status: 'PAID', paid_at: new Date().toISOString() })
                            .eq('id', inst.id)

                        remainingPrincipalPayment -= openAmount
                    } else {
                        // Partial cover (Optional: mark as PARTIAL)
                        // For now, we prefer to keep it simple. Only mark PAID if fully paid.
                        // Or we can update a 'paid_amount' column if it existed.
                        // Let's just consume the amount.
                        remainingPrincipalPayment = 0
                    }
                }
            }

            // 3. Update outstanding balance (Only reduce by Principal)
            const newBalance = receivable.outstanding_balance - principalAmount

            const { data: updated, error: updateError } = await supabase
                .from('accounts_receivable')
                .update({ outstanding_balance: newBalance })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            return NextResponse.json(mapAccountReceivable(updated))
        }

        // Regular update (notes, contact info, etc.)
        const { data, error } = await supabase
            .from('accounts_receivable')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(mapAccountReceivable(data))
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_PATCH] Error:', error)

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
