import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/savings-goals/[id]
// Next.js 16: params is now a Promise
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const goalId = params.id

        // Simple query without joins first
        const { data: goals, error } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', goalId)
            .eq('user_id', user.id)

        if (error) {
            console.error('[GOAL_DETAILS] Database error:', error)
            return NextResponse.json({ error: 'Error de base de datos: ' + error.message }, { status: 500 })
        }

        const goal = goals?.[0]

        if (!goal) {
            return NextResponse.json({
                error: 'Meta no encontrada',
                debug: { goalId, userId: user.id }
            }, { status: 404 })
        }

        // Calculate simple metrics
        const targetAmount = Number(goal.target_amount)
        const currentAmount = Number(goal.current_amount)
        const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0

        const today = new Date()
        const targetDate = new Date(goal.target_date)
        const startDate = new Date(goal.start_date)

        const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
        const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30))

        const amountRemaining = Math.max(0, targetAmount - currentAmount)
        const monthlyNeeded = amountRemaining / monthsRemaining

        // Calculate average monthly contribution
        const monthsElapsed = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        const avgMonthlyContribution = currentAmount / monthsElapsed

        // Is on track?
        const isOnTrack = avgMonthlyContribution >= monthlyNeeded

        return NextResponse.json({
            goal: {
                ...goal,
                progress: Math.round(progress * 100) / 100,
                daysRemaining,
                monthsRemaining,
                amountRemaining: Math.round(amountRemaining * 100) / 100,
                monthlyNeeded: Math.round(monthlyNeeded * 100) / 100,
                avgMonthlyContribution: Math.round(avgMonthlyContribution * 100) / 100,
                isOnTrack
            }
        })
    } catch (error: any) {
        console.error('[GOAL_DETAILS] Unexpected error:', error)
        return NextResponse.json({
            error: 'Error interno: ' + error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
