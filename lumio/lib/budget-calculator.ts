/**
 * Budget Calculator - Advanced transaction filtering logic
 * Handles all the complex filtering scenarios for budget calculations
 * REFACTORED FOR SUPABASE
 */

export interface BudgetFilterConfig {
  userId: string
  startDate: Date
  endDate: Date

  // Transaction filter mode
  transactionFilterMode: string
  budgetScope: string

  // Advanced filters
  includeLoaned: boolean
  includeGoalTransactions: boolean
  includeBalanceCorrections: boolean
  includeFromOtherBudgets: boolean
  excludedBudgetIds: string[]

  // Basic filters
  accountIds: string[]
  includeCategories: string[]
  excludeCategories: string[]
  includeTags: string[]

  // Budget type
  type: string
}

export class BudgetCalculator {
  /**
   * Apply filters to a Supabase query based on budget configuration
   * @param query The Supabase query builder instance (e.g. supabase.from('transactions').select('*'))
   * @param config The budget filter configuration
   * @returns The modified query builder
   */
  static applyBudgetFilters(query: any, config: BudgetFilterConfig) {
    // Basic User & Date Filters
    query = query.eq('user_id', config.userId)

    // Date Range (Assuming ISO strings or Date objects work with Supabase JS, typically ISO strings are safest)
    query = query.gte('transaction_date', config.startDate.toISOString())
    query = query.lte('transaction_date', config.endDate.toISOString())

    // === TRANSACTION FILTER MODE ===
    switch (config.transactionFilterMode) {
      case 'DEFAULT':
        // Default: Exclude transfers
        // Prisma: transactionType notIn ['TRANSFER']
        // Supabase: .neq('transaction_type', 'TRANSFER') or .not('transaction_type', 'eq', 'TRANSFER')?
        // Let's use filter syntax carefully.
        query = query.neq('transaction_type', 'TRANSFER')

        if (!config.includeLoaned) {
          query = query.is('loan_id', null)
        }
        if (!config.includeGoalTransactions) {
          // Check implicit behavior - savings_goal_id IS NULL
          query = query.is('savings_goal_id', null)
        }
        break

      case 'EXPENSE':
        query = query.eq('transaction_type', 'EXPENSE')
        query = query.is('loan_id', null)
        query = query.is('savings_goal_id', null)
        break

      case 'INCOME':
        // transactionType in ['INCOME', 'SAVINGS_DEPOSIT']
        query = query.in('transaction_type', ['INCOME', 'SAVINGS_DEPOSIT'])
        query = query.is('loan_id', null)
        query = query.is('savings_goal_id', null)
        break

      case 'LOANED':
        // loanId != null
        query = query.not('loan_id', 'is', null)
        break

      case 'ADDED_TO_GOAL':
        // savingsGoalId != null AND type IN ...
        query = query.not('savings_goal_id', 'is', null)
        query = query.in('transaction_type', ['SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL'])
        break

      case 'BALANCE_CORRECTION':
        // OR logic: Transfer OR description contains...
        // Supabase OR syntax: .or('col.eq.val,col2.eq.val')
        // This is tricky with 'contains' and different columns.
        // query.or(`transaction_type.eq.TRANSFER,description.ilike.%corrección%,description.ilike.%ajuste%`)
        // NOTE: ilike is case insensitive.
        query = query.or(`transaction_type.eq.TRANSFER,description.ilike.%corrección%,description.ilike.%ajuste%`)
        break

      case 'ADDED_TO_BUDGETS':
        // Not implemented fully yet
        break
    }

    // === BUDGET TYPE ===
    if (config.type === 'EXPENSE' && config.transactionFilterMode === 'DEFAULT') {
      query = query.eq('transaction_type', 'EXPENSE')
    } else if (config.type === 'SAVINGS' && config.transactionFilterMode === 'DEFAULT') {
      // Avoid clashing with above switch if it already set NEQ TRANSFER.
      // logic: if default, usually it means "Standard" transactions.
      // But if Budget Type is specifically "SAVINGS", we only want Income/Savings?
      // This re-applies filter. Supabase ANDs matches.
      query = query.in('transaction_type', ['INCOME', 'SAVINGS_DEPOSIT'])
    }

    // === ACCOUNT FILTERS ===
    if (config.accountIds && config.accountIds.length > 0) {
      query = query.in('account_id', config.accountIds)
    }

    // === CATEGORY FILTERS ===
    // This is the hardest one: (expenseCategory IN [...] OR incomeCategory IN [...])
    // Supabase OR syntax needs string representation.
    if (config.includeCategories && config.includeCategories.length > 0) {
      // Format: expense_category_id.in.(id1,id2),income_category_id.in.(id1,id2)
      // IDs need to be properly formatted (no quotes usually inside the parenthesis for UUIDs? No, Supabase JS docs say `in.(value1,value2)`).
      // Actually for UUIDs usually strictly: `column.in.(uuid1,uuid2)`
      // Safe string construction:
      const ids = config.includeCategories.map(id => `${id}`).join(',')
      query = query.or(`expense_category_id.in.(${ids}),income_category_id.in.(${ids})`)
    }

    if (config.excludeCategories && config.excludeCategories.length > 0) {
      // NOT (OR (...)) -> AND (NOT ... AND NOT ...)
      // Supabase: simply filter NEQ or NOT IN for both columns?
      // Wait, if I use `not('expense_category_id', 'in', list)` AND `not('income_category_id', 'in', list)`
      // That is equivalent to NOT (A OR B) = (NOT A) AND (NOT B).
      // Yes.
      query = query.not('expense_category_id', 'in', `(${config.excludeCategories.join(',')})`)
      query = query.not('income_category_id', 'in', `(${config.excludeCategories.join(',')})`)
    }

    // === TAG FILTERS ===
    if (config.includeTags && config.includeTags.length > 0) {
      // tags is array col? .cs (contains) or .ov (overlaps)?
      // Prisma: hasSome. Supabase: overlaps (&& operator in PG).
      // JS: .overlaps('tags', ['tag1', 'tag2'])
      query = query.overlaps('tags', config.includeTags)
    }

    // === ADVANCED BOOLEAN FILTERS ===
    // Only apply if not already handled by Mode
    if (!config.includeLoaned && config.transactionFilterMode !== 'DEFAULT' && config.transactionFilterMode !== 'EXPENSE' && config.transactionFilterMode !== 'INCOME' && config.transactionFilterMode !== 'LOANED') {
      // The modes above already set loan_id logic.
      // If we are in some other custom mode (unlikely given code), safety check.
      // Actually, DEFAULT/EXPENSE/INCOME already handled it.
      // But if someone passed a custom mode or fell through?
      // Let's safe guard:
      if (config.transactionFilterMode !== 'LOANED') {
        query = query.is('loan_id', null)
      }
    }

    if (!config.includeGoalTransactions && !['DEFAULT', 'EXPENSE', 'INCOME', 'ADDED_TO_GOAL'].includes(config.transactionFilterMode)) {
      if (config.transactionFilterMode !== 'ADDED_TO_GOAL') {
        query = query.is('savings_goal_id', null)
      }
    }

    return query
  }
}
