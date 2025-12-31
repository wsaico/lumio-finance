import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const contributeSchema = z.object({
    goalId: z.string().uuid(),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    date: z.string().optional(),
    notes: z.string().optional(),
    transactionId: z.string().uuid().optional().nullable()
})

// Helper to check and award milestones
async function checkAndAwardMilestone(supabase: any, goalId: string) {
    // Get current goal state
    const { data: goal } = await supabase
        .from('savings_goals')
        .select('target_amount, current_amount')
        .eq('id', goalId)
        .single()

    if (!goal) return null

    const progress = (goal.current_amount / goal.target_amount) * 100
    let milestoneType = null

    if (progress >= 100) {
        milestoneType = 'COMPLETED'
    } else if (progress >= 75) {
        milestoneType = '75_PERCENT'
    } else if (progress >= 50) {
        milestoneType = '50_PERCENT'
    } else if (progress >= 25) {
        milestoneType = '25_PERCENT'
    }

    if (milestoneType) {
        // Try to insert milestone (will be ignored if already exists due to UNIQUE constraint)
        await supabase
            .from('goal_milestones')
            .insert({
                goal_id: goalId,
                milestone_type: milestoneType,
                amount_at_achievement: goal.current_amount
            })
            .select()
            .single()

        // If completed, update goal status
        if (milestoneType === 'COMPLETED') {
            await supabase
                .from('savings_goals')
                .update({
                    status: 'COMPLETED',
                    completed_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', goalId)
        }

        return milestoneType
    }

    return null
}

// POST /api/savings-goals/contribute
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = contributeSchema.parse(body)

        // Verify goal belongs to user
        const { data: goal, error: goalError } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', validatedData.goalId)
            .eq('user_id', user.id)
            .single()

        if (goalError || !goal) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Verify transaction belongs to user if provided
        if (validatedData.transactionId) {
            const { data: transaction } = await supabase
                .from('transactions')
                .select('id')
                .eq('id', validatedData.transactionId)
                .eq('user_id', user.id)
                .single()

            if (!transaction) {
                return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
            }
        }

        // Create contribution
        const { data: contribution, error: contributionError } = await supabase
            .from('goal_contributions')
            .insert({
                goal_id: validatedData.goalId,
                user_id: user.id,
                amount: validatedData.amount,
                contribution_date: validatedData.date || new Date().toISOString().split('T')[0],
                notes: validatedData.notes,
                transaction_id: validatedData.transactionId
            })
            .select()
            .single()

        if (contributionError) {
            console.error('Error creating contribution:', contributionError)
            return NextResponse.json({ error: 'Error al crear la contribución' }, { status: 500 })
        }

        // Update goal current_amount and total_contributions
        const newCurrentAmount = Number(goal.current_amount) + validatedData.amount
        const { error: updateError } = await supabase
            .from('savings_goals')
            .update({
                current_amount: newCurrentAmount,
                total_contributions: goal.total_contributions + 1
            })
            .eq('id', validatedData.goalId)

        if (updateError) {
            console.error('Error updating goal:', updateError)
            return NextResponse.json({ error: 'Error al actualizar la meta' }, { status: 500 })
        }

        // Check and award milestones
        const milestoneAchieved = await checkAndAwardMilestone(supabase, validatedData.goalId)

        // Get updated goal
        const { data: updatedGoal } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', validatedData.goalId)
            .single()

        return NextResponse.json({
            message: 'Contribución agregada exitosamente',
            contribution,
            goal: updatedGoal,
            milestoneAchieved
        }, { status: 201 })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in POST /api/savings-goals/contribute:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
