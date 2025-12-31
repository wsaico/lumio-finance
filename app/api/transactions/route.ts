
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'
import { updateBudgetsForTransactions } from '@/lib/budget-manager'
import { mapTransaction } from '@/lib/mappers'
import { TransactionService } from '@/lib/services/transaction-service'

const transactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL']),
    accountId: z.string().uuid(),
    transferToAccountId: z.string().uuid().optional(),
    creditCardId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z.string().length(3),
    categoryId: z.string().uuid().optional().or(z.literal('')),
    subcategoryId: z.string().uuid().optional().or(z.literal('')),
    date: z.string().datetime(),
    description: z.string().optional(),
    notes: z.string().optional(),
    metadata: z.any().optional(),
    savingsGoalId: z.string().uuid().optional(),
    loanId: z.string().uuid().optional(),
    recurringRuleId: z.string().uuid().optional(),
    recurrence: z.string().optional(), // 'MONTHLY', 'WEEKLY'
    recurrenceEndDate: z.string().datetime().optional(),
    attachmentUrl: z.string().url().optional().or(z.literal('')),
})

// Helpers moved to TransactionService


// Mappers moved to @/lib/mappers

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const month = searchParams.get('month')
        const year = searchParams.get('year')
        const accountId = searchParams.get('accountId')
        const id = searchParams.get('id')
        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 20

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (id) {
            const { data: transaction, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                    expense_category:expense_categories(name, icon, color),
                    income_category:income_categories(name, icon, color),
                    subcategory:subcategories(name),
                    credit_card:credit_cards(name, last_four_digits, color)
                `)
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error) {
                console.error('[TRANSACTION_GET_SINGLE]', error)
                return new NextResponse(JSON.stringify({ error: error.message }), { status: 404 })
            }

            return NextResponse.json(mapTransaction(transaction))
        }

        let query = supabase
            .from('transactions')
            .select(`
                *,
                account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                expense_category:expense_categories(name, icon, color),
                income_category:income_categories(name, icon, color),
                subcategory:subcategories(name),
                credit_card:credit_cards(name, last_four_digits, color)
            `, { count: 'estimated' }) // Request count estimation
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })

        if (month && year) {
            const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString()
            const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString()
            query = query.gte('transaction_date', startDate).lte('transaction_date', endDate)
        }

        if (accountId) {
            query = query.eq('account_id', accountId)
        }

        // Apply Pagination
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data: transactions, error, count } = await query

        if (error) {
            console.error('[TRANSACTIONS_GET_SUPABASE]', error)
            return new NextResponse(JSON.stringify({ error: error.message, details: error }), { status: 500 })
        }

        return NextResponse.json({
            data: transactions.map(mapTransaction),
            meta: {
                page,
                limit,
                total: count,
                hasMore: count ? (from + limit) < count : false
            }
        })
    } catch (error: any) {
        console.error('[TRANSACTIONS_GET]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const validData = transactionSchema.parse(body)

        // VALIDATION: Reject loan creation attempts
        const metadata = validData.metadata || {}
        if (metadata.mode === 'LOAN_LENT' || metadata.mode === 'LOAN_BORROWED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Use el módulo de Préstamos para crear préstamos',
                    details: 'Los préstamos deben crearse exclusivamente desde /dashboard/loans para garantizar integridad de datos'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // VALIDATION: Block PETTY_CASH accounts - must use dedicated Petty Cash module
        const { data: selectedAccount } = await supabase
            .from('accounts')
            .select('account_type, name')
            .eq('id', validData.accountId)
            .single()

        if (selectedAccount?.account_type === 'PETTY_CASH') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Cuenta de Caja Chica no permitida',
                    details: `La cuenta "${selectedAccount.name}" es una Caja Chica. Los gastos de caja chica deben registrarse exclusivamente desde el módulo de Caja Chica (Fondo Fijo) para mantener el control interno, ciclo de liquidación y trazabilidad de comprobantes.`,
                    redirectTo: '/dashboard/petty-cash',
                    accountType: 'PETTY_CASH'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // VALIDATION: Check balance for EXPENSE and TRANSFER (balance decreases)
        if ((validData.type === 'EXPENSE' || validData.type === 'TRANSFER') && metadata.mode !== 'SCHEDULED') {
            const { data: account } = await supabase
                .from('accounts')
                .select('current_balance, name, account_type, credit_limit, used_balance')
                .eq('id', validData.accountId)
                .single()

            if (account) {
                const requestedAmount = validData.amount

                // Validar límites para cuentas de tipo CREDIT_CARD
                if (account.account_type === 'CREDIT_CARD') {
                    const creditLimit = Number(account.credit_limit || 0)
                    const usedBalance = Number(account.used_balance || 0)
                    const availableCredit = creditLimit - usedBalance

                    if (requestedAmount > availableCredit) {
                        const shortage = requestedAmount - availableCredit
                        return new NextResponse(
                            JSON.stringify({
                                error: 'Límite de crédito excedido',
                                details: `La tarjeta "${account.name}" tiene un crédito disponible de ${availableCredit.toFixed(2)} pero intentas usar ${requestedAmount.toFixed(2)}. Excedes el límite por ${shortage.toFixed(2)} ${validData.currency}`,
                                creditInfo: { creditLimit, usedBalance, availableCredit, requestedAmount, shortage }
                            }),
                            { status: 400, headers: { 'Content-Type': 'application/json' } }
                        )
                    }
                } else {
                    // Validar saldo para cuentas normales (ahorros, efectivo, etc.)
                    const currentBalance = Number(account.current_balance)
                    if (currentBalance < requestedAmount) {
                        const shortage = requestedAmount - currentBalance
                        return new NextResponse(
                            JSON.stringify({
                                error: 'Saldo insuficiente',
                                details: `La cuenta "${account.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas usar ${requestedAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${validData.currency}`,
                                balanceInfo: { currentBalance, requestedAmount, shortage }
                            }),
                            { status: 400, headers: { 'Content-Type': 'application/json' } }
                        )
                    }
                }
            }
        }

        // 1. Process Transaction via Service (handles Categories & Balances)
        const transaction = await TransactionService.processTransaction(supabase, {
            userId: user.id,
            type: validData.type,
            accountId: validData.accountId,
            amount: Number(validData.amount),
            currency: validData.currency,
            transactionDate: validData.date,
            description: validData.description,
            notes: validData.notes,
            metadata: metadata,
            categoryId: validData.categoryId,
            subcategoryId: validData.subcategoryId,
            transferToAccountId: validData.transferToAccountId,
            creditCardId: validData.creditCardId,
            savingsGoalId: validData.savingsGoalId,
            loanId: validData.loanId,
            recurringRuleId: validData.recurringRuleId,
            attachmentUrl: validData.attachmentUrl
        })

        // 2. Create Recurring Rule if Auto-Execute is enabled OR if it's a Manual Recurrence (for reminders)
        if ((metadata.mode === 'SUBSCRIPTION' || metadata.mode === 'RECURRING') && (metadata.scheduledType === 'AUTO' || metadata.scheduledType === 'MANUAL')) {
            await TransactionService.createRecurringRule(supabase, {
                userId: user.id,
                accountId: validData.accountId,
                transactionType: validData.type,
                amount: Number(validData.amount),
                frequency: validData.recurrence || 'MONTHLY', // Default to MONTHLY if not specified
                startDate: validData.date,
                endDate: validData.recurrenceEndDate, // Assuming this comes from validData
                description: validData.description,
                expenseCategoryId: validData.categoryId,
                incomeCategoryId: validData.categoryId,
                subcategoryId: validData.subcategoryId,
                executionMethod: metadata.scheduledType === 'AUTO' ? 'AUTO' : 'MANUAL',
                metadata: metadata
            })
        }

        // 3. Update Budgets (Background)
        updateBudgetsForTransactions(user.id).catch(console.error)

        return NextResponse.json(transaction)

    } catch (error: any) {
        console.error('[TRANSACTION_POST]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const { id, ...updates } = body
        if (!id) return new NextResponse('Transaction ID required', { status: 400 })

        // Process Update via Service (handles Reversal & Re-apply)
        const updatedTransaction = await TransactionService.updateTransaction(supabase, id, user.id, updates)

        // Update Budgets (Background)
        updateBudgetsForTransactions(user.id).catch(console.error)

        return NextResponse.json(updatedTransaction)
    } catch (error: any) {
        console.error('[TRANSACTION_PATCH]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const supabase = await createClient()
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !id) return new NextResponse('Unauthorized or ID missing', { status: 400 })

        // Process Deletion via Service (handles Reversal)
        await TransactionService.deleteTransaction(supabase, id, user.id)

        // Update Budgets (Background)
        updateBudgetsForTransactions(user.id).catch(console.error)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[TRANSACTION_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

