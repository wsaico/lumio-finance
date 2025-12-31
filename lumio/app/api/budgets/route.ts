import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCategory, getCategoryDefaults, expandCategoryIds } from '@/lib/category-utils'
// import { budgetCalculator } from '@/lib/budget-calculator' // DISABLED

function mapBudget(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        amount: row.amount,
        spent: Number(row.spent || 0), // Use stored value
        type: row.type,
        period: row.period,
        color: row.color,
        currencyCode: row.currency_code,
        startDate: row.start_date,
        endDate: row.end_date,
        accountIds: row.account_ids || [],
        includeCategories: row.include_categories || [],
        excludeCategories: row.exclude_categories || [],
        includeTags: row.include_tags || [],
        transactionFilterMode: row.transaction_filter_mode || 'DEFAULT',
        budgetScope: row.budget_scope || 'ALL_TRANSACTIONS',
        includeLoaned: row.include_loaned || false,
        includeGoalTransactions: row.include_goal_transactions || false,
        includeBalanceCorrections: row.include_balance_corrections || false,
        includeFromOtherBudgets: row.include_from_other_budgets || false,
        excludedBudgetIds: row.excluded_budget_ids || [],
        isActive: row.is_active,
        createdAt: row.created_at,
        stats: {
            spent: Number(row.spent || 0),
            remaining: Number(row.amount) - Number(row.spent || 0),
            percentage: Number(row.amount) > 0 ? (Number(row.spent || 0) / Number(row.amount)) * 100 : 0
        }
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: budgets, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[BUDGETS_GET_SUPABASE]', error)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        // 1. Fetch Categories explicitly (Split queries to avoid OR syntax issues)
        const [userExp, sysExp, userInc, sysInc] = await Promise.all([
            supabase.from('expense_categories').select('*').eq('user_id', user.id),
            supabase.from('expense_categories').select('*').is('user_id', null),
            supabase.from('income_categories').select('*').eq('user_id', user.id),
            supabase.from('income_categories').select('*').is('user_id', null)
        ])

        const allCategories = [
            ...(userExp.data || []).map(c => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(sysExp.data || []).map(c => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(userInc.data || []).map(c => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(sysInc.data || []).map(c => ({ id: c.id, name: c.name, parent_id: c.parent_category_id }))
        ]

        // Robust Matching: Map Names to Multiple IDs (User Version + System Version)
        // Robust Matching: Map Names to Multiple IDs (User Version + System Version)
        const categoriesByName: Record<string, string[]> = {}
        const normalize = (n: string) => n ? n.trim().toLowerCase() : ''

        allCategories.forEach(c => {
            if (c.name) {
                const key = normalize(c.name)
                if (!categoriesByName[key]) categoriesByName[key] = []
                categoriesByName[key].push(c.id)
            }
        })
        const idToName: Record<string, string> = {}
        allCategories.forEach(c => { idToName[c.id] = c.name })

        // Calculate Spent Dynamically (Since 'spent' column does not exist)
        const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
            const year = budget.budget_year || new Date().getFullYear()
            const month = budget.budget_month || (new Date().getMonth() + 1)

            // Construct Month Range
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

            // Corrected: Select correct column names based on actual Schema (step 988/1024)
            let query = supabase
                .from('transactions')
                .select('amount, expense_category_id, income_category_id, subcategory_id') // Added subcategory_id
                .eq('user_id', user.id)
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate)

            // --- SMART RULES IMPLEMENTATION ---
            // 1. Loans: Exclude unless explicitly included
            if (!budget.include_loaned) {
                query = query.is('loan_id', null)
            }

            // 2. Savings Goals: Exclude unless explicitly included
            if (!budget.include_goal_transactions) {
                query = query.is('savings_goal_id', null)
                    .neq('transaction_type', 'SAVINGS_DEPOSIT')
            }

            // 3. Balance Corrections: Exclude Transfers unless included
            if (!budget.include_balance_corrections) {
                query = query.neq('transaction_type', 'TRANSFER')
            }
            // ----------------------------------

            // Filter by Category if specific categories are selected
            // If include_categories is empty, it means "All Categories" (Global Budget) for that Type?
            // Usually Global Budget implies "All Expenses".
            // If specific categories, filter IN.

            // ----------------------------------

            // OPTIMIZATION: Fetch all transactions for the period and filter in memory to handle complex OR conditions
            // (expense_category_id IN list OR subcategory_id IN list)
            // We removed the DB-side category filtering to do it robustly in JS below.

            if (budget.include_categories && budget.include_categories.length > 0) {
                // Do not filter by category in DB, fetch all for the Type/Period and filter in memory
            } else {
                // Global Budget: Filter by Type only (keep DB filter for efficiency)
                if (budget.type === 'INCOME' || budget.type === 'SAVINGS') {
                    query = query.not('income_category_id', 'is', null)
                } else {
                    query = query.not('expense_category_id', 'is', null)
                }
            }

            // ----------------------------------

            // 4. Account Scope: Specific vs Global
            if (budget.account_ids && budget.account_ids.length > 0) {
                // If specific accounts are selected, filter by account_id
                query = query.in('account_id', budget.account_ids)
            }

            const { data: transactions, error: txError } = await query;

            let spent = 0;
            if (!txError && transactions) {
                // In-Memory Filtering for Robustness (Handle Subcategories & System Categories)
                if (budget.include_categories && budget.include_categories.length > 0) {
                    // 1. Get Names of selected categories
                    // 2. Find ALL IDs matching those names (bridging User vs System IDs)
                    let targetIds: string[] = []
                    budget.include_categories.forEach((id: string) => {
                        targetIds.push(id) // Always include the original
                        const name = idToName[id]
                        if (name) {
                            const key = normalize(name)
                            if (categoriesByName[key]) {
                                targetIds.push(...categoriesByName[key])
                            }
                        }
                    })

                    const expandedIds = new Set(expandCategoryIds(targetIds, allCategories))

                    spent = transactions.reduce((sum, t) => {
                        let match = false
                        if (budget.type === 'INCOME' || budget.type === 'SAVINGS') {
                            match = t.income_category_id && expandedIds.has(t.income_category_id)
                        } else {
                            // Check both expense_category_id AND subcategory_id
                            match = (t.expense_category_id && expandedIds.has(t.expense_category_id)) ||
                                (t.subcategory_id && expandedIds.has(t.subcategory_id))
                        }
                        return match ? sum + Number(t.amount) : sum
                    }, 0)
                } else {
                    // Global Budget (already filtered by Type/Account via DB query modifiers above, but check nulls)
                    spent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
                }
            }

            return mapBudget({ ...budget, spent });
        }))

        return NextResponse.json(budgetsWithSpent)

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()

        // Basic validation
        if (!body.name || !body.amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Derive Month/Year from startDate
        const startDate = new Date(body.startDate || new Date())
        const month = startDate.getMonth() + 1
        const year = startDate.getFullYear()

        // Resolve Category ID (Handle System IDs)
        // Determine correct defaults/table based on type
        // SAVINGS budgets use Income Categories based on Frontend Wizard logic
        const isIncomeOrSavings = (body.type === 'INCOME' || body.type === 'SAVINGS')
        const defaults = getCategoryDefaults(body.type || 'EXPENSE')
        const tableName = isIncomeOrSavings ? 'income_categories' : 'expense_categories'

        // Default to Global (empty array) if no category provided
        // const othersId = ... // REMOVED: Do not force "Others"
        const targetCategoryId = body.includeCategories?.[0] || null

        const resolvedCategoryId = await resolveCategory(supabase, tableName, targetCategoryId, user.id, defaults)

        // Resolve Array of Categories (Advance: Need to map all)
        let resolvedIncludeCategories: string[] = []
        if (body.includeCategories && body.includeCategories.length > 0) {
            // Processing sequentially to avoid race conditions on creation
            for (const catId of body.includeCategories) {
                const res = await resolveCategory(supabase, tableName, catId, user.id, defaults)
                if (res) resolvedIncludeCategories.push(res)
            }
        }

        // Prepare Categories Logic First (to get finalized categories for base payload)
        // Verified: The table 'budgets' uses 'include_categories' (array) for category implementation. 
        // There is NO 'category_id' column.

        let finalIncludeCategories = resolvedIncludeCategories;
        if (resolvedCategoryId && !finalIncludeCategories.includes(resolvedCategoryId)) {
            finalIncludeCategories = [resolvedCategoryId, ...finalIncludeCategories];
        }

        // Prepare Base Payload (Guaranteed columns based on Schema Discovery)
        const basePayload = {
            user_id: user.id,
            name: body.name,
            amount: body.amount,
            period: body.period || 'MONTHLY',
            // category_id: resolvedCategoryId, // REMOVED: Verified missing.
            budget_month: month,
            budget_year: year,
            currency_code: body.currencyCode || 'USD',
            include_categories: finalIncludeCategories, // Core column (Verified existence)
            // spent: 0 // REMOVED: Column does not exist
            // is_active: true
        }

        const advancedPayload = {
            ...basePayload,
            type: body.type || 'EXPENSE',
            color: body.color || '#3b82f6',
            account_ids: body.accountIds || [],
            // include_categories already in base
            exclude_categories: body.excludeCategories || [],
            include_tags: body.includeTags || [],
            transaction_filter_mode: body.transactionFilterMode || 'DEFAULT',
            budget_scope: body.budgetScope || 'ALL_TRANSACTIONS',
            include_loaned: body.includeLoaned || false,
            include_goal_transactions: body.includeGoalTransactions || false,
            include_balance_corrections: body.includeBalanceCorrections || false,
            include_from_other_budgets: body.includeFromOtherBudgets || false,
            excluded_budget_ids: body.excludedBudgetIds || [],
            is_active: true
        }

        let newBudget = null

        // Strategy: Try Advanced Insert first. If it fails due to column missing, fallback to Base.
        try {
            const { data, error } = await supabase
                .from('budgets')
                .insert(advancedPayload)
                .select()
                .single()

            if (error) throw error
            newBudget = data
        } catch (advancedError: any) {
            console.warn('[BUDGETS_POST] Advanced insert failed, retrying with basic schema. Error:', advancedError.message)

            // Retry with Basic Payload
            const { data: basicData, error: basicError } = await supabase
                .from('budgets')
                .insert(basePayload)
                .select()
                .single()

            if (basicError) {
                console.error('[BUDGETS_POST_CRITICAL]', basicError)
                // Return detailed error for user to see in Toast
                return NextResponse.json({
                    error: `DB Error: ${basicError.message}`,
                    details: `Advanced: ${advancedError.message}. Basic: ${basicError.message}`
                }, { status: 500 })
            }
            newBudget = basicData
        }

        return NextResponse.json(mapBudget(newBudget))
    } catch (error: any) {
        console.error('[BUDGETS_POST_GLOBAL]', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}
