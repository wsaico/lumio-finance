export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'

import { mapTransaction } from '@/lib/mappers'
import { TransactionService } from '@/lib/services/transaction-service'
import { getMonthDateRangeInTimezone, getDayDateRangeInTimezone } from '@/lib/timezone'
import { getUserEntitlementsServer } from '@/lib/server/entitlements'
import { syncSmartNotifications } from '@/lib/server/smart-notifications'
import { getCurrencySymbol } from '@/lib/currencies'

const transactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL']),
    accountId: z.string().uuid(),
    transferToAccountId: z.string().uuid().optional(),
    creditCardId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z.string().length(3),
    categoryId: z.string().uuid().optional().or(z.literal('')),
    subcategoryId: z.string().uuid().optional().or(z.literal('')),
    date: z.string().datetime(),
    description: z.string().trim().min(1, "La descripción es obligatoria"),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.any().optional(),
    savingsGoalId: z.string().uuid().optional(),
    loanId: z.string().uuid().optional(),
    recurringRuleId: z.string().uuid().optional(),
    recurrence: z.string().optional(), // 'MONTHLY', 'WEEKLY'
    recurrenceEndDate: z.string().optional().nullable(),
    attachmentUrl: z.string().url().optional().or(z.literal('')),
})

// Helpers moved to TransactionService


