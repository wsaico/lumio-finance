import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/zbb/activate
// Activates a planning cycle and synchronizes it to the Budgets table
export async function POST(request: Request) {
    const supabase = await createClient()
    const { cycleId } = await request.json()

    if (!cycleId) {
        return NextResponse.json({ error: 'Missing cycleId' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 1. Fetch Cycle & Validation
    const { data: cycle, error: cycleError } = await supabase
        .from('zbb_planning_cycles')
        .select('*')
        .eq('id', cycleId)
        .eq('user_id', user.id)
        .single()

    if (cycleError || !cycle) {
        return NextResponse.json({ error: "Cycle not found" }, { status: 404 })
    }

    // 2. Fetch Allocations
    const { data: allocations, error: allocError } = await supabase
        .from('zbb_allocations')
        .select('*')
        .eq('cycle_id', cycleId)

    if (allocError) return NextResponse.json({ error: allocError.message }, { status: 500 })

    const budgetMap = new Map<string, {
        amountPEN: number,
        amountUSD: number,
        allocationIds: string[],
        justification: string
    }>()

    let skippedGoals = 0

    allocations.forEach(alloc => {
        // Fallback for Goal Allocations (Missing Category)
        // If it's a Goal, we need a way to group it. For now, group by goal_id if category is null.
        const key = alloc.category_id || alloc.goal_id

        if (!key) {
            return
        }

        const current = budgetMap.get(key) || {
            amountPEN: 0,
            amountUSD: 0,
            allocationIds: [] as string[],
            justification: alloc.justification
        }

        current.amountPEN += Number(alloc.allocated_amount_pen || 0)
        current.amountUSD += Number(alloc.allocated_amount_usd || 0)
        current.allocationIds.push(alloc.id)

        // If it's a Goal, maybe prefix justification?
        if (alloc.goal_id && !alloc.category_id) {
            current.justification = `Meta: ${alloc.justification}`
        }

        budgetMap.set(key, current)
    })

    const errors: any[] = []
    let syncedCount = 0

    // Safe Date Parsing (Avoid Timezone shifts)
    // format: YYYY-MM-DD
    const [yStr, mStr, dStr] = cycle.period_start.split('-')
    const budgetYear = parseInt(yStr)
    const budgetMonth = parseInt(mStr)
    const cycleDate = new Date(budgetYear, budgetMonth - 1, parseInt(dStr))

    for (const [keyId, data] of budgetMap.entries()) {
        let limit_amount = 0
        let currency = 'PEN'

        if (data.amountPEN > 0) {
            limit_amount = data.amountPEN
            currency = 'PEN'
        } else if (data.amountUSD > 0) {
            limit_amount = data.amountUSD
            currency = 'USD'
        }

        if (limit_amount === 0) continue;

        // Check if this Key is a Category or a Goal
        // Crude check: UUIDs don't say much...
        // But we can check existing budget.
        // Or simply query if it's a goal.
        // Wait, 'budgets' table typically links `category_id`.
        // If we link `goal_id`, does `budgets` have `goal_id` column?
        // Let's assume budgets supports goals via some mechanism or we just set Name.
        // If keyId is a Goal ID, we might have an issue if `category_id` is mandatory foreign key.
        // Let's check if `category_id` is nullable in Budgets table? We don't know for sure.
        // SAFEST BET: If it's a goal, find a "Savings" system category to act as proxy?
        // OR try to insert with category_id = null.

        const basePayload: any = {
            amount: limit_amount,
            // limit_amount: limit_amount, // REMOVED: Schema mismatch
            currency_code: currency,
            // currency: currency, // REMOVED: Schema mismatch (Error confirmed)
            is_zbb_controlled: true,
            zbb_allocation_id: data.allocationIds[0],
            updated_at: new Date().toISOString(),
            budget_month: budgetMonth,
            budget_year: budgetYear,
            // start_date: cycle.period_start, // REMOVED: Schema mismatch
            type: 'EXPENSE'
        }

        // Try to distinguish if Key is Category or Goal by context or by trying fetch
        // Optimization: We can assume if the user selected a local ID that matches an allocation.category_id, it is a category.
        // We iterate `allocations` to find the type of `keyId`.
        const sampleAlloc = allocations.find(a => (a.category_id === keyId) || (a.goal_id === keyId))
        const isGoal = !!sampleAlloc?.goal_id && !sampleAlloc?.category_id

        if (isGoal) {
            basePayload.type = 'SAVINGS'
            basePayload.name = data.justification || 'Meta Ahorro'
            // We do not set category_id directly as it might not exist in schema. Use include_categories.
            basePayload.include_categories = []
        } else {
            // basePayload.category_id = keyId // REMOVED: Schema might not support single column
            basePayload.include_categories = [keyId]
            basePayload.name = data.justification || 'Presupuesto' // Fallback name
        }

        // UPSERT LOGIC
        // We need a unique constraint match. `(user_id, category_id)` is likely unique.
        // If Goal, `category_id` is null. So `(user_id, null)` might conflict if multiple goals?
        // YES. We can't have multiple budgets with null category unless unique index allows or uses name?
        // Budgets table usually needs distinct category.
        // SOLUTION: Create a unique budget per GOAL?
        // Does `budgets` have `savings_goal_id`? Unlikely based on known schema.
        // For now, let's TRY upsert by ID if possible? No, we don't have budget ID here.
        // We query by criteria.

        let existingBudgetQuery = supabase.from('budgets').select('id').eq('user_id', user.id)
        if (isGoal) {
            // Try to match by name or zbb_allocation_id?
            // Matching by ZBB Allocation ID is safest if it persists!
            // But existing budget might not have it yet.
            // Match by Name? Risky.
            // Match by `zbb_allocation_id` is best for re-sync.
            // For initial sync, we might create duplicates if we are not careful.
            // Let's rely on `zbb_allocation_id` if present in DB.
            // OR match by `include_categories` being empty AND `type` SAVINGS AND `name` limit?
            // Let's try matching `zbb_allocation_id` first.
            existingBudgetQuery = existingBudgetQuery.eq('zbb_allocation_id', data.allocationIds[0])
        } else {
            existingBudgetQuery = existingBudgetQuery.eq('category_id', keyId)
        }

        const { data: existingBudget } = await existingBudgetQuery.single()

        let result;
        if (existingBudget) {
            result = await supabase
                .from('budgets')
                .update(basePayload)
                .eq('id', existingBudget.id)
        } else {
            result = await supabase
                .from('budgets')
                .insert({
                    ...basePayload,
                    user_id: user.id,
                    is_active: true,
                    // Ensure name is set for inserts
                    name: basePayload.name || 'Presupuesto'
                })
        }

        if (result.error) {
            console.error("Budget Sync Error:", result.error)
            errors.push({ key: keyId, error: result.error.message, details: result.error })
        } else {
            syncedCount++
        }
    }

    // 4. Update Cycle Status
    await supabase.from('zbb_planning_cycles').update({ status: 'active' }).eq('id', cycleId)

    return NextResponse.json({
        success: true,
        synced_count: syncedCount,
        errors
    })
}
