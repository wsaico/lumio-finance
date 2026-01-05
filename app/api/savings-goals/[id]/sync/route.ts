export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/savings-goals/[id]/sync
export async function POST(
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

        // Verify goal exists and belongs to user
        const { data: goal } = await supabase
            .from('savings_goals')
            .select('user_id, target_amount, status')
            .eq('id', goalId)
            .single()

        if (!goal || goal.user_id !== user.id) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Calculate total contributions
        const { data: contributions } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', goalId)

        const totalAmount = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0

        // Calculate progress and status
        let newStatus = goal.status
        const progress = (totalAmount / Number(goal.target_amount)) * 100

        if (progress >= 100 && goal.status !== 'COMPLETED') {
            newStatus = 'COMPLETED'
        } else if (progress < 100 && goal.status === 'COMPLETED') {
            newStatus = 'ACTIVE' // Revert to active if below 100%
        }

        // Update goal
        const { data: updatedGoal, error } = await supabase
            .from('savings_goals')
            .update({
                current_amount: totalAmount,
                status: newStatus,
                updated_at: new Date().toISOString(),
                completed_date: newStatus === 'COMPLETED' ? new Date().toISOString() : null
            })
            .eq('id', goalId)
            .select()
            .single()

        if (error) {
            console.error('Error syncing goal:', error)
            return NextResponse.json({ error: 'Error al sincronizar la meta' }, { status: 500 })
        }

        return NextResponse.json({ goal: updatedGoal })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('Error in POST /api/savings-goals/[id]/sync:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
