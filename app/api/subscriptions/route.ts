export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServiceRoleClient } from "@/lib/server/system-settings"
import { TransactionService } from "@/lib/services/transaction-service"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"

export interface ParsedRuleExecution {
    mode: "SUBSCRIPTION" | "RECURRING" | "UPCOMING"
    method: "AUTO" | "MANUAL"
    reminderDays: number
}

export function parseRuleExecution(raw?: string | null): ParsedRuleExecution {
    if (!raw) {
        return { mode: "SUBSCRIPTION", method: "AUTO", reminderDays: 3 }
    }
    if (raw.includes("|")) {
        const [rawMode, rawMethod, rawRem] = raw.split("|")
        const mode =
            rawMode === "UPCOMING"
                ? "UPCOMING"
                : rawMode === "RECURRING"
                  ? "RECURRING"
                  : "SUBSCRIPTION"
        const method = rawMethod === "MANUAL" ? "MANUAL" : "AUTO"
        const reminderDays = Number.isFinite(Number(rawRem)) ? Number(rawRem) : 3
        return { mode, method, reminderDays }
    }
    return {
        mode: "SUBSCRIPTION",
        method: raw === "MANUAL" ? "MANUAL" : "AUTO",
        reminderDays: 3,
    }
}

export function encodeRuleExecution(config: ParsedRuleExecution): string {
    return `${config.mode}|${config.method}|${config.reminderDays}`
}

