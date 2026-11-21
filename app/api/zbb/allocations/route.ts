export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Create a new ZBB allocation
export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error('[ZBB_ALLOCATION_POST] Auth error:', authError)
        return NextResponse.json(
            { error: 'Sesión expirada. Recarga la página e intenta nuevamente.' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { cycleId, categoryId, subcategoryId, goalId, amount, currency = 'PEN', justification, priority } = body
        const numericAmount = Number(amount)

        if (!cycleId || (!categoryId && !goalId) || !Number.isFinite(numericAmount) || numericAmount <= 0 || !justification || !priority) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
        }

        if (priority < 1 || priority > 4) {
            return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 })
        }

        const allocated_amount_pen = currency === 'PEN' ? numericAmount : 0
        const allocated_amount_usd = currency === 'USD' ? numericAmount : 0

        const { data: allocation, error } = await supabase
            .from('zbb_allocations')
            .insert({
                user_id: user.id,
                cycle_id: cycleId,
                category_id: categoryId || null,
                subcategory_id: subcategoryId || null,
                goal_id: goalId || null,
                allocated_amount_usd,
                allocated_amount_pen,
                justification,
                priority: Number(priority),
            })
            .select(`
                *,
                category:expense_categories(*),
                subcategory:subcategories(*),
                goal:savings_goals(*)
            `)
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Este ítem ya está en tu plan. Edítalo en lugar de crear uno nuevo.' },
                    { status: 409 }
                )
            }
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // If cycle is already active, immediately create its linked monthly budget using valid schema columns
        try {
            const { data: cycle } = await supabase
                .from('zbb_planning_cycles')
                .select('period_start, status')
                .eq('id', cycleId)
                .eq('user_id', user.id)
                .single()

            if (cycle && cycle.status === 'active') {
                const [yStr, mStr] = String(cycle.period_start).split('-')
                const budgetYear = Number(yStr) || new Date().getFullYear()
                const budgetMonth = Number(mStr) || new Date().getMonth() + 1

                let budgetName = 'Presupuesto ZBB'
                if (goalId) {
                    budgetName = `Meta: ${allocation.goal?.name || 'Ahorro'}`
                } else if (allocation.subcategory?.name) {
                    budgetName = allocation.subcategory.name
                } else if (allocation.category?.name) {
                    budgetName = allocation.category.name
                }

                await supabase.from('budgets').insert({
                    user_id: user.id,
                    name: budgetName,
                    amount: numericAmount,
                    currency_code: currency,
                    type: goalId ? 'SAVINGS' : 'EXPENSE',
                    period: 'MONTHLY',
                    budget_year: budgetYear,
                    budget_month: budgetMonth,
                    budget_scope: 'GLOBAL',
                    is_zbb_controlled: true,
                    zbb_allocation_id: allocation.id,
                    transaction_filter_mode: goalId ? 'ADDED_TO_GOAL' : 'DEFAULT',
                    include_goal_transactions: Boolean(goalId),
                    include_categories: subcategoryId ? [subcategoryId] : categoryId ? [categoryId] : [],
                    color: goalId ? '#10b981' : allocation.category?.color || '#7C5CFC',
                    is_active: true,
                })
            }
        } catch (err) {
            console.error('[ZBB_ALLOCATION_POST] Budget auto-sync failed:', err)
        }

        return NextResponse.json(allocation, { status: 201 })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE: Remove an allocation and its linked ZBB budget (scoped to user)
export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    await supabase
        .from('budgets')
        .delete()
        .eq('zbb_allocation_id', id)
        .eq('is_zbb_controlled', true)
        .eq('user_id', user.id)

    const { error } = await supabase
        .from('zbb_allocations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

// PUT: Partial or full update of an existing allocation (NEVER wipes category_id/goal_id on quick amount edit!)
export async function PUT(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error('[ZBB_ALLOCATION_PUT] Auth error:', authError)
        return NextResponse.json(
            { error: 'Sesión expirada. Recarga la página e intenta nuevamente.' },
            { status: 401 }
        )
    }

    try {
        const body = await req.json()
        const { id, amount, currency, justification, priority, categoryId, subcategoryId, goalId } = body

        const numericAmount = Number(amount)
        if (!id || !Number.isFinite(numericAmount) || numericAmount < 0) {
            return NextResponse.json({ error: 'Faltan datos requeridos (ID, Amount)' }, { status: 400 })
        }

        // Only update fields that were explicitly provided (fixes inline EditableMoneyCell wiping category_id!)
        const updatePayload: Record<string, any> = {
            allocated_amount_pen: currency === 'USD' ? 0 : numericAmount,
            allocated_amount_usd: currency === 'USD' ? numericAmount : 0,
            updated_at: new Date().toISOString(),
        }

        if (justification !== undefined) updatePayload.justification = justification
        if (priority !== undefined) updatePayload.priority = Number(priority)
        if ('categoryId' in body) updatePayload.category_id = categoryId || null
        if ('subcategoryId' in body) updatePayload.subcategory_id = subcategoryId || null
        if ('goalId' in body) updatePayload.goal_id = goalId || null

        const { data: updatedAllocation, error: updateError } = await supabase
            .from('zbb_allocations')
            .update(updatePayload)
            .eq('id', id)
            .eq('user_id', user.id)
            .select('*, zbb_planning_cycles(status)')
            .single()

        if (updateError) throw updateError

        // Propagate to linked Budget if Cycle is Active
        const cycleStatus = updatedAllocation.zbb_planning_cycles?.status
        if (cycleStatus === 'active') {
            const { data: budget } = await supabase
                .from('budgets')
                .select('id')
                .eq('zbb_allocation_id', id)
                .eq('is_zbb_controlled', true)
                .eq('user_id', user.id)
                .maybeSingle()

            if (budget) {
                await supabase
                    .from('budgets')
                    .update({
                        amount: numericAmount,
                        currency_code: currency || 'PEN',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', budget.id)
                    .eq('user_id', user.id)
            }
        }

        return NextResponse.json(updatedAllocation)
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        console.error('[ZBB_ALLOCATION_PUT]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
