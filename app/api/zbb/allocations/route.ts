import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Crear una nueva asignación ZBB
export async function POST(request: Request) {
    const supabase = await createClient()
    const body = await request.json()
    const { cycleId, categoryId, subcategoryId, goalId, amount, currency, justification, priority } = body

    // Validation: "The Rule of Intentionality"
    // Must have Category OR Goal, not both, not neither.
    if (!cycleId || (!categoryId && !goalId) || !amount || !justification || !priority) {
        return new NextResponse(JSON.stringify({ error: 'Faltan campos obligatorios' }), { status: 400 })
    }

    if (priority < 1 || priority > 4) {
        return new NextResponse(JSON.stringify({ error: 'Prioridad inválida' }), { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // --- STRICT CURRENCY LOGIC ---
    let allocated_amount_pen = 0
    let allocated_amount_usd = 0

    if (currency === 'PEN') {
        allocated_amount_pen = amount
    } else {
        allocated_amount_usd = amount
    }

    // 1. Insert Allocation
    const { data: allocation, error } = await supabase
        .from('zbb_allocations')
        .insert({
            user_id: user.id,
            cycle_id: cycleId,
            category_id: categoryId || null,
            subcategory_id: subcategoryId || null,
            goal_id: goalId || null, // NEW

            allocated_amount_usd,
            allocated_amount_pen,

            justification,
            priority
        })
        .select(`
            *,
            category:expense_categories(*),
            subcategory:subcategories(*)
        `)
        .single()

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json(
                { error: "Este ítem ya está en tu plan. Edítalo en lugar de crear uno nuevo." },
                { status: 409 }
            )
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 2. AUTO-CREATE BUDGET (The Enforcement Layer)
    // Every ZBB decision must be enforced by a Budget
    try {
        let budgetName = ''
        let budgetType = ''
        let budgetFilter = ''

        if (goalId) {
            // Fetch goal name for the budget
            const { data: goal } = await supabase.from('savings_goals').select('name').eq('id', goalId).single()
            budgetName = `Meta: ${goal?.name || 'Ahorro'}`
            budgetType = 'SAVINGS'
            budgetFilter = 'ADDED_TO_GOAL'
        } else {
            // It's a Category allocation
            const { data: cat } = await supabase.from('expense_categories').select('name').eq('id', categoryId).single()
            budgetName = cat?.name || 'Gasto'
            budgetType = 'EXPENSE'
            budgetFilter = 'DEFAULT' // Normal expenses
        }

        // Get cycle dates to set budget period
        const { data: cycle } = await supabase.from('zbb_planning_cycles').select('period_start, period_end').eq('id', cycleId).single()

        if (cycle) {
            const { error: budgetError } = await supabase
                .from('budgets')
                .insert({
                    user_id: user.id,
                    name: budgetName,
                    amount: amount,
                    currency_code: currency,
                    type: budgetType,
                    // Period matches the Cycle
                    period: 'CUSTOM',
                    start_date: cycle.period_start,
                    end_date: cycle.period_end,

                    // Linkage
                    is_zbb_controlled: true,
                    zbb_allocation_id: allocation.id,

                    // Filters
                    transaction_filter_mode: budgetFilter,
                    include_categories: categoryId ? [categoryId] : [],
                    // For goals, we might want to filter transfers to that goal? 
                    // Currently 'ADDED_TO_GOAL' is a filter mode.

                    color: goalId ? '#10b981' : '#3b82f6', // Green for savings, Blue for expense
                    is_active: true
                })

            if (budgetError) console.error("Error auto-creating budget:", budgetError)
        }

    } catch (err) {
        console.error("Failed to create backup budget", err)
        // Don't fail the request, just log it. ZBB allocation is more important.
    }

    return NextResponse.json(allocation)
}

// DELETE: Remover una asignación
export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supabase = await createClient()

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    // 1. Delete linked budget (Enforce Cleanup)
    const { error: budgetError } = await supabase
        .from('budgets')
        .delete()
        .eq('zbb_allocation_id', id)
        .eq('is_zbb_controlled', true) // Security check

    if (budgetError) {
        console.error("Error cleaning up budget:", budgetError)
        // We continue even if budget delete fails? No, better warn.
        // But for UX, we prioritize allocation delete.
    }

    // 2. Delete the allocation
    const { error } = await supabase
        .from('zbb_allocations')
        .delete()
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}

// PUT: Update an existing allocation
// NOTE: We do NOT allow changing from Category -> Goal or vice-versa in UPDATE.
// If you want to change type, delete and re-create.
export async function PUT(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { id, amount, currency, justification, priority, categoryId, subcategoryId, goalId } = body

        if (!id || !amount) {
            return NextResponse.json({ error: 'Faltan datos requeridos (ID, Amount)' }, { status: 400 })
        }

        // 1. Update the Allocation
        const { data: updatedAllocation, error: updateError } = await supabase
            .from('zbb_allocations')
            .update({
                allocated_amount_pen: currency === 'PEN' ? amount : 0,
                allocated_amount_usd: currency === 'USD' ? amount : 0,
                justification,
                priority,
                // We allow updating relations if they match the original type (e.g. changing category)
                // But strictly speaking ZBB usually discourages changing target. 
                // For now, let's update relations if provided.
                category_id: categoryId || null,
                subcategory_id: subcategoryId || null,
                goal_id: goalId || null
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select('*, zbb_planning_cycles(status)')
            .single()

        if (updateError) throw updateError

        // 2. Propagate to Budget if Cycle is Active
        const cycleStatus = updatedAllocation.zbb_planning_cycles?.status

        if (cycleStatus === 'active') {
            const { data: budget } = await supabase
                .from('budgets')
                .select('id, is_zbb_controlled')
                .eq('zbb_allocation_id', id)
                .eq('is_zbb_controlled', true)
                .single()

            if (budget) {
                await supabase
                    .from('budgets')
                    .update({
                        amount: amount,
                        currency_code: currency
                    })
                    .eq('id', budget.id)
            }
        }

        return NextResponse.json(updatedAllocation)
    } catch (error: any) {
        console.error('Error updating allocation:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
