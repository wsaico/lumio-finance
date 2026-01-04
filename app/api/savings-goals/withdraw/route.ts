import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const withdrawSchema = z.object({
    goalId: z.string().uuid(),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    fromAccountId: z.string().uuid().optional(),
    toAccountId: z.string().uuid(),
    date: z.string().optional(),
    notes: z.string().optional()
})

// POST /api/savings-goals/withdraw
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validatedData = withdrawSchema.parse(body)

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

        // Check if there are enough funds
        if (Number(goal.current_amount) < validatedData.amount) {
            return NextResponse.json({
                error: 'Fondos insuficientes en la meta para realizar este retiro'
            }, { status: 400 })
        }

        // Determine fromAccountId (User selection > Goal Primary Account)
        const fromAccountId = validatedData.fromAccountId || goal.primary_account_id

        if (!fromAccountId) {
            return NextResponse.json({
                error: 'Debes seleccionar una cuenta de origen ya que esta meta no tiene una vinculada automáticamente.'
            }, { status: 400 })
        }

        // Verify both accounts belong to user
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)
            .in('id', [fromAccountId, validatedData.toAccountId])

        if (!accounts || accounts.length !== 2) {
            const missingAccount = accounts?.find(a => a.id === fromAccountId)
                ? 'Cuenta destino no encontrada'
                : 'Cuenta de origen (vinculada a la meta) no encontrada'
            return NextResponse.json({ error: missingAccount }, { status: 404 })
        }

        const transactionDate = validatedData.date || new Date().toISOString().split('T')[0]

        // Create transaction (TRANSFER: Goal Account -> Destination Account)
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                transaction_type: 'TRANSFER',
                amount: validatedData.amount,
                transaction_date: transactionDate,
                description: `Retiro de meta: ${goal.name}`,
                notes: validatedData.notes,
                account_id: fromAccountId,
                transfer_to_account_id: validatedData.toAccountId,
                currency_code: goal.currency || 'PEN',
                savings_goal_id: goal.id
            })
            .select()
            .single()

        if (transactionError) {
            console.error('Error creating transaction:', transactionError)
            return NextResponse.json({ error: 'Error al crear la transferencia de retiro' }, { status: 500 })
        }

        // Create contribution record to track withdrawal history
        // Note: We use positive amount because the table has CHECK (amount > 0)
        // The goal's current_amount is decremented separately below
        const { data: contribution, error: contributionError } = await supabase
            .from('goal_contributions')
            .insert({
                goal_id: validatedData.goalId,
                user_id: user.id,
                amount: validatedData.amount, // Positive amount (constraint requirement)
                contribution_date: transactionDate,
                notes: `RETIRO: ${validatedData.notes || 'Retiro de fondos'}`,
                transaction_id: transaction.id
            })
            .select()
            .single()

        if (contributionError) {
            console.error('Error creating contribution record:', contributionError)
            // Rollback transaction
            await supabase.from('transactions').delete().eq('id', transaction.id)
            return NextResponse.json({ error: 'Error al registrar el retiro en la meta' }, { status: 500 })
        }

        // Update goal amount (Subtract)
        const newCurrentAmount = Number(goal.current_amount) - validatedData.amount

        // If goal completes (or un-completes?), update status?
        // Usually withdrawals don't complete a goal, but un-completing is possible.
        // For now just update amount.

        const { error: updateError } = await supabase
            .from('savings_goals')
            .update({
                current_amount: newCurrentAmount,
                // We don't increment total_contributions count for withdrawals, or maybe we do? 
                // Let's leave it as is for now.
            })
            .eq('id', validatedData.goalId)

        if (updateError) {
            console.error('Error updating goal amount:', updateError)
        }

        // Get updated goal
        const { data: updatedGoal } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', validatedData.goalId)
            .single()

        return NextResponse.json({
            message: 'Retiro realizado exitosamente',
            transaction,
            contribution,
            goal: updatedGoal
        }, { status: 201 })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in POST /api/savings-goals/withdraw:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
