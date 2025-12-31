import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const transferContributeSchema = z.object({
    goalId: z.string().uuid(),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid().optional().nullable(),
    date: z.string().optional(),
    notes: z.string().optional()
})

// POST /api/savings-goals/transfer-and-contribute
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = transferContributeSchema.parse(body)

        // Verify goal belongs to user
        const { data: goal, error: goalError } = await supabase
            .from('savings_goals')
            .select('*, primary_account:accounts!primary_account_id(id)')
            .eq('id', validatedData.goalId)
            .eq('user_id', user.id)
            .single()

        if (goalError || !goal) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Determine toAccountId (use goal's primary account if not provided)
        const toAccountId = validatedData.toAccountId || goal.primary_account_id

        if (!toAccountId) {
            return NextResponse.json({
                error: 'La meta no tiene cuenta vinculada. Especifica una cuenta destino.'
            }, { status: 400 })
        }

        // Verify both accounts belong to user
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
            .in('id', [validatedData.fromAccountId, toAccountId])

        if (!accounts || accounts.length !== 2) {
            return NextResponse.json({ error: 'Una o ambas cuentas no encontradas' }, { status: 404 })
        }

        const transactionDate = validatedData.date || new Date().toISOString().split('T')[0]

        // Create transfer transaction
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                type: 'TRANSFER',
                amount: validatedData.amount,
                date: transactionDate,
                description: `Transferencia a meta: ${goal.name}`,
                notes: validatedData.notes,
                from_account_id: validatedData.fromAccountId,
                to_account_id: toAccountId,
                status: 'COMPLETED'
            })
            .select()
            .single()

        if (transactionError) {
            console.error('Error creating transaction:', transactionError)
            return NextResponse.json({ error: 'Error al crear la transferencia' }, { status: 500 })
        }

        // Create contribution linked to transaction
        const { data: contribution, error: contributionError } = await supabase
            .from('goal_contributions')
            .insert({
                goal_id: validatedData.goalId,
                user_id: user.id,
                amount: validatedData.amount,
                contribution_date: transactionDate,
                notes: validatedData.notes,
                transaction_id: transaction.id
            })
            .select()
            .single()

        if (contributionError) {
            console.error('Error creating contribution:', contributionError)
            // Rollback transaction
            await supabase.from('transactions').delete().eq('id', transaction.id)
            return NextResponse.json({ error: 'Error al crear la contribución' }, { status: 500 })
        }

        // Update goal
        const newCurrentAmount = Number(goal.current_amount) + validatedData.amount
        await supabase
            .from('savings_goals')
            .update({
                current_amount: newCurrentAmount,
                total_contributions: goal.total_contributions + 1
            })
            .eq('id', validatedData.goalId)

        // Get updated goal
        const { data: updatedGoal } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', validatedData.goalId)
            .single()

        return NextResponse.json({
            message: 'Transferencia y contribución exitosa',
            transaction,
            contribution,
            goal: updatedGoal
        }, { status: 201 })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in POST /api/savings-goals/transfer-and-contribute:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
