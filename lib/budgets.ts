import { expandCategoryIds } from '@/lib/category-utils'
import { convertAmount, ExchangeRateMap } from '@/lib/currency'
import { DEFAULT_CURRENCY } from '@/lib/currencies'
import { getMonthDateRangeInTimezone } from '@/lib/timezone'
import type { BudgetScope } from '@/types/budget'

export function normalizeBudgetScope(scope?: string | null): BudgetScope {
    if (scope === 'ACCOUNT') return 'ACCOUNT'
    return 'GLOBAL'
}

export function getMonthDateRangeUTC(
    year: number,
    month: number,
    timeZone = 'America/Lima'
): { startIso: string; endIso: string } {
    return getMonthDateRangeInTimezone(year, month, timeZone)
}

export interface CategoryIndex {
    allCategories: { id: string; name: string; parent_id?: string | null }[]
    categoriesByName: Record<string, string[]>
    idToName: Record<string, string>
}

export function buildCategoryIndex(
    allCategories: { id: string; name: string; parent_id?: string | null }[]
): CategoryIndex {
    const categoriesByName: Record<string, string[]> = {}
    const idToName: Record<string, string> = {}
    const normalize = (n: string) => (n ? n.trim().toLowerCase() : '')

    for (const c of allCategories) {
        if (c.name) {
            const key = normalize(c.name)
            if (!categoriesByName[key]) categoriesByName[key] = []
            categoriesByName[key].push(c.id)
            idToName[c.id] = c.name
        }
    }

    return { allCategories, categoriesByName, idToName }
}

function expandTargetCategories(ids: string[], index: CategoryIndex): Set<string> {
    if (!ids || ids.length === 0) return new Set()
    const normalize = (n: string) => (n ? n.trim().toLowerCase() : '')
    const targetIds: string[] = []

    for (const id of ids) {
        targetIds.push(id)
        const name = index.idToName[id]
        if (name) {
            const key = normalize(name)
            if (index.categoriesByName[key]) {
                targetIds.push(...index.categoriesByName[key])
            }
        }
    }

    return new Set(expandCategoryIds(targetIds, index.allCategories))
}

export interface BudgetTransactionRow {
    amount: number | string
    currency_code?: string | null
    transaction_type?: string | null
    transaction_date: string
    account_id?: string | null
    expense_category_id?: string | null
    income_category_id?: string | null
    subcategory_id?: string | null
    loan_id?: string | null
    savings_goal_id?: string | null
    tags?: string[] | null
    metadata?: Record<string, any> | null
}

/**
 * Pure, deterministic calculation of a budget's spent/accumulated amount
 * from a pre-fetched list of user transactions (eliminating N+1 queries).
 */
