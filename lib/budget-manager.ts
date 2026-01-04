
import { createClient } from '@/lib/supabase/server'
import { BudgetCalculator, BudgetFilterConfig } from "@/lib/budget-calculator"

export interface BudgetWarning {
    budgetName: string
    exceededAmount: number
    percentage: number
    currency: string
}

/**
 * Updates all active budgets for a specific user to reflect recent transaction changes.
 * This should be called whenever a transaction is created, updated, or deleted.
 * Returns a list of budgets that have exceeded their limit.
 */
export async function updateBudgetsForTransactions(userId: string): Promise<BudgetWarning[]> {
    const warnings: BudgetWarning[] = []
    try {
        const supabase = await createClient()

        // 1. Fetch all active budgets for the user
        const { data: budgets, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', userId)

        if (error) {
            console.error('[BUDGET_MANAGER] Error fetching budgets:', error)
            return []
        }

        if (!budgets || budgets.length === 0) {
            return []
        }

        // 2. Recalculate each budget
        const updatePromises = budgets.map(async (budget) => {
            try {
                // Construct Date Range from month/year
                const year = budget.year
                const monthIndex = budget.month - 1 // Assume stored as 1-indexed
                const startDate = new Date(year, monthIndex, 1)
                const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59) // Last day of month

                // Safely cast budget to any to access potentially missing columns or metadata
                const b = budget as any

                // Construct filter config with safe fallbacks for every field
                const filterConfig: BudgetFilterConfig = {
                    userId: userId,
                    startDate: startDate,
                    endDate: endDate,

                    // Core Filters (Fallback to basic Category mode if advanced columns missing)
                    transactionFilterMode: b.transaction_filter_mode || 'DEFAULT',
                    budgetScope: b.budget_scope || 'CATEGORY',

                    // Boolean toggles (Default false)
                    includeLoaned: b.include_loaned || false,
                    includeGoalTransactions: b.include_goal_transactions || false,
                    includeBalanceCorrections: b.include_balance_corrections || false,
                    includeFromOtherBudgets: b.include_from_other_budgets || false,

                    // Arrays (Default empty)
                    excludedBudgetIds: b.excluded_budget_ids || [],
                    accountIds: b.account_ids || [],
                    includeCategories: b.include_categories || (b.category_id ? [b.category_id] : []), // Use category_id if list missing
                    excludeCategories: b.exclude_categories || [],
                    includeTags: b.include_tags || [],

                    // Type (Default to Expense)
                    type: b.type || 'EXPENSE'
                }

                // Supabase Query for Transactions
                let query = supabase.from('transactions').select('amount')

                // Apply Filters using Calculator
                query = BudgetCalculator.applyBudgetFilters(query, filterConfig)

                // CRITICAL: Force Currency Check if budget has currency?
                // Assuming budget currency matches user default or checking `currency_code` if it exists.
                if (budget.currency_code) {
                    query = query.eq('currency_code', budget.currency_code)
                }

                // EXCLUDE Metadata 'SCHEDULED' (JSON filtering)
                query = query.not('metadata->>mode', 'eq', 'SCHEDULED')
                query = query.not('metadata->>loanStatus', 'eq', 'PENDING') // for pending loans

                // Execute Query
                const { data: transactions, error: txError } = await query

                if (txError) {
                    console.error(`[BUDGET_MANAGER] Error fetching txs for budget ${budget.id}:`, txError)
                    throw txError
                }

                // Sum in JS
                const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

                // Check for Overrun
                const budgetAmount = Number(budget.amount)

                // Update Budget Record
                // Use snake_case column `spent`.
                await supabase.from('budgets').update({ spent: totalSpent }).eq('id', budget.id)

                if (budgetAmount > 0 && totalSpent > budgetAmount) {
                    const percentage = (totalSpent / budgetAmount) * 100
                    const exceededBy = totalSpent - budgetAmount

                    warnings.push({
                        budgetName: budget.name || 'Presupuesto',
                        exceededAmount: exceededBy,
                        percentage: percentage,
                        currency: budget.currency_code || 'USD'
                    })
                }

            } catch (err) {
                console.error(`[BUDGET_MANAGER] Failed to update budget ${budget.id}:`, err)
            }
        })

        await Promise.all(updatePromises)
        return warnings

    } catch (error) {
        console.error('[BUDGET_MANAGER] Critical error updating budgets:', error)
        return []
    }
}
