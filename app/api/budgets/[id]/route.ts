export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCategory, getCategoryDefaults } from '@/lib/category-utils'
import { DEFAULT_CURRENCY } from '@/lib/currencies'
import { mapBudgetRow, normalizeBudgetScope } from '@/lib/budgets'

// GET /api/budgets/[id] - Get a specific budget
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: budget, error } = await supabase
            .from('budgets')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (error || !budget) {
            return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
        }

        return NextResponse.json(mapBudgetRow(budget))
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/budgets/[id] - Update a budget
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const amount = Number(body.amount)

        if (!name || !Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'El nombre y un monto mayor a 0 son obligatorios' },
                { status: 400 }
            )
        }

        const type = body.type === 'SAVINGS' || body.type === 'INCOME' ? body.type : 'EXPENSE'
        const isIncomeOrSavings = type === 'INCOME' || type === 'SAVINGS'
        const defaults = getCategoryDefaults(type)
        const tableName = isIncomeOrSavings ? 'income_categories' : 'expense_categories'

        // Resolve system categories consistently with POST
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
        const updatePayload: Record<string, any> = {
            name,
            amount,
            period: 'MONTHLY',
            type,
            color: body.color || '#3b82f6',
            currency_code: body.currencyCode || DEFAULT_CURRENCY,
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
            updated_at: new Date().toISOString(),
        }

        if (body.budgetYear && !Number.isNaN(Number(body.budgetYear))) {
            updatePayload.budget_year = Number(body.budgetYear)
        }
        if (body.budgetMonth && !Number.isNaN(Number(body.budgetMonth))) {
            updatePayload.budget_month = Number(body.budgetMonth)
        }

        // Preserve ZBB unlink behavior when manually edited
        if (body.isZbbControlled === false || body.is_zbb_controlled === false) {
            updatePayload.is_zbb_controlled = false
            updatePayload.zbb_allocation_id = null
        }

        const { data: budget, error } = await supabase
            .from('budgets')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[BUDGET_PUT_SUPABASE]', error)
            return NextResponse.json(
                { error: `No se pudo actualizar el presupuesto: ${error.message}` },
                { status: 500 }
            )
        }

        return NextResponse.json(mapBudgetRow(budget))
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        console.error('[BUDGET_PUT_GLOBAL]', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/budgets/[id] - Partially update a budget (e.g., toggle isActive)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const updates: Record<string, any> = {}

        if (typeof body.isActive === 'boolean') updates.is_active = body.isActive
        if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
        if (body.amount !== undefined) {
            const parsed = Number(body.amount)
            if (!Number.isFinite(parsed) || parsed <= 0) {
                return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
            }
            updates.amount = parsed
        }
        if (typeof body.color === 'string' && body.color.trim()) updates.color = body.color.trim()

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
        }

        updates.updated_at = new Date().toISOString()

        const { data: budget, error } = await supabase
            .from('budgets')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[BUDGET_PATCH_SUPABASE]', error)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        return NextResponse.json(mapBudgetRow(budget))
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/budgets/[id] - Delete a budget
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) {
            console.error('[BUDGET_DELETE_SUPABASE]', error)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
