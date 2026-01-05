export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateContributionSchema = z.object({
    amount: z.number().positive().optional(),
    contributionDate: z.string().optional(),
    notes: z.string().optional()
})

// PATCH /api/savings-goals/contributions/[id]
export async function PATCH(
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

        const body = await request.json()
        const validatedData = updateContributionSchema.parse(body)

        const contributionId = params.id

        // Verify contribution exists and belongs to user's goal
        const { data: contribution } = await supabase
            .from('goal_contributions')
            .select('goal_id, goal:savings_goals(user_id)')
            .eq('id', contributionId)
            .single()

        if (!contribution || contribution.goal?.user_id !== user.id) {
            return NextResponse.json({ error: 'Contribución no encontrada' }, { status: 404 })
        }

        // Update contribution
        const updates: any = {}
        if (validatedData.amount !== undefined) updates.amount = validatedData.amount
        if (validatedData.contributionDate) updates.contribution_date = validatedData.contributionDate
        if (validatedData.notes !== undefined) updates.notes = validatedData.notes

        const { data: updated, error } = await supabase
            .from('goal_contributions')
            .update(updates)
            .eq('id', contributionId)
            .select()
            .single()

        if (error) {
            console.error('Error updating contribution:', error)
            return NextResponse.json({ error: 'Error al actualizar la contribución' }, { status: 500 })
        }

        // Recalculate total amount for the goal
        const { data: totalData } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', contribution.goal_id)

        const totalAmount = totalData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0

        // Update savings goal
        await supabase
            .from('savings_goals')
            .update({
                current_amount: totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', contribution.goal_id)

        // Check for milestones (Simplified check, ideally use DB function)
        const goal = contribution.goal as any
        const progress = (totalAmount / Number(goal.target_amount)) * 100
        if (progress >= 100 && goal.status !== 'COMPLETED') {
            await supabase
                .from('savings_goals')
                .update({
                    status: 'COMPLETED',
                    completed_date: new Date().toISOString()
                })
                .eq('id', contribution.goal_id)
        }

        return NextResponse.json({ contribution: updated })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in PATCH /api/savings-goals/contributions/[id]:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}

// DELETE /api/savings-goals/contributions/[id]
export async function DELETE(
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

        const contributionId = params.id

        // Verify contribution exists and belongs to user's goal
        const { data: contribution } = await supabase
            .from('goal_contributions')
            .select('goal_id, goal:savings_goals(user_id)')
            .eq('id', contributionId)
            .single()

        if (!contribution || contribution.goal?.user_id !== user.id) {
            return NextResponse.json({ error: 'Contribución no encontrada' }, { status: 404 })
        }

        // Delete contribution
        const { error } = await supabase
            .from('goal_contributions')
            .delete()
            .eq('id', contributionId)

        if (error) {
            console.error('Error deleting contribution:', error)
            return NextResponse.json({ error: 'Error al eliminar la contribución' }, { status: 500 })
        }

        // Recalculate total amount for the goal
        const { data: totalData } = await supabase
            .from('goal_contributions')
            .select('amount')
            .eq('goal_id', contribution.goal_id)

        const totalAmount = totalData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0

        // Update savings goal
        await supabase
            .from('savings_goals')
            .update({
                current_amount: totalAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', contribution.goal_id)

        return NextResponse.json({ message: 'Contribución eliminada exitosamente' })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('Error in DELETE /api/savings-goals/contributions/[id]:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
