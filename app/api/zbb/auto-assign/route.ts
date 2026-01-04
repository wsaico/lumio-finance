import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// AUTO-ASSIGN LOGIC
// 1. Savings Goals: Prioritize 'monthlyNeeded'.
// 2. Regular Categories: Use 'Average Spent (3 months)' as a baseline.
// 3. Do not exceed RTA.

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { cycleId, strategy = 'BALANCED' } = body

        // 1. Get Current Cycle & Allocations
        const { data: allocations, error: allocError } = await supabase
            .from('zbb_allocations')
            .select(`
                id, 
                allocated_amount_pen,
                allocated_amount_usd,
                category_id, 
                goal_id,
                savings_goal:savings_goals(id, target_amount, current_amount, target_date, start_date, currency)
            `)
            .eq('cycle_id', cycleId)

        if (allocError) throw allocError

        // 2. Get RTA (Ready to Assign)
        const { data: cycle } = await supabase
            .from('zbb_planning_cycles')
            .select('total_income_pen, total_income_usd, assigned_amount_pen, assigned_amount_usd')
            .eq('id', cycleId)
            .single()

        let rtaPEN = (cycle?.total_income_pen || 0)
        let rtaUSD = (cycle?.total_income_usd || 0)

        // Calculate Assigned Real-Time from Allocations to avoid Trigger Sync issues
        const assignedPEN = allocations.reduce((sum, item) => sum + (Number(item.allocated_amount_pen) || 0), 0)
        const assignedUSD = allocations.reduce((sum, item) => sum + (Number(item.allocated_amount_usd) || 0), 0)

        rtaPEN -= assignedPEN
        rtaUSD -= assignedUSD

        if (rtaPEN <= 0 && rtaUSD <= 0) {
            return NextResponse.json({
                message: 'No funds available to assign',
                assignedCount: 0,
                remainingRTAPEN: rtaPEN,
                remainingRTAUSD: rtaUSD,
                debug: {
                    incomePEN: cycle?.total_income_pen,
                    incomeUSD: cycle?.total_income_usd,
                    assignedPEN,
                    assignedUSD,
                    allocationsCount: allocations.length
                }
            })
        }

        const updates = []

        // 3. Iterate and Calculate Needs
        for (const alloc of allocations) {
            let suggestedAmount = 0

            // STRATEGY A: SAVINGS GOALS (Top Priority)
            if (alloc.goal_id && alloc.savings_goal) {
                // Supabase join might return array or object depending on relation type inference. Safety check.
                const rawGoal = alloc.savings_goal as any
                const goal = Array.isArray(rawGoal) ? rawGoal[0] : rawGoal

                if (!goal) continue

                // Check currency from goal
                const currency = goal.currency || 'PEN'
                const isPEN = currency === 'PEN'

                // Check available RTA for this currency (Re-evaluate here as currency depends on goal)
                let availableRTA = isPEN ? rtaPEN : rtaUSD
                if (availableRTA <= 0) continue

                const currentAssigned = isPEN ? alloc.allocated_amount_pen : alloc.allocated_amount_usd

                // Calculate monthly needed
                const today = new Date()
                const targetDate = new Date(goal.target_date)
                const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
                const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30))
                const amountRemaining = Math.max(0, goal.target_amount - goal.current_amount)

                const monthlyNeeded = monthsRemaining > 0 ? amountRemaining / monthsRemaining : amountRemaining

                // If already assigned enough, skip
                if (currentAssigned >= monthlyNeeded) continue

                // Assign valid portion
                const needed = monthlyNeeded - currentAssigned
                suggestedAmount = needed

                if (suggestedAmount > 0) {
                    const actualAssign = Math.min(suggestedAmount, availableRTA)

                    // Update specific currency column
                    updates.push({
                        id: alloc.id,
                        allocated_amount_pen: isPEN ? (alloc.allocated_amount_pen + actualAssign) : alloc.allocated_amount_pen,
                        allocated_amount_usd: !isPEN ? (alloc.allocated_amount_usd + actualAssign) : alloc.allocated_amount_usd
                    })

                    // Deduct from temporary RTA
                    if (isPEN) rtaPEN -= actualAssign
                    else rtaUSD -= actualAssign
                }
            }
        }

        // 4. Batch Update
        // Note: Supposedly Supabase/PostgREST doesn't support bulk update with different values easily in one REST call 
        // without custom function or upsert with PK.
        // We will loop for safety as these are usually < 20 rows.
        let updatedCount = 0
        if (updates.length > 0) {
            for (const update of updates) {
                await supabase
                    .from('zbb_allocations')
                    .update({
                        allocated_amount_pen: update.allocated_amount_pen,
                        allocated_amount_usd: update.allocated_amount_usd
                    })
                    .eq('id', update.id)
                updatedCount++
            }
        }

        return NextResponse.json({
            success: true,
            assignedCount: updatedCount,
            remainingRTAPEN: rtaPEN,
            remainingRTAUSD: rtaUSD
        })

    } catch (error: any) {
        console.error('Auto-Assign Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
