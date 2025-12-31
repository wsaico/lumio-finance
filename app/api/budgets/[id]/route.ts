
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function mapBudget(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        amount: row.amount,
        spent: Number(row.spent || 0),
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
        updatedAt: row.updated_at
        // Stats are optional in basic get
    }
}

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

        return NextResponse.json(mapBudget(budget))
    } catch (error) {
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
        const {
            name,
            amount,
            period,
            type,
            color,
            accountIds,
            includeCategories,
            excludeCategories,
            includeTags,
            currencyCode,
            startDate: bodyStartDate,
            endDate: bodyEndDate,
            transactionFilterMode,
            budgetScope,
            includeLoaned,
            includeGoalTransactions,
            includeBalanceCorrections,
            includeFromOtherBudgets,
            excludedBudgetIds
        } = body

        // Validate required fields
        if (!name || !amount) {
            return NextResponse.json({ error: 'Name and amount are required' }, { status: 400 })
        }

        // Calculate start and end dates if not provided
        const now = new Date()
        const startDate = bodyStartDate ? new Date(bodyStartDate) : new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = bodyEndDate ? new Date(bodyEndDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const { data: budget, error } = await supabase
            .from('budgets')
            .update({
                name,
                amount,
                period: period || 'MONTHLY',
                type: type || 'EXPENSE',
                color: color || '#3b82f6',
                currency_code: currencyCode || 'USD',
                account_ids: accountIds || [],
                include_categories: includeCategories || [],
                exclude_categories: excludeCategories || [],
                include_tags: includeTags || [],
                start_date: startDate,
                end_date: endDate,
                transaction_filter_mode: transactionFilterMode || 'DEFAULT',
                budget_scope: budgetScope || 'ALL_TRANSACTIONS',
                include_loaned: includeLoaned || false,
                include_goal_transactions: includeGoalTransactions || false,
                include_balance_corrections: includeBalanceCorrections || false,
                include_from_other_budgets: includeFromOtherBudgets || false,
                excluded_budget_ids: excludedBudgetIds || []
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[BUDGET_PUT_SUPABASE]', error)
            return NextResponse.json({ error: 'Database Error' }, { status: 500 })
        }

        return NextResponse.json(mapBudget(budget))
    } catch (error) {
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

        // Map common fields to snake_case
        const updates: any = {}
        if (body.isActive !== undefined) updates.is_active = body.isActive
        if (body.name !== undefined) updates.name = body.name
        if (body.amount !== undefined) updates.amount = body.amount
        if (body.color !== undefined) updates.color = body.color
        // Add others as needed if PATCH supports more fields

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

        return NextResponse.json(mapBudget(budget))
    } catch (error) {
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
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
