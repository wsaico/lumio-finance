
import { SupabaseClient } from '@supabase/supabase-js'
import { mapTransaction } from '../mappers'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/default-categories'

export interface ProcessTransactionParams {
    userId: string
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'SAVINGS_DEPOSIT' | 'SAVINGS_WITHDRAWAL'
    accountId: string
    amount: number
    currency: string
    transactionDate: string
    description?: string
    notes?: string
    metadata?: any
    categoryId?: string
    subcategoryId?: string
    transferToAccountId?: string
    creditCardId?: string
    savingsGoalId?: string
    loanId?: string
    recurringRuleId?: string
    attachmentUrl?: string
}

export class TransactionService {

    private static sanitizeUuid(id: any): string | null {
        if (!id || (typeof id === 'string' && id.trim() === "")) return null
        return id
    }

    public static async resolveCategory(supabase: SupabaseClient, table: string, id: string | undefined | null, userId: string, defaults: any[]) {
        if (!id) return null
        if (!id.match(/^[eisu]100/)) return id

        const def = defaults.find(d => d.id === id)
        if (!def) return null

        const { data: existing } = await supabase
            .from(table)
            .select('id')
            .eq('user_id', userId)
            .eq('name', def.name)
            .single()

        if (existing) return existing.id

        const { data: newCat, error } = await supabase
            .from(table)
            .insert({
                user_id: userId,
                name: def.name,
                icon: def.icon,
                color: def.color
            })
            .select('id')
            .single()

        if (error) return null
        return newCat.id
    }

    /**
     * Processes a new transaction including balance updates.
     */
    static async processTransaction(supabase: SupabaseClient, params: ProcessTransactionParams) {
        const { userId, type, accountId, amount, metadata = {} } = params

        // 1. Resolve Category IDs - Simple pass-through as we now use DB IDs only
        let expenseCategoryId: string | null = null
        let incomeCategoryId: string | null = null

        if (type === 'EXPENSE' && params.categoryId) {
            expenseCategoryId = params.categoryId
        } else if (type === 'INCOME' && params.categoryId) {
            incomeCategoryId = params.categoryId
        }

        // 2. Create Transaction Record
        const { data: newTransaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                transaction_type: type,
                account_id: accountId,
                transfer_to_account_id: this.sanitizeUuid(params.transferToAccountId),
                credit_card_id: this.sanitizeUuid(params.creditCardId),
                amount: amount,
                currency_code: params.currency,
                expense_category_id: this.sanitizeUuid(expenseCategoryId),
                income_category_id: this.sanitizeUuid(incomeCategoryId),
                subcategory_id: this.sanitizeUuid(params.subcategoryId),
                transaction_date: params.transactionDate,
                description: params.description,
                notes: params.notes,
                metadata: metadata,
                savings_goal_id: this.sanitizeUuid(params.savingsGoalId),
                loan_id: this.sanitizeUuid(params.loanId),
                recurring_rule_id: this.sanitizeUuid(params.recurringRuleId),
                attachment_url: params.attachmentUrl
            })
            .select(`
                *,
                account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                expense_category:expense_categories(name, icon, color),
                income_category:income_categories(name, icon, color),
                subcategory:subcategories(name),
                credit_card:credit_cards(name, last_four_digits, color)
            `)
            .single()

        if (txError) throw txError

        // Apply impact
        await this.applyTransactionImpact(supabase, newTransaction)

