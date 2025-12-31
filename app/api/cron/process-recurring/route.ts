import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TransactionService } from '@/lib/services/transaction-service'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow running in dev without secret if needed, or strictly enforce
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
    }

    const supabase = await createClient()

    try {
        const now = new Date()

        // 1. Fetch Due Recurring Rules
        // We look for rules where next execution date (implied) is due.
        // Since we store last_executed_date, we need to calculate next date in JS or use complex SQL.
        // For simplicity: Fetch ALL active rules and filter in code. 
        // OPTIMIZATION: In production with thousands of rules, use a SQL function or generated column 'next_execution_date'.

        const { data: rules, error } = await supabase
            .from('recurring_rules')
            .select('*')
            .eq('is_active', true)

        if (error) throw error

        let processedCount = 0
        const results = []

        for (const rule of rules) {
            const lastExecuted = new Date(rule.last_executed_date || rule.start_date)
            let nextDue = new Date(lastExecuted)

            // Calculate Next Due Date based on Frequency
            switch (rule.frequency) {
                case 'DAILY':
                    nextDue.setDate(lastExecuted.getDate() + 1)
                    break
                case 'WEEKLY':
                    nextDue.setDate(lastExecuted.getDate() + 7)
                    break
                case 'BIWEEKLY':
                    nextDue.setDate(lastExecuted.getDate() + 14)
                    break
                case 'MONTHLY':
                    nextDue.setMonth(lastExecuted.getMonth() + 1)
                    break
                case 'YEARLY':
                    nextDue.setFullYear(lastExecuted.getFullYear() + 1)
                    break
                default:
                    // Default to Monthly safeguard
                    nextDue.setMonth(lastExecuted.getMonth() + 1)
            }

            // Check if it's due (Next Due <= Now)
            if (nextDue <= now) {
                // Check End Date
                if (rule.end_date && new Date(rule.end_date) < now) {
                    // Expired - Deactivate
                    await supabase.from('recurring_rules').update({ is_active: false }).eq('id', rule.id)
                    continue
                }

                if (rule.execution_method === 'MANUAL') {
                    // MANUAL: Create Reminder Notification
                    await supabase.from('notifications').insert({
                        user_id: rule.user_id,
                        type: 'REMINDER',
                        title: 'Recordatorio de Pago',
                        message: `Es hora de pagar ${rule.description} (${Number(rule.amount).toFixed(2)})`,
                        data: {
                            ruleId: rule.id,
                            actionUrl: `/dashboard/transactions/new?mode=RECURRING&ruleId=${rule.id}` // TODO: Implement pre-fill logic in frontend
                        }
                    })

                    // Update Last Executed to avoid spam (we consider the reminder as "execution" of the interval)
                    await supabase.from('recurring_rules').update({
                        last_executed_date: now.toISOString()
                    }).eq('id', rule.id)

                    processedCount++
                    results.push({ ruleId: rule.id, status: 'reminder_sent' })

                } else {
                    // AUTO: Execute Transaction
                    try {
                        const transaction = await TransactionService.processTransaction(supabase, {
                            userId: rule.user_id,
                            accountId: rule.account_id,
                            type: rule.transaction_type as any,
                            amount: Number(rule.amount),
                            currency: 'USD',
                            transactionDate: now.toISOString(),
                            description: rule.description || 'Pago Recurrente Automático',
                            notes: `Generado automáticamente por regla recurrente (${rule.frequency})`,
                            categoryId: rule.transaction_type === 'EXPENSE' ? rule.expense_category_id : rule.income_category_id,
                            subcategoryId: rule.subcategory_id,
                            recurringRuleId: rule.id,
                            metadata: { mode: 'AUTO_GENERATED' }
                        })

                        // Create Success Notification
                        await supabase.from('notifications').insert({
                            user_id: rule.user_id,
                            type: 'SUCCESS',
                            title: 'Pago Automático Exitoso',
                            message: `Se ha registrado tu pago de ${rule.description} por ${Number(rule.amount).toFixed(2)}`,
                            data: { transactionId: transaction.id }
                        })

                        // Update Last Executed
                        await supabase.from('recurring_rules').update({
                            last_executed_date: now.toISOString()
                        }).eq('id', rule.id)

                        processedCount++
                        results.push({ ruleId: rule.id, status: 'success', transactionId: transaction.id })

                    } catch (txError) {
                        console.error(`Failed to process rule ${rule.id}`, txError)
                        results.push({ ruleId: rule.id, status: 'error', error: txError })

                        // Create Failure Notification
                        await supabase.from('notifications').insert({
                            user_id: rule.user_id,
                            type: 'WARNING',
                            title: 'Fallo en Pago Automático',
                            message: `No pudimos procesar el pago de ${rule.description}. Por favor revisa tu saldo.`,
                            data: { ruleId: rule.id, error: String(txError) }
                        })
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedCount,
            results
        })

    } catch (error: any) {
        console.error('[CRON_RECURRING]', error)
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
    }
}
