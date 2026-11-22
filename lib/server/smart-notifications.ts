import { SupabaseClient } from '@supabase/supabase-js'
import { TransactionService } from '@/lib/services/transaction-service'
import { getCurrencySymbol } from '@/lib/currencies'

function toDateOnly(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diffDays(targetDateStr: string, today: Date): number {
    const clean = targetDateStr.split('T')[0]
    const [y, m, day] = clean.split('-').map(Number)
    if (!y || !m || !day) return 999
    const target = new Date(y, m - 1, day)
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return Math.round((target.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtMoney(amount: number, currencyCode?: string): string {
    const sym = getCurrencySymbol(currencyCode || 'PEN')
    return `${sym} ${Number(amount || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`
}

function getIsoWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export async function processDueRecurringRules(supabase: SupabaseClient, userId?: string) {
    const now = new Date()
    const todayStr = toDateOnly(now)

    let query = supabase
        .from('recurring_rules')
        .select('*')
        .eq('is_active', true)
        .lte('next_occurrence', todayStr)

    if (userId) {
        query = query.eq('user_id', userId)
    }

    const { data: rules, error } = await query
    if (error || !rules || rules.length === 0) {
        return { processed: 0, results: [] as any[] }
    }

    let processed = 0
    const results: any[] = []

    for (const rule of rules) {
        // Check end date expiration
        if (rule.end_date && rule.end_date < todayStr) {
            await supabase
                .from('recurring_rules')
                .update({ is_active: false, updated_at: now.toISOString() })
                .eq('id', rule.id)
            continue
        }

        const occurrenceDate = new Date(`${rule.next_occurrence}T12:00:00`)
        const ruleInterval = Math.max(1, Number(rule.interval || 1))
        const nextOccurrenceDate = TransactionService.calculateNextOccurrence(
            isNaN(occurrenceDate.getTime()) ? now : occurrenceDate,
            rule.frequency || 'MONTHLY',
            ruleInterval
        )
        const nextOccurrenceStr = toDateOnly(nextOccurrenceDate)
        const ruleLabel = rule.description || rule.rule_name || 'Pago recurrente'
        const ruleCurrency = rule.currency_code || 'PEN'

        const rawExec = String(rule.execution_method || 'AUTO')
        const execParts = rawExec.includes('|') ? rawExec.split('|') : ['SUBSCRIPTION', rawExec, '3']
        const ruleMode = execParts[0] || 'SUBSCRIPTION'
        const isManualRule = execParts[1] === 'MANUAL'

        if (isManualRule) {
            await supabase.from('notifications').insert({
                user_id: rule.user_id,
                type: 'REMINDER',
                title: `Vence hoy: ${ruleLabel}`,
                message: `Hoy vence tu ${ruleMode === 'UPCOMING' ? 'pago programado' : 'suscripción'} de ${fmtMoney(Number(rule.amount), ruleCurrency)}. Entra a Suscripciones y Programados para marcarlo como Pagado.`,
                data: {
                    module: 'subscriptions',
                    ruleId: rule.id,
                    dedupeKey: `recurring_manual_${rule.id}_${rule.next_occurrence}`,
                    actionUrl: '/dashboard/subscriptions',
                },
            })

            processed++
            results.push({ ruleId: rule.id, status: 'reminder_sent' })
        } else {
            // AUTO execution
            try {
                const transaction = await TransactionService.processTransaction(supabase, {
                    userId: rule.user_id,
                    accountId: rule.account_id,
                    type: rule.transaction_type as any,
                    amount: Number(rule.amount),
                    currency: ruleCurrency,
                    transactionDate: now.toISOString(),
                    description: ruleLabel,
                    notes: `Registrado automáticamente (${rule.frequency})`,
                    categoryId:
                        rule.transaction_type === 'EXPENSE'
                            ? rule.expense_category_id
                            : rule.income_category_id,
                    subcategoryId: rule.subcategory_id,
                    recurringRuleId: rule.id,
                    metadata: {
                        mode: ruleMode,
                        autoGenerated: true,
                        isPaid: true,
                        recurrence: rule.frequency,
                        recurrenceInterval: ruleInterval,
                        scheduledType: 'AUTO',
                    },
                })

                const isOneTimeUpcoming = ruleMode === 'UPCOMING'
                const reachedEnd = Boolean(rule.end_date && nextOccurrenceStr > rule.end_date)

                await supabase.from('notifications').insert({
                    user_id: rule.user_id,
                    type: 'SUCCESS',
                    title: `Cargo automático: ${ruleLabel}`,
                    message: isOneTimeUpcoming
                        ? `Se registró automáticamente tu pago programado de ${fmtMoney(Number(rule.amount), ruleCurrency)}.`
                        : `Se registró automáticamente ${fmtMoney(Number(rule.amount), ruleCurrency)}. Próximo cobro: ${nextOccurrenceStr}.`,
                    data: {
                        module: 'subscriptions',
                        ruleId: rule.id,
                        transactionId: transaction.id,
                        dedupeKey: `recurring_auto_${rule.id}_${rule.next_occurrence}`,
                        actionUrl: '/dashboard/subscriptions',
                    },
                })

                await supabase
                    .from('recurring_rules')
                    .update({
                        last_executed_at: now.toISOString(),
                        next_occurrence: nextOccurrenceStr,
                        is_active: !isOneTimeUpcoming && !reachedEnd,
                        updated_at: now.toISOString(),
                    })
                    .eq('id', rule.id)

                processed++
                results.push({ ruleId: rule.id, status: 'success', transactionId: transaction.id })
            } catch (txError: any) {
                console.error(`[AUTO_RECURRING_ERROR] rule=${rule.id}`, txError)
                await supabase.from('notifications').insert({
                    user_id: rule.user_id,
                    type: 'WARNING',
                    title: `No se pudo auto-registrar: ${ruleLabel}`,
                    message: `Revisa tu cuenta o saldo para completar el pago de ${fmtMoney(Number(rule.amount), ruleCurrency)}.`,
                    data: {
                        module: 'subscriptions',
                        ruleId: rule.id,
                        dedupeKey: `recurring_fail_${rule.id}_${todayStr}`,
                        actionUrl: '/dashboard/subscriptions',
                    },
                })
                results.push({ ruleId: rule.id, status: 'error', error: String(txError?.message || txError) })
            }
        }
    }

    return { processed, results }
}

/**
 * Smart Notification Engine across ALL modules for the authenticated user.
 * Deduplicates notifications using data.dedupeKey so the user never gets spammed.
 */
export type SmartAlertCategory =
    | 'subscriptions'
    | 'budgets'
    | 'shortfall'
    | 'payments'
    | 'unusual_expense'
    | 'savings'

export async function syncSmartNotifications(
    supabase: SupabaseClient,
    userId: string,
    options?: { mutedTypes?: string[] }
) {
    const now = new Date()
    const todayStr = toDateOnly(now)
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const mutedSet = new Set(options?.mutedTypes || [])

    // 1. Execute any due recurring rules first
    const recurringSummary = await processDueRecurringRules(supabase, userId)

    // 2. Fetch existing notification dedupe keys from the last 35 days
    const sinceDate = new Date(now)
    sinceDate.setDate(sinceDate.getDate() - 35)
    const { data: recentNotifs } = await supabase
        .from('notifications')
        .select('data')
        .eq('user_id', userId)
        .gte('created_at', sinceDate.toISOString())

    const existingKeys = new Set<string>()
    for (const n of recentNotifs || []) {
        const key = (n.data as any)?.dedupeKey
        if (key) existingKeys.add(String(key))
    }

    const toInsert: Array<{
        user_id: string
        type: 'INFO' | 'SUCCESS' | 'WARNING' | 'REMINDER'
        title: string
        message: string
        data: Record<string, any>
    }> = []

    const queueNotif = (
        dedupeKey: string,
        type: 'INFO' | 'SUCCESS' | 'WARNING' | 'REMINDER',
        title: string,
        message: string,
        module: string,
        actionUrl: string,
        extra?: Record<string, any>,
        alertCategory?: SmartAlertCategory
    ) => {
        if (alertCategory && mutedSet.has(alertCategory)) return
        if (existingKeys.has(dedupeKey)) return
        existingKeys.add(dedupeKey)
        toInsert.push({
            user_id: userId,
            type,
            title,
            message,
            data: {
                dedupeKey,
                module,
                actionUrl,
                ...(alertCategory ? { alertCategory } : {}),
                ...(extra || {}),
            },
        })
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // 3. Parallel scan across all modules
    const [
        rulesRes,
        upcomingTxRes,
        budgetsRes,
        monthExpensesRes,
        receivablesRes,
        payablesRes,
        cardsRes,
        goalsRes,
        liquidAccountsRes,
        historyExpensesRes,
    ] = await Promise.allSettled([
        supabase
            .from('recurring_rules')
            .select('id, rule_name, description, amount, currency_code, transaction_type, next_occurrence, execution_method')
            .eq('user_id', userId)
            .eq('is_active', true),
        supabase
            .from('transactions')
            .select('id, description, amount, currency_code, transaction_date, metadata')
            .eq('user_id', userId)
            .or('metadata->>mode.eq.UPCOMING,metadata->>mode.eq.SCHEDULED'),
        supabase
            .from('budgets')
            .select('id, name, amount, currency_code, include_categories, period, is_active, type, budget_year, budget_month')
            .eq('user_id', userId)
            .eq('is_active', true),
        supabase
            .from('transactions')
            .select('amount, expense_category_id, subcategory_id, metadata')
            .eq('user_id', userId)
            .eq('transaction_type', 'EXPENSE')
            .gte('transaction_date', monthStart)
            .lte('transaction_date', monthEnd),
        supabase
            .from('accounts_receivable')
            .select('id, contact_name, outstanding_balance, currency_code, due_date, status')
            .eq('user_id', userId)
            .in('status', ['PENDING', 'PARTIAL', 'OVERDUE']),
        supabase
            .from('accounts_payable')
            .select('id, contact_name, outstanding_balance, currency_code, due_date, status, metadata')
            .eq('user_id', userId)
            .in('status', ['PENDING', 'PARTIAL', 'OVERDUE']),
        supabase
            .from('accounts')
            .select('id, name, currency_code, credit_limit, used_balance, payment_due_day, closing_day')
            .eq('user_id', userId)
            .eq('account_type', 'CREDIT_CARD')
            .eq('is_active', true),
        supabase
            .from('savings_goals')
            .select('id, name, target_amount, current_amount, currency, priority, target_date, status')
            .eq('user_id', userId)
            .neq('status', 'CANCELLED'),
        supabase
            .from('accounts')
            .select('id, current_balance, currency_code, account_type, exclude_from_stats')
            .eq('user_id', userId)
            .eq('is_active', true)
            .neq('account_type', 'CREDIT_CARD'),
        supabase
            .from('transactions')
            .select('id, amount, description, expense_category_id, currency_code, transaction_date, metadata')
            .eq('user_id', userId)
            .eq('transaction_type', 'EXPENSE')
            .gte('transaction_date', ninetyDaysAgo.toISOString())
            .order('transaction_date', { ascending: false })
            .limit(400),
    ])

    // A. Upcoming & Overdue Recurring Rules (honoring each rule's configured reminderDays)
    if (rulesRes.status === 'fulfilled' && rulesRes.value.data) {
        for (const r of rulesRes.value.data) {
            if (!r.next_occurrence) continue
            const days = diffDays(r.next_occurrence, now)
            const rawExec = String(r.execution_method || 'AUTO')
            const parts = rawExec.includes('|') ? rawExec.split('|') : ['SUBSCRIPTION', rawExec, '3']
            const isAuto = parts[1] !== 'MANUAL'
            const reminderWindow = Number.isFinite(Number(parts[2])) ? Number(parts[2]) : 3
            const label = r.description || r.rule_name || 'Suscripción'

            if (days < 0 && !isAuto) {
                queueNotif(
                    `recurring_overdue_${r.id}_${r.next_occurrence}`,
                    'WARNING',
                    `Cobro vencido: ${label}`,
                    `Estaba programado hace ${Math.abs(days)} día(s) por ${fmtMoney(Number(r.amount), r.currency_code)}. Toca "¿Pagar?" para confirmarlo.`,
                    'subscriptions',
                    '/dashboard/subscriptions',
                    undefined,
                    'subscriptions'
                )
            } else if (days >= 1 && days <= Math.max(1, reminderWindow)) {
                const autoText = isAuto ? 'se cobrará automáticamente' : 'pendiente de confirmación ("¿Pagar?")'
                const when = days === 1 ? 'mañana' : `en ${days} días`
                queueNotif(
                    `recurring_soon_${r.id}_${r.next_occurrence}`,
                    'REMINDER',
                    `Próximo vencimiento: ${label}`,
                    `${fmtMoney(Number(r.amount), r.currency_code)} vence ${when} (${autoText}).`,
                    'subscriptions',
                    '/dashboard/subscriptions',
                    undefined,
                    'subscriptions'
                )
            }
        }
    }

    // B. Upcoming / Scheduled Transactions
    if (upcomingTxRes.status === 'fulfilled' && upcomingTxRes.value.data) {
        for (const tx of upcomingTxRes.value.data) {
            const days = diffDays(tx.transaction_date, now)
            if (days <= 3 && days >= -7) {
                const label = tx.description || 'Pago próximo'
                if (days < 0) {
                    queueNotif(
                        `upcoming_overdue_${tx.id}_${todayStr}`,
                        'WARNING',
                        `Pago próximo atrasado: ${label}`,
                        `Estaba programado hace ${Math.abs(days)} día(s) por ${fmtMoney(Number(tx.amount), tx.currency_code)}.`,
                        'transactions',
                        '/dashboard/transactions',
                        undefined,
                        'subscriptions'
                    )
                } else {
                    const when = days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`
                    queueNotif(
                        `upcoming_soon_${tx.id}_${toDateOnly(new Date(tx.transaction_date))}`,
                        'REMINDER',
                        `Pago próximo: ${label}`,
                        `Tienes programado ${fmtMoney(Number(tx.amount), tx.currency_code)} para ${when}.`,
                        'transactions',
                        '/dashboard/transactions',
                        undefined,
                        'subscriptions'
                    )
                }
            }
        }
    }

    // C. Budgets (>= 80% warning, >= 100% exceeded)
    if (budgetsRes.status === 'fulfilled' && budgetsRes.value.data && monthExpensesRes.status === 'fulfilled') {
        const expenses = (monthExpensesRes.value.data || []).filter(
            (tx: any) => tx.metadata?.mode !== 'UPCOMING' && tx.metadata?.mode !== 'SCHEDULED'
        )
        for (const b of budgetsRes.value.data) {
            if (b.type === 'SAVINGS' || b.type === 'INCOME') continue
            if (
                b.budget_year &&
                b.budget_month &&
                (Number(b.budget_year) !== now.getFullYear() ||
                    Number(b.budget_month) !== now.getMonth() + 1)
            ) {
                continue
            }

            const limit = Number(b.amount || 0)
            if (limit <= 0) continue

            const catIds: string[] = Array.isArray(b.include_categories)
                ? b.include_categories
                : []

            const spent = expenses.reduce((sum: number, tx: any) => {
                if (
                    catIds.length === 0 ||
                    (tx.expense_category_id && catIds.includes(tx.expense_category_id)) ||
                    (tx.subcategory_id && catIds.includes(tx.subcategory_id))
                ) {
                    return sum + Number(tx.amount || 0)
                }
                return sum
            }, 0)

            const pct = Math.round((spent / limit) * 100)
            if (pct >= 100) {
                queueNotif(
                    `budget_over_${b.id}_${yearMonth}`,
                    'WARNING',
                    `Presupuesto excedido: ${b.name}`,
                    `Llevas ${fmtMoney(spent, b.currency_code)} de ${fmtMoney(limit, b.currency_code)} (${pct}%).`,
                    'budgets',
                    '/dashboard/budgets',
                    undefined,
                    'budgets'
                )
            } else if (pct >= 80) {
                queueNotif(
                    `budget_warn_${b.id}_${yearMonth}`,
                    'WARNING',
                    `Presupuesto al ${pct}%: ${b.name}`,
                    `Has usado ${fmtMoney(spent, b.currency_code)} de tu límite de ${fmtMoney(limit, b.currency_code)}.`,
                    'budgets',
                    '/dashboard/budgets',
                    undefined,
                    'budgets'
                )
            }
        }
    }

    // D. Loans (Receivables & Payables due soon or overdue)
    const checkLoans = (rows: any[], kind: 'receivable' | 'payable') => {
        for (const loan of rows) {
            if (!loan.due_date || Number(loan.outstanding_balance || 0) <= 0) continue
            const days = diffDays(loan.due_date, now)
            const actionLabel = kind === 'receivable' ? 'Por cobrar' : 'Por pagar'
            if (days < 0) {
                queueNotif(
                    `loan_overdue_${kind}_${loan.id}_${yearMonth}`,
                    'WARNING',
                    `Préstamo vencido (${actionLabel})`,
                    `${loan.contact_name}: saldo pendiente de ${fmtMoney(Number(loan.outstanding_balance), loan.currency_code)}.`,
                    'loans',
                    '/dashboard/loans',
                    undefined,
                    'payments'
                )
            } else if (days <= 3) {
                const when = days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`
                queueNotif(
                    `loan_soon_${kind}_${loan.id}_${loan.due_date.split('T')[0]}`,
                    'REMINDER',
                    `Préstamo vence ${when} (${actionLabel})`,
                    `${loan.contact_name}: ${fmtMoney(Number(loan.outstanding_balance), loan.currency_code)} pendientes.`,
                    'loans',
                    '/dashboard/loans',
                    undefined,
                    'payments'
                )
            }
        }
    }

    if (receivablesRes.status === 'fulfilled' && receivablesRes.value.data) {
        checkLoans(receivablesRes.value.data, 'receivable')
    }
    if (payablesRes.status === 'fulfilled' && payablesRes.value.data) {
        checkLoans(payablesRes.value.data, 'payable')
    }

    // E. Credit Cards (payment due soon & high utilization)
    if (cardsRes.status === 'fulfilled' && cardsRes.value.data) {
        for (const card of cardsRes.value.data) {
            const used = Number(card.used_balance || 0)
            const limit = Number(card.credit_limit || 0)

            if (used > 0 && card.payment_due_day) {
                const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), Number(card.payment_due_day))
                if (dueThisMonth < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                    dueThisMonth.setMonth(dueThisMonth.getMonth() + 1)
                }
                const daysUntilDue = diffDays(toDateOnly(dueThisMonth), now)
                if (daysUntilDue >= 0 && daysUntilDue <= 5) {
                    const when = daysUntilDue === 0 ? 'hoy' : daysUntilDue === 1 ? 'mañana' : `en ${daysUntilDue} días`
                    queueNotif(
                        `card_due_${card.id}_${toDateOnly(dueThisMonth)}`,
                        'REMINDER',
                        `Pago de tarjeta: ${card.name}`,
                        `Tu fecha límite es ${when}. Saldo usado: ${fmtMoney(used, card.currency_code)}.`,
                        'accounts',
                        '/dashboard/accounts',
                        undefined,
                        'payments'
                    )
                }
                if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                    const title3d =
                        daysUntilDue === 0
                            ? `Hoy vence pago de tarjeta: ${card.name}`
                            : daysUntilDue === 1
                              ? `Mañana vence pago de tarjeta: ${card.name}`
                              : `En ${daysUntilDue} días vence tarjeta: ${card.name}`
                    queueNotif(
                        `card_due_3d_${card.id}_${toDateOnly(dueThisMonth)}`,
                        'REMINDER',
                        title3d,
                        `Recuerda pagar el "Pago del mes" completo para evitar intereses por compras nuevas. Saldo usado: ${fmtMoney(used, card.currency_code)}.`,
                        'accounts',
                        '/dashboard/accounts',
                        undefined,
                        'payments'
                    )
                }
            }

            if (limit > 0 && used / limit >= 0.8) {
                const pct = Math.round((used / limit) * 100)
                queueNotif(
                    `card_util_${card.id}_${yearMonth}`,
                    'WARNING',
                    `Uso alto de tarjeta: ${card.name}`,
                    `Estás utilizando el ${pct}% de tu línea de crédito (${fmtMoney(used, card.currency_code)}).`,
                    'accounts',
                    '/dashboard/accounts',
                    undefined,
                    'payments'
                )
            }
        }
    }

    // F. Savings Goals (reached or deadline near)
    if (goalsRes.status === 'fulfilled' && goalsRes.value.data) {
        for (const goal of goalsRes.value.data) {
            const target = Number(goal.target_amount || 0)
            const current = Number(goal.current_amount || 0)
            const goalCurrency = goal.currency || 'PEN'
            if (target <= 0) continue

            if (current >= target) {
                queueNotif(
                    `goal_done_${goal.id}`,
                    'SUCCESS',
                    `¡Meta alcanzada: ${goal.name}!`,
                    `Completaste el 100% de tu objetivo (${fmtMoney(target, goalCurrency)}).`,
                    'savings',
                    '/dashboard/savings-goals',
                    undefined,
                    'savings'
                )
            } else if (goal.target_date) {
                const days = diffDays(goal.target_date, now)
                if (days >= 0 && days <= 7) {
                    const remaining = target - current
                    const when = days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`
                    queueNotif(
                        `goal_soon_${goal.id}_${goal.target_date.split('T')[0]}`,
                        'REMINDER',
                        `Meta próxima a vencer: ${goal.name}`,
                        `Faltan ${fmtMoney(remaining, goalCurrency)} y la fecha objetivo es ${when}.`,
                        'savings',
                        '/dashboard/savings-goals',
                        undefined,
                        'savings'
                    )
                }
            }
        }
    }

    // G. Weekly Debt & Goal Progress Summary
    const activeCards = cardsRes.status === 'fulfilled' && cardsRes.value.data ? cardsRes.value.data : []
    const activePayables =
        payablesRes.status === 'fulfilled' && payablesRes.value.data ? payablesRes.value.data : []
    const allGoals = goalsRes.status === 'fulfilled' && goalsRes.value.data ? goalsRes.value.data : []
    const activeGoals = allGoals.filter((g: any) => g.status === 'ACTIVE' && Number(g.target_amount || 0) > 0)

    const cardDebtTotal = activeCards.reduce(
        (sum: number, c: any) => sum + Math.max(0, Number(c.used_balance || 0)),
        0
    )
    const loanDebtTotal = activePayables
        .filter((p: any) => !(p.metadata as any)?.isCreditCardMirror)
        .reduce((sum: number, p: any) => sum + Math.max(0, Number(p.outstanding_balance || 0)), 0)
    const totalDebt = Math.round((cardDebtTotal + loanDebtTotal) * 100) / 100

    if (totalDebt > 0 || activeGoals.length > 0) {
        const priorityRank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        const sortedGoals = [...activeGoals].sort(
            (a: any, b: any) =>
                (priorityRank[String(a.priority || 'MEDIUM')] ?? 9) -
                (priorityRank[String(b.priority || 'MEDIUM')] ?? 9)
        )
        const primaryGoal = sortedGoals[0]
        const parts: string[] = []
        if (totalDebt > 0) {
            parts.push(
                cardDebtTotal > 0
                    ? `Deuda total restante: ${fmtMoney(totalDebt, 'PEN')} (Tarjeta: ${fmtMoney(cardDebtTotal, 'PEN')})`
                    : `Deuda total restante: ${fmtMoney(totalDebt, 'PEN')}`
            )
        }
        if (primaryGoal) {
            const target = Number(primaryGoal.target_amount || 0)
            const current = Number(primaryGoal.current_amount || 0)
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 0
            const remaining = Math.max(0, target - current)
            parts.push(
                `Meta "${primaryGoal.name}": ${pct}% completado, restan ${fmtMoney(remaining, primaryGoal.currency || 'PEN')}`
            )
        }

        queueNotif(
            `weekly_summary_${getIsoWeekKey(now)}`,
            'INFO',
            'Resumen semanal: deuda y avance de meta',
            `${parts.join(' · ')}.`,
            'savings',
            '/dashboard/savings-goals',
            undefined,
            'savings'
        )
    }

    // H. Riesgo de fin de mes (proyección de liquidez frente a gasto + pagos fijos restantes)
    if (!mutedSet.has('shortfall') && now.getDate() >= 5 && liquidAccountsRes.status === 'fulfilled') {
        const liquidAccounts = (liquidAccountsRes.value.data || []).filter(
            (a: any) => !a.exclude_from_stats
        )
        const liquidTotal = liquidAccounts.reduce(
            (sum: number, a: any) => sum + Number(a.current_balance || 0),
            0
        )

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const currentDay = Math.max(1, now.getDate())
        const remainingDays = Math.max(0, daysInMonth - currentDay)
        const monthEndStr = toDateOnly(new Date(now.getFullYear(), now.getMonth() + 1, 0))

        const monthVarExpenses = (
            monthExpensesRes.status === 'fulfilled' && monthExpensesRes.value.data
                ? monthExpensesRes.value.data
                : []
        ).reduce((sum: number, tx: any) => {
            const m = String(tx.metadata?.mode || '')
            if (m === 'SUBSCRIPTION' || m === 'RECURRING' || m === 'UPCOMING' || m === 'SCHEDULED') {
                return sum
            }
            return sum + Number(tx.amount || 0)
        }, 0)

        const projectedVarOutflow = (monthVarExpenses / currentDay) * remainingDays
        let upcomingBills = 0
        if (rulesRes.status === 'fulfilled' && rulesRes.value.data) {
            for (const r of rulesRes.value.data) {
                if (r.transaction_type === 'INCOME') continue
                const nextOcc = r.next_occurrence ? String(r.next_occurrence).slice(0, 10) : ''
                if (nextOcc > todayStr && nextOcc <= monthEndStr) {
                    upcomingBills += Number(r.amount || 0)
                }
            }
        }
        for (const p of activePayables) {
            if ((p.metadata as any)?.isCreditCardMirror || !p.due_date) continue
            if (String(p.due_date).slice(0, 10) <= monthEndStr) {
                upcomingBills += Number(p.outstanding_balance || 0)
            }
        }
        for (const card of activeCards) {
            const used = Math.max(0, Number(card.used_balance || 0))
            const dueDay = Number(card.payment_due_day || 0)
            if (used > 0 && dueDay >= currentDay && dueDay <= daysInMonth) {
                upcomingBills += used
            }
        }

        const projectedEndBalance = liquidTotal - (projectedVarOutflow + upcomingBills)
        if (projectedEndBalance < 0 && (monthVarExpenses > 0 || upcomingBills > 0)) {
            const shortfall = Math.abs(projectedEndBalance)
            queueNotif(
                `month_end_shortfall_${yearMonth}`,
                'WARNING',
                'Riesgo de quedar corto este mes',
                `Al ritmo actual y con tus pagos próximos (${fmtMoney(upcomingBills, 'PEN')}) podrías cerrar el mes con un faltante estimado de ${fmtMoney(shortfall, 'PEN')}.`,
                'analysis',
                '/dashboard/analysis',
                { shortfall: Math.round(shortfall * 100) / 100 },
                'shortfall'
            )
        }
    }

    // I. Gasto inusual (últimos 7 días >= 2.5x del promedio histórico en la misma categoría)
    if (
        !mutedSet.has('unusual_expense') &&
        historyExpensesRes.status === 'fulfilled' &&
        historyExpensesRes.value.data
    ) {
        const histTxs = (historyExpensesRes.value.data || []).filter(
            (tx: any) => tx.metadata?.mode !== 'UPCOMING' && tx.metadata?.mode !== 'SCHEDULED'
        )
        const byCat: Record<string, any[]> = {}
        for (const tx of histTxs) {
            if (!tx.expense_category_id) continue
            if (!byCat[tx.expense_category_id]) byCat[tx.expense_category_id] = []
            byCat[tx.expense_category_id].push(tx)
        }

        const sevenDaysAgoMs = now.getTime() - 7 * 86400000
        let unusualCount = 0

        for (const tx of histTxs) {
            if (unusualCount >= 2) break
            if (!tx.expense_category_id) continue
            const txMs = new Date(tx.transaction_date).getTime()
            if (txMs < sevenDaysAgoMs) continue
            const amt = Number(tx.amount || 0)
            if (amt < 100) continue

            const peers = (byCat[tx.expense_category_id] || []).filter((p) => p.id !== tx.id)
            if (peers.length < 3) continue
            const avg =
                peers.reduce((s, p) => s + Number(p.amount || 0), 0) / Math.max(1, peers.length)
            if (avg > 0 && amt >= avg * 2.5) {
                const factor = (amt / avg).toFixed(1)
                queueNotif(
                    `unusual_expense_${tx.id}`,
                    'WARNING',
                    'Gasto inusual detectado',
                    `"${tx.description || 'Movimiento'}" por ${fmtMoney(amt, tx.currency_code)} es ${factor} veces tu promedio en esta categoría.`,
                    'transactions',
                    '/dashboard/transactions',
                    { transactionId: tx.id },
                    'unusual_expense'
                )
                unusualCount += 1
            }
        }
    }

    if (toInsert.length > 0) {
        await supabase.from('notifications').insert(toInsert)
    }

    return {
        recurringProcessed: recurringSummary.processed,
        notificationsCreated: toInsert.length,
    }
}