        return mapTransaction(newTransaction)
    }

    /**
     * Reverses the balance impact of a transaction.
     */
    static async reverseTransactionImpact(supabase: SupabaseClient, transaction: any) {
        const { amount, transaction_type, account_id, transfer_to_account_id, credit_card_id, metadata } = transaction
        const mode = metadata?.mode
        const loanStatus = metadata?.loanStatus

        if (mode === 'SCHEDULED' || loanStatus === 'PENDING') return

        // 1. Reverse Legacy Credit Card impact (table: credit_cards)
        if (credit_card_id) {
            const isPayment = metadata?.type === 'CREDIT_CARD_PAYMENT'
            const { data: card } = await supabase.from('credit_cards').select('used_balance').eq('id', credit_card_id).single()

            if (card) {
                let newUsedBalance = Number(card.used_balance)
                if (isPayment) newUsedBalance += amount
                else newUsedBalance = Math.max(0, newUsedBalance - amount)
                await supabase.from('credit_cards').update({ used_balance: newUsedBalance }).eq('id', credit_card_id)
            }
        }

        // 2. REVERSE ACCOUNT IMPACT -> HANDLED BY DB TRIGGER
        /*
        const { data: acc } = await supabase.from('accounts').select('current_balance, account_type, used_balance').eq('id', account_id).single()

        if (acc) {
            if (acc.account_type === 'CREDIT_CARD') {
                let newUsed = Number(acc.used_balance || 0)
                // En tarjetas, EXPENSE aumenta used_balance, INCOME lo disminuye. Reversa es lo opuesto.
                if (transaction_type === 'EXPENSE') newUsed = Math.max(0, newUsed - amount)
                else if (transaction_type === 'INCOME') newUsed += amount
                // Si es un TRANSFER hacia esta tarjeta (pago), en reverse quitamos el pago (aumenta used)
                else if (transaction_type === 'TRANSFER' && transfer_to_account_id === account_id) newUsed += amount

                await supabase.from('accounts').update({
                    used_balance: newUsed,
                    current_balance: -newUsed
                }).eq('id', account_id)
            }
            else {
                let newBal = Number(acc.current_balance)
                if (transaction_type === 'INCOME') newBal -= amount
                else if (transaction_type === 'EXPENSE' || (transaction_type === 'TRANSFER' && transfer_to_account_id)) newBal += amount

                await supabase.from('accounts').update({ current_balance: newBal }).eq('id', account_id)
            }
        }
        */

        // 3. REVERSE DESTINATION IMPACT -> HANDLED BY DB TRIGGER
        /*
        if (transaction_type === 'TRANSFER' && transfer_to_account_id) {
            const { data: dest } = await supabase.from('accounts').select('current_balance, account_type, used_balance').eq('id', transfer_to_account_id).single()
            if (dest) {
                if (dest.account_type === 'CREDIT_CARD') {
                    // Reversing payment to card (originally decreased used_balance, now we increase it)
                    const newUsed = Number(dest.used_balance || 0) + amount
                    await supabase.from('accounts').update({
                        used_balance: newUsed,
                        current_balance: -newUsed
                    }).eq('id', transfer_to_account_id)
                } else {
                    await supabase.from('accounts').update({ current_balance: Number(dest.current_balance) - amount }).eq('id', transfer_to_account_id)
                }
            }
        }
        */
    }

    /**
     * Deletes a transaction and reverses its impact.
     */
    static async deleteTransaction(supabase: SupabaseClient, transactionId: string, userId: string) {
        // 1. Get the transaction first to know what to reverse
        const { data: transaction, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single()

        if (fetchError || !transaction) throw new Error('Transaction not found or unauthorized')

        // 2. Reverse impact
        await this.reverseTransactionImpact(supabase, transaction)

        // 3. Delete record
        const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId)
            .eq('user_id', userId)

        if (deleteError) throw deleteError

        return { success: true }
    }

    /**
     * Updates an existing transaction by reversing old impact and applying new impact.
     */
    static async updateTransaction(supabase: SupabaseClient, transactionId: string, userId: string, updates: Partial<ProcessTransactionParams>) {
        // 1. Get old transaction
        const { data: oldTx, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single()

        if (fetchError || !oldTx) throw new Error('Transaction not found or unauthorized')

        // 2. Reverse old impact
        await this.reverseTransactionImpact(supabase, oldTx)

        // 3. Resolve Categories if updated
        const effectiveType = updates.type || oldTx.transaction_type

        // Simple pass-through using updates or fallback to old
        let expenseCategoryId = effectiveType === 'EXPENSE'
            ? (updates.categoryId ?? oldTx.expense_category_id)
            : oldTx.expense_category_id

        let incomeCategoryId = effectiveType === 'INCOME'
            ? (updates.categoryId ?? oldTx.income_category_id)
            : oldTx.income_category_id

        // 4. Update the transaction record
        const { data: updatedTx, error: updateError } = await supabase
            .from('transactions')
            .update({
                transaction_type: updates.type || oldTx.transaction_type,
                account_id: updates.accountId || oldTx.account_id,
                transfer_to_account_id: updates.transferToAccountId !== undefined ? this.sanitizeUuid(updates.transferToAccountId) : oldTx.transfer_to_account_id,
                credit_card_id: updates.creditCardId !== undefined ? this.sanitizeUuid(updates.creditCardId) : oldTx.credit_card_id,
                amount: updates.amount !== undefined ? updates.amount : oldTx.amount,
                currency_code: updates.currency || oldTx.currency_code,
                expense_category_id: this.sanitizeUuid(expenseCategoryId),
                income_category_id: this.sanitizeUuid(incomeCategoryId),
                subcategory_id: this.sanitizeUuid(updates.subcategoryId || oldTx.subcategory_id),
                transaction_date: updates.transactionDate || oldTx.transaction_date,
                description: updates.description !== undefined ? updates.description : oldTx.description,
                notes: updates.notes !== undefined ? updates.notes : oldTx.notes,
                metadata: { ...(oldTx.metadata || {}), ...(updates.metadata || {}) },
                savings_goal_id: updates.savingsGoalId !== undefined ? this.sanitizeUuid(updates.savingsGoalId) : oldTx.savings_goal_id,
                loan_id: updates.loanId !== undefined ? this.sanitizeUuid(updates.loanId) : oldTx.loan_id,
                recurring_rule_id: updates.recurringRuleId !== undefined ? this.sanitizeUuid(updates.recurringRuleId) : oldTx.recurring_rule_id,
                attachment_url: updates.attachmentUrl !== undefined ? updates.attachmentUrl : oldTx.attachment_url
            })
            .eq('id', transactionId)
            .select(`
                *,
                account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                expense_category:expense_categories(name, icon, color),
                income_category:income_categories(name, icon, color),
                subcategory:subcategories(name),
                credit_card:credit_cards(name, last_four_digits, color)
            `)
            .single()

        if (updateError) throw updateError

        // 5. Apply new impact (re-using part of processTransaction logic or similar)
        // For simplicity and to avoid duplication, we'll re-apply essentially what processTransaction does manually or we could refactor more.
        // Let's call another internal helper applyTransactionImpact.
        await this.applyTransactionImpact(supabase, updatedTx)

        return mapTransaction(updatedTx)
    }

    private static async applyTransactionImpact(supabase: SupabaseClient, transaction: any) {
        const { amount, transaction_type: type, account_id: accountId, transfer_to_account_id, credit_card_id, metadata } = transaction

        if (metadata?.mode === 'SCHEDULED' || metadata?.loanStatus === 'PENDING') return

        // 1. Legacy Credit Card impact (table: credit_cards)
        if (credit_card_id) {
            const isPayment = metadata?.type === 'CREDIT_CARD_PAYMENT'
            const { data: card } = await supabase.from('credit_cards').select('used_balance').eq('id', credit_card_id).single()

            if (card) {
                let newUsedBalance = Number(card.used_balance)
                if (isPayment) newUsedBalance = Math.max(0, newUsedBalance - amount)
                else newUsedBalance += amount
                await supabase.from('credit_cards').update({ used_balance: newUsedBalance }).eq('id', credit_card_id)
            }
        }

        // 2. PRIMARY ACCOUNT IMPACT -> HANDLED BY DB TRIGGER (update_account_balance_trigger)
        /*
        const { data: acc } = await supabase.from('accounts').select('current_balance, account_type, used_balance').eq('id', accountId).single()

        if (acc) {
            if (acc.account_type === 'CREDIT_CARD') {
                let newUsed = Number(acc.used_balance || 0)
                if (type === 'EXPENSE') newUsed += amount
                else if (type === 'INCOME') newUsed = Math.max(0, newUsed - amount)
                // Si es un TRANSFER realizado DESDE la tarjeta (avance de efectivo, etc.)
                else if (type === 'TRANSFER' && transfer_to_account_id) newUsed += amount

                await supabase.from('accounts').update({
                    used_balance: newUsed,
                    current_balance: -newUsed
                }).eq('id', accountId)
            }
            else {
                let newBal = Number(acc.current_balance)
                if (type === 'INCOME') newBal += amount
                else if (type === 'EXPENSE' || (type === 'TRANSFER' && transfer_to_account_id)) newBal -= amount

                await supabase.from('accounts').update({ current_balance: newBal }).eq('id', accountId)
            }
        }
        */

        // 3. TRANSFER DESTINATION IMPACT -> HANDLED BY DB TRIGGER
        /*
        if (type === 'TRANSFER' && transfer_to_account_id) {
            const { data: dest } = await supabase.from('accounts').select('current_balance, account_type, used_balance').eq('id', transfer_to_account_id).single()
            if (dest) {
                if (dest.account_type === 'CREDIT_CARD') {
                    // Payment TO a credit card account
                    const newUsed = Math.max(0, Number(dest.used_balance || 0) - amount)
                    await supabase.from('accounts').update({
                        used_balance: newUsed,
                        current_balance: -newUsed
                    }).eq('id', transfer_to_account_id)
                } else {
                    await supabase.from('accounts').update({ current_balance: Number(dest.current_balance) + amount }).eq('id', transfer_to_account_id)
                }
            }
        }
        */
    }

    /**
     * Creates a Recurring Rule for auto-execution.
     */
    static async createRecurringRule(supabase: SupabaseClient, params: {
        userId: string,
        accountId: string,
        transactionType: string,
        amount: number,
        frequency: string, // MONTHLY, WEEKLY, DAILY
        startDate: string,
        endDate?: string,
        description?: string,
        expenseCategoryId?: string | null,
        incomeCategoryId?: string | null,
        subcategoryId?: string | null,
        executionMethod?: 'AUTO' | 'MANUAL',
        metadata?: any
    }) {
        const { data, error } = await supabase
            .from('recurring_rules')
            .insert({
                user_id: params.userId,
                account_id: params.accountId,
                transaction_type: params.transactionType,
                amount: params.amount,
                frequency: params.frequency,
                start_date: params.startDate,
                end_date: params.endDate,
                description: params.description,
                expense_category_id: this.sanitizeUuid(params.expenseCategoryId),
                income_category_id: this.sanitizeUuid(params.incomeCategoryId),
                subcategory_id: this.sanitizeUuid(params.subcategoryId),
                last_executed_date: params.startDate, // Mark first execution as done
                execution_method: params.executionMethod || 'AUTO',
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('[CREATE_RECURRING_RULE]', error)
            // Non-blocking error - we log but don't fail the main transaction
        }

        return data
    }
}