export function calculateBudgetSpent(
    budget: any,
    transactions: BudgetTransactionRow[],
    categoryIndex: CategoryIndex,
    rateMap: ExchangeRateMap
): number {
    const now = new Date()
    const year = Number(budget.budget_year) || now.getUTCFullYear()
    const month = Number(budget.budget_month) || now.getUTCMonth() + 1
    const { startIso, endIso } = getMonthDateRangeUTC(year, month)
    const startMs = Date.parse(startIso)
    const endMs = Date.parse(endIso)

    const budgetCurrency = budget.currency_code || DEFAULT_CURRENCY
    const isSavings = budget.type === 'SAVINGS' || budget.type === 'INCOME'
    const scope = normalizeBudgetScope(budget.budget_scope)
    const accountIds: string[] =
        scope === 'ACCOUNT' && Array.isArray(budget.account_ids) ? budget.account_ids : []
    const accountSet = accountIds.length > 0 ? new Set(accountIds) : null

    const includeIds: string[] = Array.isArray(budget.include_categories)
        ? budget.include_categories
        : []
    const excludeIds: string[] = Array.isArray(budget.exclude_categories)
        ? budget.exclude_categories
        : []
    const includeTags: string[] = Array.isArray(budget.include_tags) ? budget.include_tags : []

    const expandedInclude = includeIds.length > 0 ? expandTargetCategories(includeIds, categoryIndex) : null
    const expandedExclude = excludeIds.length > 0 ? expandTargetCategories(excludeIds, categoryIndex) : null

    let total = 0

    for (const tx of transactions) {
        // 1. Date range check
        const txMs = Date.parse(tx.transaction_date)
        if (Number.isNaN(txMs) || txMs < startMs || txMs > endMs) continue

        // 2. Exclude scheduled / pending virtual transactions
        const meta = tx.metadata
        if (meta && (meta.mode === 'SCHEDULED' || meta.loanStatus === 'PENDING')) continue

        // 3. Smart Rules
        if (!budget.include_loaned && tx.loan_id) continue

        if (!budget.include_balance_corrections && tx.transaction_type === 'TRANSFER') continue

        if (!isSavings && !budget.include_goal_transactions) {
            if (tx.savings_goal_id || tx.transaction_type === 'SAVINGS_DEPOSIT') continue
        }

        // 4. Account Scope
        if (accountSet && (!tx.account_id || !accountSet.has(tx.account_id))) continue

        // 5. Tag Filter
        if (includeTags.length > 0) {
            const txTags = Array.isArray(tx.tags) ? tx.tags : []
            if (!includeTags.some((tag) => txTags.includes(tag))) continue
        }

        // 6. Category & Type Matching
        if (expandedExclude) {
            const isExcluded =
                (tx.expense_category_id && expandedExclude.has(tx.expense_category_id)) ||
                (tx.income_category_id && expandedExclude.has(tx.income_category_id)) ||
                (tx.subcategory_id && expandedExclude.has(tx.subcategory_id))
            if (isExcluded) continue
        }

        let matched = false
        if (isSavings) {
            if (expandedInclude) {
                matched =
                    Boolean(tx.income_category_id && expandedInclude.has(tx.income_category_id)) ||
                    (Boolean(budget.include_goal_transactions) &&
                        tx.transaction_type === 'SAVINGS_DEPOSIT')
            } else {
                // Global savings budget tracks actual savings deposits / goal contributions
                matched =
                    tx.transaction_type === 'SAVINGS_DEPOSIT' ||
                    Boolean(tx.savings_goal_id && tx.transaction_type !== 'SAVINGS_WITHDRAWAL')
            }
        } else {
            // EXPENSE budget
            if (expandedInclude) {
                matched =
                    Boolean(tx.expense_category_id && expandedInclude.has(tx.expense_category_id)) ||
                    Boolean(tx.subcategory_id && expandedInclude.has(tx.subcategory_id))
            } else {
                matched =
                    tx.transaction_type === 'EXPENSE' ||
                    Boolean(tx.expense_category_id) ||
                    (Boolean(budget.include_goal_transactions) &&
                        tx.transaction_type === 'SAVINGS_DEPOSIT') ||
                    (Boolean(budget.include_balance_corrections) &&
                        tx.transaction_type === 'TRANSFER')
            }
        }

        if (!matched) continue

        // 7. Convert transaction currency to budget currency
        const rawAmount = Number(tx.amount || 0)
        const converted = convertAmount(rawAmount, tx.currency_code || budgetCurrency, budgetCurrency, rateMap)
        total += converted
    }

    return Math.round(total * 100) / 100
}

export function mapBudgetRow(row: any, computedSpent?: number) {
    const amount = Number(row.amount || 0)
    const spent = computedSpent !== undefined ? computedSpent : Number(row.spent || 0)
    const remaining = Math.round((amount - spent) * 100) / 100
    const percentage = amount > 0 ? (spent / amount) * 100 : 0

    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        amount,
        spent,
        type: row.type || 'EXPENSE',
        period: row.period || 'MONTHLY',
        color: row.color || '#3b82f6',
        currencyCode: row.currency_code || DEFAULT_CURRENCY,
        budgetYear: row.budget_year,
        budgetMonth: row.budget_month,
        accountIds: row.account_ids || [],
        includeCategories: row.include_categories || [],
        excludeCategories: row.exclude_categories || [],
        includeTags: row.include_tags || [],
        transactionFilterMode: row.transaction_filter_mode || 'DEFAULT',
        budgetScope: normalizeBudgetScope(row.budget_scope),
        includeLoaned: Boolean(row.include_loaned),
        includeGoalTransactions: Boolean(row.include_goal_transactions),
        includeBalanceCorrections: Boolean(row.include_balance_corrections),
        includeFromOtherBudgets: Boolean(row.include_from_other_budgets),
        excludedBudgetIds: row.excluded_budget_ids || [],
        isActive: row.is_active !== false,
        isZbbControlled: Boolean(row.is_zbb_controlled),
        zbbAllocationId: row.zbb_allocation_id || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        stats: {
            spent,
            remaining,
            percentage,
        },
    }
}
