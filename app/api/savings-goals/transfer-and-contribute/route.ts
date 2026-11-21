export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TransactionService } from '@/lib/services/transaction-service'
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
            .select('*, primary_account:accounts!primary_account_id(id, currency_code)')
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
                error: 'La meta no tiene cuenta vinculada. Selecciona una cuenta destino.'
            }, { status: 400 })
        }

        if (validatedData.fromAccountId === toAccountId) {
            return NextResponse.json({
                error: 'La cuenta origen y la cuenta destino deben ser diferentes'
            }, { status: 400 })
        }

        // Fetch both accounts to validate ownership and balance
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id, name, current_balance, currency_code, account_type')
            .eq('user_id', user.id)
            .in('id', [validatedData.fromAccountId, toAccountId])

        if (!accounts || accounts.length !== 2) {
            return NextResponse.json({ error: 'Una o ambas cuentas no encontradas' }, { status: 404 })
        }

        const fromAccount = accounts.find((a) => a.id === validatedData.fromAccountId)!
        if (fromAccount.account_type !== 'CREDIT_CARD' && Number(fromAccount.current_balance) < validatedData.amount) {
            return NextResponse.json({
                error: `Saldo insuficiente en "${fromAccount.name}"`
            }, { status: 400 })
        }

        const isoDate = validatedData.date
            ? new Date(validatedData.date).toISOString()
            : new Date().toISOString()
        const dateOnly = isoDate.split('T')[0]

        // 1. Create transfer transaction and update account balances via TransactionService
        const transaction = await TransactionService.processTransaction(supabase, {
            userId: user.id,
            type: 'TRANSFER',
            accountId: validatedData.fromAccountId,
            transferToAccountId: toAccountId,
            amount: validatedData.amount,
            currency: fromAccount.currency_code || goal.currency || 'PEN',
            transactionDate: isoDate,
            description: `Aporte a meta: ${goal.name}`,
            notes: validatedData.notes,
            savingsGoalId: validatedData.goalId,
            metadata: {
                isSavingsContribution: true,
                savingsGoalId: validatedData.goalId,
            },
        })

        // 2. Create contribution linked to transaction
        const { data: contribution, error: contributionError } = await supabase
            .from('goal_contributions')
            .insert({
                goal_id: validatedData.goalId,
                user_id: user.id,
                amount: validatedData.amount,
                contribution_date: dateOnly,
                notes: validatedData.notes,
                transaction_id: transaction.id
            })
            .select()
            .single()

        if (contributionError) {
            console.error('Error creating contribution:', contributionError)
            return NextResponse.json({ error: 'Error al registrar la contribución' }, { status: 500 })
        }

        // 3. Update goal progress & auto-complete if reached 100%
        const newCurrentAmount = Number(goal.current_amount || 0) + validatedData.amount
        const isNowCompleted = newCurrentAmount >= Number(goal.target_amount || 0)

        await supabase
            .from('savings_goals')
            .update({
                current_amount: newCurrentAmount,
                total_contributions: Number(goal.total_contributions || 0) + 1,
                ...(isNowCompleted && goal.status !== 'COMPLETED'
                    ? { status: 'COMPLETED', completed_date: dateOnly }
                    : {}),
            })
            .eq('id', validatedData.goalId)

        const { data: updatedGoal } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('id', validatedData.goalId)
            .single()

        return NextResponse.json({
            message: 'Aporte y transferencia registrados con éxito',
            transaction,
            contribution,
            goal: updatedGoal
        }, { status: 201 })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
        }
        console.error('Error in POST /api/savings-goals/transfer-and-contribute:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