// Mappers moved to @/lib/mappers

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const month = searchParams.get('month')
        const year = searchParams.get('year')
        const day = searchParams.get('day')
        const accountId = searchParams.get('accountId')
        const id = searchParams.get('id')
        const type = searchParams.get('type') // 'INCOME' | 'EXPENSE'
        const search = searchParams.get('search') // Text search
        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 20

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        if (id) {
            // ... (single fetch logic remains same)
            const { data: transaction, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                    expense_category:expense_categories(name, icon, color),
                    income_category:income_categories(name, icon, color),
                    subcategory:subcategories(name),
                    credit_card:credit_cards(name, last_four_digits, color)
                `)
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error) {
                console.error('[TRANSACTION_GET_SINGLE]', error)
                return new NextResponse(JSON.stringify({ error: error.message }), { status: 404 })
            }

            return NextResponse.json(mapTransaction(transaction))
        }

        let query = supabase
            .from('transactions')
            .select(`
                *,
                account:accounts!transactions_account_id_fkey(name, icon, color, currency_code),
                expense_category:expense_categories(name, icon, color),
                income_category:income_categories(name, icon, color),
                subcategory:subcategories(name),
                credit_card:credit_cards(name, last_four_digits, color)
            `, { count: 'estimated' })
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: false })

        if (month && year) {
            const { timezone } = await getUserEntitlementsServer(supabase, user)
            const m = Number(month)
            const y = Number(year)
            const range = day
                ? getDayDateRangeInTimezone(y, m, Number(day), timezone)
                : getMonthDateRangeInTimezone(y, m, timezone)
            query = query.gte('transaction_date', range.startIso).lte('transaction_date', range.endIso)
        }

        if (accountId) {
            if (/^[0-9a-f-]{36}$/i.test(accountId)) {
                query = query.or(`account_id.eq.${accountId},transfer_to_account_id.eq.${accountId}`)
            } else {
                query = query.eq('account_id', accountId)
            }
        }

        if (type) {
            query = query.eq('transaction_type', type)
        }

        if (search) {
            // Fetch matching categories strictly scoped to system OR current user
            const { data: expenseCats } = await supabase
                .from('expense_categories')
                .select('id')
                .or(`user_id.is.null,user_id.eq.${user.id}`)
                .ilike('name', `%${search}%`)

            const { data: incomeCats } = await supabase
                .from('income_categories')
                .select('id')
                .or(`user_id.is.null,user_id.eq.${user.id}`)
                .ilike('name', `%${search}%`)

            const expenseIds = expenseCats?.map((c: { id: string }) => c.id) || []
            const incomeIds = incomeCats?.map((c: { id: string }) => c.id) || []

            let orConditions = [`description.ilike.%${search}%`, `notes.ilike.%${search}%`]

            if (expenseIds.length > 0) {
                orConditions.push(`expense_category_id.in.(${expenseIds.join(',')})`)
            }
            if (incomeIds.length > 0) {
                orConditions.push(`income_category_id.in.(${incomeIds.join(',')})`)
            }

            query = query.or(orConditions.join(','))
        }
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data: transactions, error, count } = await query

        if (error) {
            console.error('[TRANSACTIONS_GET_SUPABASE]', error)
            return new NextResponse(JSON.stringify({ error: error.message, details: error }), { status: 500 })
        }

        return NextResponse.json({
            data: transactions.map(mapTransaction),
            meta: {
                page,
                limit,
                total: count,
                hasMore: count ? (from + limit) < count : false
            }
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[TRANSACTIONS_GET]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const validData = transactionSchema.parse(body)

        // VALIDATION: Reject loan creation attempts
        const metadata = validData.metadata || {}
        const clientRequestId =
            typeof metadata.clientRequestId === 'string' && metadata.clientRequestId.trim().length >= 8
                ? metadata.clientRequestId.trim()
                : null

        if (clientRequestId) {
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('metadata->>clientRequestId', clientRequestId)
                .maybeSingle()

            if (existingTx) {
                return NextResponse.json(
                    { ...mapTransaction(existingTx), deduplicated: true },
                    { status: 200 }
                )
            }
        }

        if (metadata.mode === 'LOAN_LENT' || metadata.mode === 'LOAN_BORROWED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Use el módulo de Préstamos para crear préstamos',
                    details: 'Los préstamos deben crearse exclusivamente desde /dashboard/loans para garantizar integridad de datos'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Enforce subscription entitlement if creating a subscription/recurring rule
        if (metadata.mode === 'SUBSCRIPTION' || metadata.mode === 'RECURRING') {
            const { entitlements } = await getUserEntitlementsServer(supabase, user)
            if (!entitlements.canCreateRecurring) {
                return NextResponse.json(
                    {
                        error: 'Suscripciones y recurrentes requieren Plan Premium',
                        code: 'PREMIUM_REQUIRED',
                    },
                    { status: 403 }
                )
            }
        }

        const isPendingScheduledOnly =
            (metadata.mode === 'UPCOMING' ||
                metadata.mode === 'SCHEDULED' ||
                metadata.mode === 'SUBSCRIPTION' ||
                metadata.mode === 'RECURRING') &&
            metadata.initialPaymentState === 'PENDING'

        let expenseAccount: {
            name: string
            account_type: string
            currency_code?: string | null
        } | null = null

        // VALIDATION: Check balance for EXPENSE and TRANSFER only when immediately paid today
        if (
            (validData.type === 'EXPENSE' || validData.type === 'TRANSFER') &&
            !isPendingScheduledOnly &&
            metadata.mode !== 'SCHEDULED' &&
            metadata.mode !== 'UPCOMING'
        ) {
            const { data: account } = await supabase
                .from('accounts')
                .select('current_balance, name, account_type, credit_limit, used_balance, currency_code')
                .eq('id', validData.accountId)
                .eq('user_id', user.id)
                .single()

            if (account) {
                expenseAccount = account
                const requestedAmount = validData.amount

                // Validar límites para cuentas de tipo CREDIT_CARD (solo si tiene línea configurada > 0)
                if (account.account_type === 'CREDIT_CARD') {
                    const creditLimit = Number(account.credit_limit || 0)
                    const usedBalance = Math.abs(Number(account.used_balance || 0))
                    const availableCredit = creditLimit - usedBalance

                    if (creditLimit > 0 && requestedAmount > availableCredit) {
                        const shortage = requestedAmount - availableCredit
                        return new NextResponse(
                            JSON.stringify({
                                error: 'Límite de crédito excedido',
                                details: `La tarjeta "${account.name}" tiene un crédito disponible de ${availableCredit.toFixed(2)} pero intentas usar ${requestedAmount.toFixed(2)}. Excedes el límite por ${shortage.toFixed(2)} ${validData.currency}`,
                                creditInfo: { creditLimit, usedBalance, availableCredit, requestedAmount, shortage }
                            }),
                            { status: 400, headers: { 'Content-Type': 'application/json' } }
                        )
                    }
                } else {
                    // Validar saldo para cuentas normales (ahorros, efectivo, etc.)
                    const currentBalance = Number(account.current_balance)
                    if (currentBalance < requestedAmount) {
                        const shortage = requestedAmount - currentBalance
                        return new NextResponse(
                            JSON.stringify({
                                error: 'Saldo insuficiente',
                                details: `La cuenta "${account.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas usar ${requestedAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${validData.currency}`,
                                balanceInfo: { currentBalance, requestedAmount, shortage }
                            }),
                            { status: 400, headers: { 'Content-Type': 'application/json' } }
                        )
                    }
                }
            }
        }

        // Enforce domain validation: transfer destination & category presence
        if (validData.type === 'TRANSFER') {
            if (!validData.transferToAccountId) {
                return NextResponse.json({ error: 'La cuenta de destino es obligatoria para transferencias' }, { status: 400 })
            }
            if (validData.transferToAccountId === validData.accountId) {
                return NextResponse.json({ error: 'La cuenta de origen y destino deben ser diferentes' }, { status: 400 })
            }
        } else if ((validData.type === 'EXPENSE' || validData.type === 'INCOME') && !metadata?.isBalanceAdjustment && !validData.categoryId) {
            return NextResponse.json({ error: 'La categoría es obligatoria' }, { status: 400 })
        }

        // 1. If mode is UPCOMING/SCHEDULED or SUBSCRIPTION/RECURRING with initialPaymentState === 'PENDING' (Cashew style: does not deduct balance until marked as Paid), store in recurring_rules queue!
        const isAuto = metadata.isAutoExecute === true || metadata.scheduledType === 'AUTO'
        const reminderDays = Number.isFinite(Number(metadata.reminderDays))
            ? Number(metadata.reminderDays)
            : 3
        const resolvedFreq =
            (validData.recurrence && validData.recurrence !== 'NONE' ? validData.recurrence : null) ||
            (metadata.recurrence && metadata.recurrence !== 'NONE' ? metadata.recurrence : null) ||
            'MONTHLY'
        const resolvedInterval = Math.max(1, Number(metadata.recurrenceInterval || 1))
        const resolvedDueDate = metadata.dueDate || validData.date

        if (isPendingScheduledOnly || metadata.mode === 'UPCOMING' || metadata.mode === 'SCHEDULED') {
            const ruleMode =
                metadata.mode === 'SUBSCRIPTION'
                    ? 'SUBSCRIPTION'
                    : metadata.mode === 'RECURRING'
                      ? 'RECURRING'
                      : 'UPCOMING'
            const execCode = `${ruleMode}|${isAuto ? 'AUTO' : 'MANUAL'}|${reminderDays}`

            const createdRule = await TransactionService.createRecurringRule(supabase, {
                userId: user.id,
                accountId: validData.accountId,
                transactionType: validData.type,
                amount: Number(validData.amount),
                currencyCode: validData.currency,
                frequency: resolvedFreq,
                interval: resolvedInterval,
                startDate: resolvedDueDate,
                nextOccurrence: resolvedDueDate,
                endDate: validData.recurrenceEndDate || metadata.recurrenceEndDate || null,
                description: validData.description,
                expenseCategoryId: validData.type === 'EXPENSE' ? validData.categoryId : null,
                incomeCategoryId: validData.type === 'INCOME' ? validData.categoryId : null,
                subcategoryId: validData.subcategoryId,
                executionMethod: execCode,
                metadata,
            })

            return NextResponse.json({
                id: createdRule?.id || crypto.randomUUID(),
                scheduledRule: true,
                rule: createdRule,
                description: validData.description,
                amount: Number(validData.amount),
                currencyCode: validData.currency,
                dueDate: resolvedDueDate,
                mode: ruleMode,
            })
        }

        // 2. Otherwise process immediate Transaction via Service (paid today)
        const transaction = await TransactionService.processTransaction(supabase, {
            userId: user.id,
            type: validData.type,
            accountId: validData.accountId,
            amount: Number(validData.amount),
            currency: validData.currency,
            transactionDate: validData.date,
            description: validData.description,
            notes: validData.notes,
            tags: validData.tags,
            metadata: metadata,
            categoryId: validData.categoryId,
            subcategoryId: validData.subcategoryId,
            transferToAccountId: validData.transferToAccountId,
            creditCardId: validData.creditCardId,
            savingsGoalId: validData.savingsGoalId,
            loanId: validData.loanId,
            recurringRuleId: validData.recurringRuleId,
            attachmentUrl: validData.attachmentUrl
        })

        // 3. Create Recurring Rule for SUBSCRIPTION or RECURRING for subsequent cycles
        if (metadata.mode === 'SUBSCRIPTION' || metadata.mode === 'RECURRING') {
            const ruleMode = metadata.mode === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'RECURRING'
            const execCode = `${ruleMode}|${isAuto ? 'AUTO' : 'MANUAL'}|${reminderDays}`

            const createdRule = await TransactionService.createRecurringRule(supabase, {
                userId: user.id,
                accountId: validData.accountId,
                transactionType: validData.type,
                amount: Number(validData.amount),
                currencyCode: validData.currency,
                frequency: resolvedFreq,
                interval: resolvedInterval,
                startDate: validData.date,
                nextOccurrence: metadata.nextDueDate || undefined,
                endDate: validData.recurrenceEndDate || metadata.recurrenceEndDate || null,
                description: validData.description,
                expenseCategoryId: validData.type === 'EXPENSE' ? validData.categoryId : null,
                incomeCategoryId: validData.type === 'INCOME' ? validData.categoryId : null,
                subcategoryId: validData.subcategoryId,
                executionMethod: execCode,
                metadata: { ...metadata, initialPaymentState: 'PAID_TODAY' },
            })

            if (createdRule?.id && transaction?.id) {
                await supabase
                    .from('transactions')
                    .update({ recurring_rule_id: createdRule.id })
                    .eq('id', transaction.id)
                    .eq('user_id', user.id)
            }
        }

        // 4. Smart Alerts on immediate EXPENSE (credit card rule + 80%/100% budget thresholds)
        if (validData.type === 'EXPENSE') {
            let isCreditCardExpense =
                expenseAccount?.account_type === 'CREDIT_CARD' || Boolean(validData.creditCardId)
            let cardName = expenseAccount?.name || 'Tarjeta de crédito'

            if (!expenseAccount && validData.accountId) {
                const { data: accFallback } = await supabase
                    .from('accounts')
                    .select('name, account_type, currency_code')
                    .eq('id', validData.accountId)
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (accFallback) {
                    expenseAccount = accFallback
                    if (accFallback.account_type === 'CREDIT_CARD') {
                        isCreditCardExpense = true
                        cardName = accFallback.name || cardName
                    }
                }
            }

            if (isCreditCardExpense) {
                if (expenseAccount?.account_type !== 'CREDIT_CARD' && validData.creditCardId) {
                    const { data: cardRow } = await supabase
                        .from('credit_cards')
                        .select('name')
                        .eq('id', validData.creditCardId)
                        .eq('user_id', user.id)
                        .maybeSingle()
                    if (cardRow?.name) cardName = cardRow.name
                }

                const sym = getCurrencySymbol(validData.currency || expenseAccount?.currency_code || 'PEN')
                const amountFormatted = Number(validData.amount).toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })

                const { error: notifErr } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: user.id,
                        type: 'WARNING',
                        title: 'Alerta: gasto registrado con tarjeta de crédito',
                        message: `Registraste un gasto de ${sym} ${amountFormatted} en "${cardName}". Regla activa: evita nuevos gastos con tarjeta mientras liquidas tu deuda.`,
                        data: {
                            module: 'accounts',
                            actionUrl: '/dashboard/accounts',
                            transactionId: transaction.id,
                            accountId: validData.accountId,
                            alertType: 'CREDIT_CARD_EXPENSE',
                        },
                    })
                if (notifErr) console.error('[TX_CC_ALERT]', notifErr)
            }

            await syncSmartNotifications(supabase, user.id).catch((err) =>
                console.error('[TX_NOTIF_SYNC]', err)
            )
        }

        return NextResponse.json(transaction)

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[TRANSACTION_POST]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const { id, ...updates } = body
        if (!id) return new NextResponse('Transaction ID required', { status: 400 })
        if (updates.description !== undefined && !String(updates.description).trim()) {
            return NextResponse.json({ error: 'La descripción es obligatoria' }, { status: 400 })
        }
        if (typeof updates.description === 'string') {
            updates.description = updates.description.trim()
        }

        // Validate balance / credit limit delta on PATCH before modifying
        const { data: oldTx } = await supabase
            .from('transactions')
            .select('amount, account_id, transaction_type, metadata, currency_code')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (oldTx) {
            const effectiveType = updates.type || oldTx.transaction_type
            const effectiveAccountId = updates.accountId || oldTx.account_id
            const effectiveAmount = updates.amount !== undefined ? Number(updates.amount) : Number(oldTx.amount)
            const effectiveMode = updates.metadata?.mode ?? oldTx.metadata?.mode
            const oldMode = oldTx.metadata?.mode

            const wasOldApplied =
                (oldTx.transaction_type === 'EXPENSE' || oldTx.transaction_type === 'TRANSFER') &&
                oldMode !== 'SCHEDULED' &&
                oldMode !== 'UPCOMING'

            if (
                (effectiveType === 'EXPENSE' || effectiveType === 'TRANSFER') &&
                effectiveMode !== 'SCHEDULED' &&
                effectiveMode !== 'UPCOMING'
            ) {
                const { data: targetAcc } = await supabase
                    .from('accounts')
                    .select('current_balance, name, account_type, credit_limit, used_balance, currency_code')
                    .eq('id', effectiveAccountId)
                    .single()

                if (targetAcc) {
                    const sameAccountApplied = wasOldApplied && effectiveAccountId === oldTx.account_id
                    const additionalRequired = sameAccountApplied
                        ? Math.max(0, effectiveAmount - Number(oldTx.amount || 0))
                        : effectiveAmount

                    const currencyLabel = updates.currency || oldTx.currency_code || targetAcc.currency_code || ''

                    if (targetAcc.account_type === 'CREDIT_CARD') {
                        const creditLimit = Number(targetAcc.credit_limit || 0)
                        const usedBalance = Math.abs(Number(targetAcc.used_balance || 0))
                        const availableCredit = creditLimit - usedBalance
                        if (additionalRequired > availableCredit) {
                            const shortage = additionalRequired - availableCredit
                            return NextResponse.json(
                                {
                                    error: 'Límite de crédito excedido',
                                    details: `La tarjeta "${targetAcc.name}" tiene un crédito disponible de ${availableCredit.toFixed(2)} y el cambio requiere ${additionalRequired.toFixed(2)} adicional(es). Excedes el límite por ${shortage.toFixed(2)} ${currencyLabel}`.trim(),
                                },
                                { status: 400 }
                            )
                        }
                    } else {
                        const currentBalance = Number(targetAcc.current_balance || 0)
                        if (additionalRequired > currentBalance) {
                            const shortage = additionalRequired - currentBalance
                            return NextResponse.json(
                                {
                                    error: 'Saldo insuficiente',
                                    details: `La cuenta "${targetAcc.name}" tiene un saldo de ${currentBalance.toFixed(2)} y el cambio requiere ${additionalRequired.toFixed(2)} adicional(es). Faltan ${shortage.toFixed(2)} ${currencyLabel}`.trim(),
                                },
                                { status: 400 }
                            )
                        }
                    }
                }
            }
        }

        // Process Update via Service (handles Reversal & Re-apply)
        const updatedTransaction = await TransactionService.updateTransaction(supabase, id, user.id, updates)

        // Update Budgets (Background)


        return NextResponse.json(updatedTransaction)
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[TRANSACTION_PATCH]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const supabase = await createClient()
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const { data: { user } } = await supabase.auth.getUser()

        if (!user || !id) return new NextResponse('Unauthorized or ID missing', { status: 400 })

        // Process Deletion via Service (handles Reversal)
        await TransactionService.deleteTransaction(supabase, id, user.id)

        // Update Budgets (Background)


        return NextResponse.json({ success: true })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[TRANSACTION_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message || error }), { status: 500 })
    }
}

