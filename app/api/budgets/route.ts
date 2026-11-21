export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCategory, getCategoryDefaults } from '@/lib/category-utils'
import { getExchangeRatesMap } from '@/lib/currency'
import { DEFAULT_CURRENCY } from '@/lib/currencies'
import {
    buildCategoryIndex,
    calculateBudgetSpent,
    getMonthDateRangeUTC,
    mapBudgetRow,
    normalizeBudgetScope,
    type BudgetTransactionRow,
} from '@/lib/budgets'
import { getUserEntitlementsServer } from '@/lib/server/entitlements'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const activeOnly = searchParams.get('activeOnly') === 'true'
        const yearParam = searchParams.get('year')
        const monthParam = searchParams.get('month')

        let budgetsQuery = supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (activeOnly) {
            budgetsQuery = budgetsQuery.eq('is_active', true)
        }
        if (yearParam && !Number.isNaN(Number(yearParam))) {
            budgetsQuery = budgetsQuery.eq('budget_year', Number(yearParam))
        }
        if (monthParam && !Number.isNaN(Number(monthParam))) {
            budgetsQuery = budgetsQuery.eq('budget_month', Number(monthParam))
        }

        const { data: budgets, error } = await budgetsQuery

        if (error) {
            console.error('[BUDGETS_GET_SUPABASE]', error)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        if (!budgets || budgets.length === 0) {
            return NextResponse.json([])
        }

        const { timezone } = await getUserEntitlementsServer(supabase, user)

        // Compute the global min/max local timezone date window across all fetched budgets
        const now = new Date()
        let minStartIso: string | null = null
        let maxEndIso: string | null = null

        for (const b of budgets) {
            const y = Number(b.budget_year) || now.getUTCFullYear()
            const m = Number(b.budget_month) || now.getUTCMonth() + 1
            const { startIso, endIso } = getMonthDateRangeUTC(y, m, timezone)
            if (!minStartIso || startIso < minStartIso) minStartIso = startIso
            if (!maxEndIso || endIso > maxEndIso) maxEndIso = endIso
        }

        // Fetch categories, exchange rates, and transactions in parallel (no N+1)
        const [userExp, sysExp, userInc, sysInc, subcats, rateMap, txResult] = await Promise.all([
            supabase.from('expense_categories').select('id, name, parent_category_id').eq('user_id', user.id),
            supabase.from('expense_categories').select('id, name, parent_category_id').is('user_id', null),
            supabase.from('income_categories').select('id, name, parent_category_id').eq('user_id', user.id),
            supabase.from('income_categories').select('id, name, parent_category_id').is('user_id', null),
            supabase.from('subcategories').select('id, name, parent_category_id'),
            getExchangeRatesMap(supabase),
            supabase
                .from('transactions')
                .select(
                    'amount, currency_code, transaction_type, transaction_date, account_id, expense_category_id, income_category_id, subcategory_id, loan_id, savings_goal_id, tags, metadata'
                )
                .eq('user_id', user.id)
                .gte('transaction_date', minStartIso!)
                .lte('transaction_date', maxEndIso!),
        ])

        const allCategories = [
            ...(userExp.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(sysExp.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(userInc.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(sysInc.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(subcats.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
        ]

        const categoryIndex = buildCategoryIndex(allCategories)
        const transactions: BudgetTransactionRow[] = !txResult.error && txResult.data ? txResult.data : []

        const budgetsWithSpent = budgets.map((budget: any) => {
            const spent = calculateBudgetSpent(budget, transactions, categoryIndex, rateMap)
            return mapBudgetRow(budget, spent)
        })

        return NextResponse.json(budgetsWithSpent)
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        console.error('[BUDGETS_GET_GLOBAL]', error)
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
        const { entitlements } = await getUserEntitlementsServer(supabase, user)
        if (!entitlements.canAccessPremiumWrite) {
            return NextResponse.json(
                { error: 'Los presupuestos requieren Plan Premium.', code: 'PREMIUM_REQUIRED' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const amount = Number(body.amount)

        if (!name || !Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'El nombre y un monto mayor a 0 son obligatorios' },
                { status: 400 }
            )
        }

        // Derive Month/Year from explicit fields or startDate or current date
        const referenceDate = body.startDate ? new Date(body.startDate) : new Date()
        const validDate = Number.isNaN(referenceDate.getTime()) ? new Date() : referenceDate
        const budgetMonth = Number(body.budgetMonth) || validDate.getMonth() + 1
        const budgetYear = Number(body.budgetYear) || validDate.getFullYear()

        const type = body.type === 'SAVINGS' || body.type === 'INCOME' ? body.type : 'EXPENSE'
        const isIncomeOrSavings = type === 'INCOME' || type === 'SAVINGS'
        const defaults = getCategoryDefaults(type)
        const tableName = isIncomeOrSavings ? 'income_categories' : 'expense_categories'

        // Resolve all category IDs sequentially to avoid race conditions creating system categories
        const rawIncludeCategories: string[] = Array.isArray(body.includeCategories)
            ? body.includeCategories
            : []
        const resolvedIncludeCategories: string[] = []
        for (const catId of rawIncludeCategories) {
            const resolved = await resolveCategory(supabase, tableName, catId, user.id, defaults)
            if (resolved && !resolvedIncludeCategories.includes(resolved)) {
                resolvedIncludeCategories.push(resolved)
            }
        }

        const budgetScope = normalizeBudgetScope(body.budgetScope)
        const accountIds =
            budgetScope === 'ACCOUNT' && Array.isArray(body.accountIds) ? body.accountIds : []

        // Strictly matches public.budgets columns in supabase/schema.sql
        const insertPayload = {
            user_id: user.id,
            name,
            amount,
            type,
            period: 'MONTHLY',
            color: body.color || '#3b82f6',
            currency_code: body.currencyCode || DEFAULT_CURRENCY,
            budget_month: budgetMonth,
            budget_year: budgetYear,
            account_ids: accountIds,
            include_categories: resolvedIncludeCategories,
            exclude_categories: Array.isArray(body.excludeCategories) ? body.excludeCategories : [],
            include_tags: Array.isArray(body.includeTags) ? body.includeTags : [],
            transaction_filter_mode: body.transactionFilterMode || 'DEFAULT',
            budget_scope: budgetScope,
            include_loaned: Boolean(body.includeLoaned),
            include_goal_transactions: Boolean(body.includeGoalTransactions),
            include_balance_corrections: Boolean(body.includeBalanceCorrections),
            include_from_other_budgets: Boolean(body.includeFromOtherBudgets),
            excluded_budget_ids: Array.isArray(body.excludedBudgetIds) ? body.excludedBudgetIds : [],
            is_active: body.isActive !== false,
        }

        const { data: newBudget, error } = await supabase
            .from('budgets')
            .insert(insertPayload)
            .select()
            .single()

        if (error) {
            console.error('[BUDGETS_POST_SUPABASE]', error)
            return NextResponse.json(
                { error: `No se pudo crear el presupuesto: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(mapBudgetRow(newBudget, 0), { status: 201 })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        console.error('[BUDGETS_POST_GLOBAL]', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
    }
}
