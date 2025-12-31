import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

const adjustBalanceSchema = z.object({
    newInitialBalance: z.number(),
    reason: z.string().optional(),
})

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const validData = adjustBalanceSchema.parse(body)

        // Get current account
        const { data: account, error: fetchError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (fetchError || !account) {
            console.error('[ADJUST_BALANCE_FETCH]', fetchError)
            return new NextResponse(JSON.stringify({
                error: 'Cuenta no encontrada'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const oldInitialBalance = Number(account.initial_balance)
        const newInitialBalance = validData.newInitialBalance
        const difference = newInitialBalance - oldInitialBalance

        // Get all transactions for this account to recalculate the current balance
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount, type, from_account_id, to_account_id')
            .or(`from_account_id.eq.${id},to_account_id.eq.${id}`)

        if (txError) {
            console.error('[ADJUST_BALANCE_TX_FETCH]', txError)
            return new NextResponse(JSON.stringify({
                error: 'Error al obtener transacciones',
                details: txError.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Calculate the net effect of all transactions
        let transactionsTotal = 0
        transactions?.forEach((tx: any) => {
            const amount = Number(tx.amount)

            if (tx.type === 'INCOME') {
                // Income always adds to the account
                transactionsTotal += amount
            } else if (tx.type === 'EXPENSE') {
                // Expense always subtracts from the account
                transactionsTotal -= amount
            } else if (tx.type === 'TRANSFER') {
                // Transfer: add if this is the destination, subtract if source
                if (tx.to_account_id === id) {
                    transactionsTotal += amount
                } else if (tx.from_account_id === id) {
                    transactionsTotal -= amount
                }
            }
        })

        // New current balance = new initial balance + all transactions
        const newCurrentBalance = newInitialBalance + transactionsTotal

        const { error: updateError } = await supabase
            .from('accounts')
            .update({
                initial_balance: newInitialBalance,
                current_balance: newCurrentBalance,
            })
            .eq('id', id)
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[ADJUST_BALANCE_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({
                error: 'Error al actualizar saldo',
                details: updateError.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Create adjustment transaction for audit trail if there's a difference
        let adjustmentTransaction = null
        if (difference !== 0) {
            // Get or create "Ajuste de Apertura" category
            const { data: adjustmentCategory } = await supabase
                .from('income_categories')
                .select('id')
                .eq('name', 'Ajuste de Apertura')
                .eq('user_id', user.id)
                .single()

            let categoryId = adjustmentCategory?.id

            // Create category if it doesn't exist
            if (!categoryId) {
                const { data: newCategory, error: categoryError } = await supabase
                    .from('income_categories')
                    .insert({
                        user_id: user.id,
                        name: 'Ajuste de Apertura',
                        icon: 'calculator',
                        color: '#f59e0b',
                        description: 'Ajustes contables de saldos iniciales'
                    })
                    .select('id')
                    .single()

                if (categoryError) {
                    console.error('[ADJUST_BALANCE_CATEGORY]', categoryError)
                } else {
                    categoryId = newCategory.id
                }
            }

            // Create the adjustment transaction
            const transactionType = difference > 0 ? 'INCOME' : 'EXPENSE'
            const { data: newTransaction, error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    account_id: id,
                    transaction_type: transactionType,
                    amount: Math.abs(difference),
                    transaction_date: new Date().toISOString(),
                    description: 'Ajuste de Saldo Inicial',
                    income_category_id: transactionType === 'INCOME' ? categoryId : null,
                    expense_category_id: transactionType === 'EXPENSE' ? categoryId : null,
                    metadata: {
                        isBalanceAdjustment: true,
                        oldInitialBalance: oldInitialBalance,
                        newInitialBalance: newInitialBalance,
                        difference: difference,
                        reason: validData.reason || 'Ajuste manual de saldo inicial'
                    }
                })
                .select()
                .single()

            if (txError) {
                console.error('[ADJUST_BALANCE_TX]', txError)
            } else {
                adjustmentTransaction = newTransaction
            }
        }

        // Fetch updated account
        const { data: updatedAccount, error: refetchError } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (refetchError) {
            console.error('[ADJUST_BALANCE_REFETCH]', refetchError)
            return new NextResponse('Error fetching updated account', { status: 500 })
        }

        // Map to frontend format
        const mappedAccount = {
            id: updatedAccount.id,
            userId: updatedAccount.user_id,
            name: updatedAccount.name,
            accountType: updatedAccount.account_type,
            currencyCode: updatedAccount.currency_code,
            initialBalance: updatedAccount.initial_balance,
            currentBalance: updatedAccount.current_balance,
            bankName: updatedAccount.bank_name,
            accountNumber: updatedAccount.account_number,
            customBankName: updatedAccount.custom_bank_name,
            excludeFromStats: updatedAccount.exclude_from_stats || false,
            archived: updatedAccount.archived || false,
            icon: updatedAccount.icon,
            color: updatedAccount.color,
            isActive: updatedAccount.is_active,
            includeInTotal: updatedAccount.include_in_total,
            sortOrder: updatedAccount.sort_order,
            createdAt: updatedAccount.created_at,
            updatedAt: updatedAccount.updated_at
        }

        return NextResponse.json({
            success: true,
            adjustment: {
                oldInitialBalance,
                newInitialBalance,
                difference,
                newCurrentBalance,
                transactionCreated: adjustmentTransaction !== null
            },
            account: mappedAccount,
            adjustmentTransaction: adjustmentTransaction ? {
                id: adjustmentTransaction.id,
                type: adjustmentTransaction.transaction_type,
                amount: adjustmentTransaction.amount,
                description: adjustmentTransaction.description
            } : null
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({
                error: 'Datos inválidos',
                details: error.issues
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }
        console.error('[ADJUST_BALANCE]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