export function computeNextDate(
    fromDateStr: string,
    frequency: string,
    intervalInput = 1
): string {
    const clean = fromDateStr.split("T")[0]
    const [y, m, d] = clean.split("-").map(Number)
    const next = y && m && d ? new Date(y, m - 1, d, 12, 0, 0) : new Date()
    const step = Math.max(1, Number(intervalInput || 1))
    const freq = (frequency || "MONTHLY").toUpperCase()

    if (freq === "DAILY") {
        next.setDate(next.getDate() + step)
    } else if (freq === "WEEKLY") {
        next.setDate(next.getDate() + step * 7)
    } else if (freq === "BIWEEKLY") {
        next.setDate(next.getDate() + step * 14)
    } else if (freq === "YEARLY") {
        next.setFullYear(next.getFullYear() + step)
    } else {
        next.setMonth(next.getMonth() + step)
    }

    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`
}

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase

        const [rulesRes, upcomingTxsRes, accountsRes, expCatsRes, incCatsRes] =
            await Promise.all([
                db
                    .from("recurring_rules")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .order("next_occurrence", { ascending: true }),
                db
                    .from("transactions")
                    .select("*")
                    .eq("user_id", user.id)
                    .or("metadata->>mode.eq.UPCOMING,metadata->>mode.eq.SCHEDULED")
                    .order("transaction_date", { ascending: true }),
                db
                    .from("accounts")
                    .select("id, name, currency_code, color, icon, account_type")
                    .eq("user_id", user.id),
                db
                    .from("expense_categories")
                    .select("id, name, icon, color")
                    .or(`user_id.is.null,user_id.eq.${user.id}`),
                db
                    .from("income_categories")
                    .select("id, name, icon, color")
                    .or(`user_id.is.null,user_id.eq.${user.id}`),
            ])

        const accountMap = new Map<string, any>(
            (accountsRes.data || []).map((a: any) => [a.id, a])
        )
        const catMap = new Map<string, any>()
        ;(expCatsRes.data || []).forEach((c: any) => catMap.set(c.id, c))
        ;(incCatsRes.data || []).forEach((c: any) => catMap.set(c.id, c))

        const items: any[] = []

        // 1. Recurring Rules (Subscriptions, Repetitive, and Scheduled Rules)
        for (const r of rulesRes.data || []) {
            const parsed = parseRuleExecution(r.execution_method)
            const acc = accountMap.get(r.account_id)
            const cat =
                catMap.get(r.expense_category_id) ||
                catMap.get(r.income_category_id) ||
                null
            const interval = Math.max(1, Number(r.interval || 1))
            const freq = (r.frequency || "MONTHLY").toUpperCase()

            // Calculate monthly equivalent multiplier
            let monthlyFactor = 1
            if (freq === "DAILY") monthlyFactor = 30 / interval
            else if (freq === "WEEKLY") monthlyFactor = 4.333 / interval
            else if (freq === "BIWEEKLY") monthlyFactor = 2.166 / interval
            else if (freq === "MONTHLY") monthlyFactor = 1 / interval
            else if (freq === "YEARLY") monthlyFactor = 1 / (12 * interval)
            if (parsed.mode === "UPCOMING") monthlyFactor = 1

            items.push({
                id: r.id,
                source: "RULE",
                title: r.description || r.rule_name || "Suscripción",
                amount: Number(r.amount || 0),
                monthlyEquivalent:
                    Math.round(Number(r.amount || 0) * monthlyFactor * 100) / 100,
                currencyCode: r.currency_code || acc?.currency_code || "PEN",
                transactionType: r.transaction_type || "EXPENSE",
                mode: parsed.mode,
                executionMethod: parsed.method,
                reminderDays: parsed.reminderDays,
                frequency: freq,
                interval,
                dueDate: r.next_occurrence,
                startDate: r.start_date,
                endDate: r.end_date || null,
                lastExecutedAt: r.last_executed_at || null,
                accountId: r.account_id,
                accountName: acc?.name || "Cuenta",
                accountColor: acc?.color || "#7C3AED",
                categoryId: r.expense_category_id || r.income_category_id || null,
                categoryName: cat?.name || "Suscripciones",
                categoryIcon: cat?.icon || "sparkles",
                categoryColor: cat?.color || "#7C3AED",
            })
        }

        // 2. Standalone Pending UPCOMING / SCHEDULED transactions not yet paid
        for (const tx of upcomingTxsRes.data || []) {
            if (tx.metadata?.isPaid === true) continue
            const acc = accountMap.get(tx.account_id)
            const cat =
                catMap.get(tx.expense_category_id) ||
                catMap.get(tx.income_category_id) ||
                null
            const dueDate = String(tx.transaction_date || "").slice(0, 10)

            items.push({
                id: tx.id,
                source: "TRANSACTION",
                title: tx.description || "Pago programado",
                amount: Number(tx.amount || 0),
                monthlyEquivalent: Number(tx.amount || 0),
                currencyCode: tx.currency_code || acc?.currency_code || "PEN",
                transactionType: tx.transaction_type || "EXPENSE",
                mode: "UPCOMING",
                executionMethod: tx.metadata?.isAutoExecute ? "AUTO" : "MANUAL",
                reminderDays: Number(tx.metadata?.reminderDays ?? 1),
                frequency: "ONCE",
                interval: 1,
                dueDate,
                startDate: dueDate,
                endDate: dueDate,
                lastExecutedAt: null,
                accountId: tx.account_id,
                accountName: acc?.name || "Cuenta",
                accountColor: acc?.color || "#7C3AED",
                categoryId: tx.expense_category_id || tx.income_category_id || null,
                categoryName: cat?.name || "Programado",
                categoryIcon: cat?.icon || "calendar",
                categoryColor: cat?.color || "#38BDF8",
            })
        }

        items.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))

        return NextResponse.json({ items })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[SUBSCRIPTIONS_GET]", error)
        return NextResponse.json(
            { error: "No se pudieron cargar las suscripciones y programados" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase
        const body = await req.json()
        const { action, id, source } = body

        // ACTION 1: PAY / DEPOSIT A PENDING SUBSCRIPTION OR SCHEDULED ITEM (Cashew "¿Pagar?")
        if (action === "pay") {
            if (source === "TRANSACTION") {
                const { data: tx } = await db
                    .from("transactions")
                    .select("*")
                    .eq("id", id)
                    .eq("user_id", user.id)
                    .maybeSingle()

                if (!tx) {
                    return NextResponse.json(
                        { error: "Movimiento programado no encontrado" },
                        { status: 404 }
                    )
                }

                const nextMeta = {
                    ...(tx.metadata || {}),
                    mode: "DEFAULT",
                    previousMode: tx.metadata?.mode || "UPCOMING",
                    isPaid: true,
                    paidAt: new Date().toISOString(),
                }

                await db
                    .from("transactions")
                    .update({
                        metadata: nextMeta,
                        transaction_date: new Date().toISOString(),
                    })
                    .eq("id", id)
                    .eq("user_id", user.id)

                return NextResponse.json({
                    success: true,
                    nextDueDate: null,
                    message: "Movimiento marcado como pagado",
                })
            }

            // Default: source === "RULE"
            const { data: rule } = await db
                .from("recurring_rules")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id)
                .maybeSingle()

            if (!rule) {
                return NextResponse.json(
                    { error: "Suscripción o regla no encontrada" },
                    { status: 404 }
                )
            }

            const parsed = parseRuleExecution(rule.execution_method)
            const nowIso = new Date().toISOString()

            // Create the real paid transaction in public.transactions (updates account balance via trigger)
            const paidTx = await TransactionService.processTransaction(db, {
                userId: user.id,
                accountId: rule.account_id,
                type: rule.transaction_type as any,
                amount: Number(rule.amount),
                currency: rule.currency_code || "PEN",
                transactionDate: nowIso,
                description: rule.description || rule.rule_name || "Suscripción",
                notes:
                    parsed.mode === "UPCOMING"
                        ? "Pago programado confirmado"
                        : `Cobro de ${parsed.mode === "SUBSCRIPTION" ? "suscripción" : "recurrente"} (${rule.next_occurrence})`,
                categoryId:
                    rule.transaction_type === "EXPENSE"
                        ? rule.expense_category_id
                        : rule.income_category_id,
                subcategoryId: rule.subcategory_id,
                recurringRuleId: rule.id,
                metadata: {
                    mode: "DEFAULT",
                    originMode: parsed.mode,
                    isPaid: true,
                    paidAt: nowIso,
                    recurrence: rule.frequency,
                    recurrenceInterval: rule.interval || 1,
                },
            })

            // If it was a one-time UPCOMING rule, complete it; otherwise advance next_occurrence
            if (parsed.mode === "UPCOMING") {
                await db
                    .from("recurring_rules")
                    .update({
                        is_active: false,
                        last_executed_at: nowIso,
                        updated_at: nowIso,
                    })
                    .eq("id", rule.id)
                    .eq("user_id", user.id)

                return NextResponse.json({
                    success: true,
                    transaction: paidTx,
                    nextDueDate: null,
                    completed: true,
                })
            }

            const nextDueDate = computeNextDate(
                rule.next_occurrence,
                rule.frequency || "MONTHLY",
                rule.interval || 1
            )
            const reachedEnd = Boolean(rule.end_date && nextDueDate > rule.end_date)

            await db
                .from("recurring_rules")
                .update({
                    next_occurrence: nextDueDate,
                    last_executed_at: nowIso,
                    is_active: !reachedEnd,
                    updated_at: nowIso,
                })
                .eq("id", rule.id)
                .eq("user_id", user.id)

            return NextResponse.json({
                success: true,
                transaction: paidTx,
                nextDueDate: reachedEnd ? null : nextDueDate,
                completed: reachedEnd,
            })
        }

        // ACTION 2: SKIP CURRENT CYCLE WITHOUT DEDUCTING BALANCE
        if (action === "skip") {
            const { data: rule } = await db
                .from("recurring_rules")
                .select("*")
                .eq("id", id)
                .eq("user_id", user.id)
                .maybeSingle()

            if (!rule) {
                return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 })
            }

            const nextDueDate = computeNextDate(
                rule.next_occurrence,
                rule.frequency || "MONTHLY",
                rule.interval || 1
            )
            await db
                .from("recurring_rules")
                .update({
                    next_occurrence: nextDueDate,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", rule.id)
                .eq("user_id", user.id)

            return NextResponse.json({ success: true, nextDueDate })
        }

        // ACTION 3: DELETE / CANCEL SUBSCRIPTION OR SCHEDULED ITEM
        if (action === "delete") {
            if (source === "TRANSACTION") {
                await db
                    .from("transactions")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user.id)
            } else {
                await db
                    .from("recurring_rules")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user.id)
            }
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[SUBSCRIPTIONS_POST]", error)
        return NextResponse.json(
            { error: error?.message || "No se pudo procesar la acción" },
            { status: 500 }
        )
    }
}
