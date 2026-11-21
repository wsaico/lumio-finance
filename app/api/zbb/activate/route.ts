export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/zbb/activate - Activates a planning cycle and syncs allocations to public.budgets
export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { cycleId } = await request.json()
        if (!cycleId) {
            return NextResponse.json({ error: 'Missing cycleId' }, { status: 400 })
        }

        const { data: cycle, error: cycleError } = await supabase
            .from('zbb_planning_cycles')
            .select('*')
            .eq('id', cycleId)
            .eq('user_id', user.id)
            .single()

        if (cycleError || !cycle) {
            return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
        }

        const { data: allocations, error: allocError } = await supabase
            .from('zbb_allocations')
            .select(`
                *,
                category:expense_categories(id, name, color),
                subcategory:subcategories(id, name),
                goal:savings_goals(id, name)
            `)
            .eq('cycle_id', cycleId)
            .eq('user_id', user.id)

        if (allocError) {
            return NextResponse.json({ error: allocError.message }, { status: 500 })
        }

        const [yStr, mStr] = String(cycle.period_start).split('-')
        const budgetYear = parseInt(yStr, 10) || new Date().getFullYear()
        const budgetMonth = parseInt(mStr, 10) || new Date().getMonth() + 1

        let syncedCount = 0
        const errors: any[] = []

        for (const alloc of allocations || []) {
            const amountPEN = Number(alloc.allocated_amount_pen || 0)
            const amountUSD = Number(alloc.allocated_amount_usd || 0)
            const limitAmount = amountPEN > 0 ? amountPEN : amountUSD
            const currency = amountPEN > 0 ? 'PEN' : 'USD'

            if (limitAmount <= 0) continue

            const isGoal = Boolean(alloc.goal_id) && !alloc.category_id
            const budgetName = isGoal
                ? `Meta: ${alloc.goal?.name || alloc.justification || 'Ahorro'}`
                : alloc.subcategory?.name || alloc.category?.name || alloc.justification || 'Presupuesto'

            const includeCategories = isGoal
                ? []
                : alloc.subcategory_id
                  ? [alloc.subcategory_id]
                  : alloc.category_id
                    ? [alloc.category_id]
                    : []

            const budgetPayload = {
                name: budgetName,
                amount: limitAmount,
                currency_code: currency,
                type: isGoal ? 'SAVINGS' : 'EXPENSE',
                period: 'MONTHLY',
                budget_year: budgetYear,
                budget_month: budgetMonth,
                budget_scope: 'GLOBAL',
                include_categories: includeCategories,
                transaction_filter_mode: isGoal ? 'ADDED_TO_GOAL' : 'DEFAULT',
                include_goal_transactions: isGoal,
                color: isGoal ? '#10b981' : alloc.category?.color || '#7C5CFC',
                is_zbb_controlled: true,
                zbb_allocation_id: alloc.id,
                is_active: true,
                updated_at: new Date().toISOString(),
            }

            // Match existing budget strictly by zbb_allocation_id (real column in public.budgets!)
            const { data: existingBudget } = await supabase
                .from('budgets')
                .select('id')
                .eq('user_id', user.id)
                .eq('zbb_allocation_id', alloc.id)
                .maybeSingle()

            const result = existingBudget
                ? await supabase
                      .from('budgets')
                      .update(budgetPayload)
                      .eq('id', existingBudget.id)
                      .eq('user_id', user.id)
                : await supabase.from('budgets').insert({
                      ...budgetPayload,
                      user_id: user.id,
                  })

            if (result.error) {
                console.error('[ZBB_ACTIVATE] Budget sync error:', result.error)
                errors.push({ allocationId: alloc.id, error: result.error.message })
            } else {
                syncedCount++
            }
        }

        await supabase
            .from('zbb_planning_cycles')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', cycleId)
            .eq('user_id', user.id)

        return NextResponse.json({
            success: true,
            synced_count: syncedCount,
            errors,
        })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
