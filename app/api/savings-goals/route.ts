export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const createGoalSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    description: z.string().optional(),
    goalType: z.enum(['EMERGENCY', 'TRAVEL', 'PURCHASE', 'INVESTMENT', 'OTHER']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
    targetAmount: z.number().positive('El monto objetivo debe ser mayor a 0'),
    currency: z.string().default('PEN'),
    primaryAccountId: z.string().uuid().optional().nullable(),
    targetDate: z.string(), // ISO date string
    icon: z.string().default('target'),
    color: z.string().default('#f97316')
})

const updateGoalSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    targetAmount: z.number().positive().optional(),
    primaryAccountId: z.string().uuid().optional().nullable(),
    targetDate: z.string().optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
    icon: z.string().optional(),
    color: z.string().optional()
})

// Helper function to calculate goal metrics
function calculateGoalMetrics(goal: any) {
    const progress = goal.target_amount > 0
        ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
        : 0

    const today = new Date()
    const targetDate = new Date(goal.target_date)
    const startDate = new Date(goal.start_date)

    const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30))

    const amountRemaining = Math.max(0, goal.target_amount - goal.current_amount)
    const monthlyNeeded = monthsRemaining > 0 ? amountRemaining / monthsRemaining : 0

    // Calculate average monthly contribution
    const monthsElapsed = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const avgMonthlyContribution = goal.current_amount / monthsElapsed

    // Predict completion date based on current pace
    let predictedCompletionDate = null
    if (avgMonthlyContribution > 0 && amountRemaining > 0) {
        const monthsToComplete = amountRemaining / avgMonthlyContribution
        predictedCompletionDate = new Date(today.getTime() + monthsToComplete * 30 * 24 * 60 * 60 * 1000)
    }

    const isOnTrack = avgMonthlyContribution >= monthlyNeeded

    return {
        ...goal,
        progress: Math.round(progress * 100) / 100,
        daysRemaining,
        monthsRemaining,
        amountRemaining,
        monthlyNeeded: Math.round(monthlyNeeded * 100) / 100,
        avgMonthlyContribution: Math.round(avgMonthlyContribution * 100) / 100,
        predictedCompletionDate,
        isOnTrack
    }
}

// GET /api/savings-goals
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const type = searchParams.get('type')
        const accountId = searchParams.get('accountId')

        let query = supabase
            .from('savings_goals')
            .select(`
                *,
                primary_account:accounts!primary_account_id (
                    id,
                    name,
                    account_type
                )
            `)
            .eq('user_id', user.id)

        if (status) {
            query = query.eq('status', status)
        }
        if (type) {
            query = query.eq('goal_type', type)
        }
        if (accountId) {
            query = query.eq('primary_account_id', accountId)
        }

        query = query.order('created_at', { ascending: false })

        const { data: goals, error } = await query

        if (error) {
            console.error('Error fetching savings goals:', error)
            return NextResponse.json({ error: 'Error al obtener las metas' }, { status: 500 })
        }

        // Calculate metrics for each goal
        const goalsWithMetrics = goals.map(calculateGoalMetrics)

        return NextResponse.json({ goals: goalsWithMetrics })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('Error in GET /api/savings-goals:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}

// POST /api/savings-goals
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = createGoalSchema.parse(body)

        // Validate account belongs to user if provided
        if (validatedData.primaryAccountId) {
            const { data: account } = await supabase
                .from('accounts')
                .select('id')
                .eq('id', validatedData.primaryAccountId)
                .eq('user_id', user.id)
                .single()

            if (!account) {
                return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
            }
        }

        // Validate target date is in the future
        const targetDate = new Date(validatedData.targetDate)
        if (targetDate <= new Date()) {
            return NextResponse.json({ error: 'La fecha objetivo debe ser futura' }, { status: 400 })
        }

        const { data: goal, error } = await supabase
            .from('savings_goals')
            .insert({
                user_id: user.id,
                name: validatedData.name,
                description: validatedData.description,
                goal_type: validatedData.goalType,
                priority: validatedData.priority,
                target_amount: validatedData.targetAmount,
                currency: validatedData.currency,
                primary_account_id: validatedData.primaryAccountId,
                target_date: validatedData.targetDate,
                icon: validatedData.icon,
                color: validatedData.color
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating savings goal:', error)
            return NextResponse.json({ error: 'Error al crear la meta' }, { status: 500 })
        }

        const goalWithMetrics = calculateGoalMetrics(goal)

        return NextResponse.json({
            message: 'Meta creada exitosamente',
            goal: goalWithMetrics
        }, { status: 201 })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in POST /api/savings-goals:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}

// PATCH /api/savings-goals
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = updateGoalSchema.parse(body)

        const { id, ...updates } = validatedData

        // Validate account belongs to user if provided
        if (updates.primaryAccountId) {
            const { data: account } = await supabase
                .from('accounts')
                .select('id')
                .eq('id', updates.primaryAccountId)
                .eq('user_id', user.id)
                .single()

            if (!account) {
                return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
            }
        }

        // Convert camelCase to snake_case for database
        const dbUpdates: any = {}
        if (updates.name) dbUpdates.name = updates.name
        if (updates.description !== undefined) dbUpdates.description = updates.description
        if (updates.priority) dbUpdates.priority = updates.priority
        if (updates.targetAmount) dbUpdates.target_amount = updates.targetAmount
        if (updates.primaryAccountId !== undefined) dbUpdates.primary_account_id = updates.primaryAccountId
        if (updates.targetDate) dbUpdates.target_date = updates.targetDate
        if (updates.status) dbUpdates.status = updates.status
        if (updates.icon) dbUpdates.icon = updates.icon
        if (updates.color) dbUpdates.color = updates.color

        const { data: goal, error } = await supabase
            .from('savings_goals')
            .update(dbUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('Error updating savings goal:', error)
            return NextResponse.json({ error: 'Error al actualizar la meta' }, { status: 500 })
        }

        if (!goal) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        const goalWithMetrics = calculateGoalMetrics(goal)

        return NextResponse.json({
            message: 'Meta actualizada exitosamente',
            goal: goalWithMetrics
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in PATCH /api/savings-goals:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}

// DELETE /api/savings-goals
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID de meta requerido' }, { status: 400 })
        }

        // Soft delete - set status to CANCELLED
        const { data: goal, error } = await supabase
            .from('savings_goals')
            .update({ status: 'CANCELLED' })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('Error deleting savings goal:', error)
            return NextResponse.json({ error: 'Error al eliminar la meta' }, { status: 500 })
        }

        if (!goal) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        return NextResponse.json({
            message: 'Meta eliminada exitosamente',
            goal
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('Error in DELETE /api/savings-goals:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
