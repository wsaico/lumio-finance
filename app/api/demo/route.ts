export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { CategoryService } from "@/lib/services/category-service"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"
import { getServiceRoleClient } from "@/lib/server/system-settings"

interface DemoManifest {
    accountIds: string[]
    transactionIds: string[]
    budgetIds: string[]
    goalIds: string[]
    receivableIds: string[]
    payableIds: string[]
    recurringRuleIds: string[]
    tagIds: string[]
    tagNames: string[]
}

const EMPTY_MANIFEST: DemoManifest = {
    accountIds: [],
    transactionIds: [],
    budgetIds: [],
    goalIds: [],
    receivableIds: [],
    payableIds: [],
    recurringRuleIds: [],
    tagIds: [],
    tagNames: [],
}

async function cleanupDemoData(supabase: any, db: any, user: any) {
    const manifest: DemoManifest = {
        ...EMPTY_MANIFEST,
        ...(user.user_metadata?.demo_manifest || {}),
    }

    // Helper: delete rows matching is_demo=true OR manifest IDs (safely works even if is_demo column is missing)
    const deleteDemoRows = async (table: string, ids: string[], useMetadataCheck = false) => {
        try {
            await db.from(table).delete().eq("user_id", user.id).eq("is_demo", true)
        } catch {
            // column may not exist yet
        }
        if (ids.length > 0) {
            await db.from(table).delete().eq("user_id", user.id).in("id", ids)
        }
        if (useMetadataCheck) {
            const { data: metaRows } = await db
                .from(table)
                .select("id, metadata")
                .eq("user_id", user.id)
                .limit(500)
            const matchedIds = (metaRows || [])
                .filter((r: any) => r.metadata?.is_demo === true)
                .map((r: any) => r.id)
            if (matchedIds.length > 0) {
                await db.from(table).delete().eq("user_id", user.id).in("id", matchedIds)
            }
        }
    }

    // 1. Delete demo transactions, rules, budgets, goals, loans, tags
    await deleteDemoRows("transactions", manifest.transactionIds, true)
    await deleteDemoRows("recurring_rules", manifest.recurringRuleIds)
    await deleteDemoRows("budgets", manifest.budgetIds)
    await deleteDemoRows("savings_goals", manifest.goalIds)
    await deleteDemoRows("accounts_receivable", manifest.receivableIds, true)
    await deleteDemoRows("accounts_payable", manifest.payableIds, true)
    await deleteDemoRows("user_tags", manifest.tagIds)

    // Remove demo tags from user_metadata fallback if used
    if (Array.isArray(user.user_metadata?.custom_tags)) {
        const remainingTags = user.user_metadata.custom_tags.filter(
            (t: any) => !t.is_demo && !manifest.tagNames.includes(t.name)
        )
        user.user_metadata.custom_tags = remainingTags
    }

    // 2. Smart Account Cleanup: preserve any account where the user logged REAL transactions
    let demoAccountIds = new Set<string>(manifest.accountIds)
    try {
        const { data: flagAccounts } = await db
            .from("accounts")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_demo", true)
        ;(flagAccounts || []).forEach((a: any) => demoAccountIds.add(a.id))
    } catch {
        // ignore if column not present
    }

    for (const accId of Array.from(demoAccountIds)) {
        const { data: remainingTxs } = await db
            .from("transactions")
            .select("id, amount, transaction_type, account_id, transfer_to_account_id")
            .eq("user_id", user.id)
            .or(`account_id.eq.${accId},transfer_to_account_id.eq.${accId}`)

        if (!remainingTxs || remainingTxs.length === 0) {
            await db.from("accounts").delete().eq("id", accId).eq("user_id", user.id)
        } else {
            // User has real transactions inside this account -> keep account & recalculate real balance!
            const { data: accInfo } = await db
                .from("accounts")
                .select("account_type")
                .eq("id", accId)
                .eq("user_id", user.id)
                .maybeSingle()

            let netBalance = 0
            for (const tx of remainingTxs) {
                const amt = Number(tx.amount || 0)
                if (tx.account_id === accId) {
                    if (tx.transaction_type === "INCOME") netBalance += amt
                    else if (tx.transaction_type === "EXPENSE" || tx.transaction_type === "TRANSFER")
                        netBalance -= amt
                } else if (tx.transfer_to_account_id === accId && tx.transaction_type === "TRANSFER") {
                    netBalance += amt
                }
            }

            const updatePayload: Record<string, any> =
                accInfo?.account_type === "CREDIT_CARD"
                    ? { used_balance: Math.max(0, -netBalance), current_balance: netBalance, initial_balance: 0 }
                    : { current_balance: netBalance, initial_balance: 0 }

            try {
                await db
                    .from("accounts")
                    .update({ ...updatePayload, is_demo: false })
                    .eq("id", accId)
                    .eq("user_id", user.id)
            } catch {
                await db
                    .from("accounts")
                    .update(updatePayload)
                    .eq("id", accId)
                    .eq("user_id", user.id)
            }
        }
    }

    // 3. Turn off demo_mode_active flags
    try {
        await supabase.auth.updateUser({
            data: {
                ...(user.user_metadata || {}),
                demo_mode_active: false,
                demo_manifest: EMPTY_MANIFEST,
            },
        })
    } catch {
        // ignore auth metadata error
    }

    try {
        await db
            .from("profiles")
            .update({ demo_mode_active: false, updated_at: new Date().toISOString() })
            .eq("id", user.id)
    } catch {
        // ignore if demo_mode_active column not present yet
    }
}

export async function POST() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase

        // Clean any old demo first so enabling demo is always idempotent
        await cleanupDemoData(supabase, db, user)

        const { profile } = await getUserEntitlementsServer(db, user)
        const currency = profile?.base_currency || user.user_metadata?.currency || "PEN"

        // Ensure categories exist for this user (non-fatal if already present or restricted)
        try {
            await CategoryService.seedUserCategories(db, user.id)
        } catch (catErr) {
            console.warn("[DEMO_SEED_CATEGORIES_WARN]", catErr)
        }

        const [{ data: expCats }, { data: incCats }] = await Promise.all([
            db
                .from("expense_categories")
                .select("id, name")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
            db
                .from("income_categories")
                .select("id, name")
                .or(`user_id.is.null,user_id.eq.${user.id}`),
        ])

        const findCat = (list: any[] | null, nameQuery: string) =>
            list?.find((c) => c.name?.toLowerCase().includes(nameQuery.toLowerCase()))?.id ||
            list?.[0]?.id ||
            null

        const foodCatId = findCat(expCats, "comida")
        const housingCatId = findCat(expCats, "vivienda")
        const transportCatId = findCat(expCats, "transporte")
        const lifeCatId = findCat(expCats, "vida")
        const salaryCatId = findCat(incCats, "salario")

        const manifest: DemoManifest = {
            accountIds: [],
            transactionIds: [],
            budgetIds: [],
            goalIds: [],
            receivableIds: [],
            payableIds: [],
            recurringRuleIds: [],
            tagIds: [],
            tagNames: ["Fijo", "Trabajo", "Hogar", "Suscripción"],
        }

        // Helper for safe insert trying with is_demo first then without
        const safeInsert = async (table: string, row: Record<string, any>) => {
            const withDemo = { ...row, is_demo: true }
            const { data, error } = await db.from(table).insert(withDemo).select().single()
            if (!error && data) return data
            const { data: fallbackData, error: fallbackErr } = await db
                .from(table)
                .insert(row)
                .select()
                .single()
            if (fallbackErr) {
                console.warn(`[DEMO_SAFE_INSERT_WARN] table=${table}`, fallbackErr.message)
                return null
            }
            return fallbackData
        }

        // 1. Seed 3 realistic accounts (balances include net effect of demo transactions)
        const accBank = await safeInsert("accounts", {
            user_id: user.id,
            name: "Cuenta Principal (Demo)",
            account_type: "BANK",
            currency_code: currency,
            initial_balance: 3500,
            current_balance: 5640,
            color: "#6366F1",
            icon: "landmark",
            is_active: true,
        })
        const accCash = await safeInsert("accounts", {
            user_id: user.id,
            name: "Efectivo (Demo)",
            account_type: "CASH",
            currency_code: currency,
            initial_balance: 420,
            current_balance: 247,
            color: "#10B981",
            icon: "banknote",
            is_active: true,
        })
        const accCard = await safeInsert("accounts", {
            user_id: user.id,
            name: "Tarjeta Crédito (Demo)",
            account_type: "CREDIT_CARD",
            currency_code: currency,
            initial_balance: 0,
            current_balance: -45,
            credit_limit: 5000,
            used_balance: 45,
            closing_day: 20,
            payment_due_day: 5,
            color: "#F43F5E",
            icon: "credit-card",
            is_active: true,
        })

        if (accBank) manifest.accountIds.push(accBank.id)
        if (accCash) manifest.accountIds.push(accCash.id)
        if (accCard) manifest.accountIds.push(accCard.id)

        // 2. Seed creatable tags
        const tagDefs = [
            { name: "Fijo", color: "#6366F1" },
            { name: "Hogar", color: "#F59E0B" },
            { name: "Trabajo", color: "#10B981" },
            { name: "Suscripción", color: "#7C3AED" },
        ]
        for (const td of tagDefs) {
            const inserted = await safeInsert("user_tags", {
                user_id: user.id,
                name: td.name,
                color: td.color,
            })
            if (inserted?.id) manifest.tagIds.push(inserted.id)
        }

        // 3. Seed transactions in the current month
        const now = new Date()
        const daysAgoIso = (days: number, hour = 13) => {
            const d = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - days), hour, 15)
            return d.toISOString()
        }

        const demoTxs = [
            accBank && {
                user_id: user.id,
                transaction_type: "INCOME",
                account_id: accBank.id,
                amount: 3200,
                currency_code: currency,
                income_category_id: salaryCatId,
                transaction_date: daysAgoIso(10, 9),
                description: "Sueldo mensual",
                tags: ["Fijo", "Trabajo"],
                metadata: { is_demo: true, mode: "DEFAULT" },
            },
            accBank && {
                user_id: user.id,
                transaction_type: "EXPENSE",
                account_id: accBank.id,
                amount: 950,
                currency_code: currency,
                expense_category_id: housingCatId,
                transaction_date: daysAgoIso(8, 11),
                description: "Alquiler del departamento",
                tags: ["Fijo", "Hogar"],
                metadata: { is_demo: true, mode: "DEFAULT" },
            },
            accCash && {
                user_id: user.id,
                transaction_type: "EXPENSE",
                account_id: accCash.id,
                amount: 145,
                currency_code: currency,
                expense_category_id: foodCatId,
                transaction_date: daysAgoIso(4, 18),
                description: "Supermercado semanal",
                tags: ["Hogar"],
                metadata: { is_demo: true, mode: "DEFAULT" },
            },
            accCard && {
                user_id: user.id,
                transaction_type: "EXPENSE",
                account_id: accCard.id,
                amount: 45,
                currency_code: currency,
                expense_category_id: lifeCatId,
                transaction_date: daysAgoIso(2, 20),
                description: "Suscripción Streaming",
                tags: ["Suscripción", "Fijo"],
                metadata: { is_demo: true, mode: "SUBSCRIPTION", recurrence: "MONTHLY", isAutoExecute: true, scheduledType: "AUTO" },
            },
            accCash && {
                user_id: user.id,
                transaction_type: "EXPENSE",
                account_id: accCash.id,
                amount: 28,
                currency_code: currency,
                expense_category_id: transportCatId,
                transaction_date: daysAgoIso(1, 14),
                description: "Movilidad ciudad",
                tags: ["Trabajo"],
                metadata: { is_demo: true, mode: "DEFAULT" },
            },
            accBank && {
                user_id: user.id,
                transaction_type: "EXPENSE",
                account_id: accBank.id,
                amount: 110,
                currency_code: currency,
                expense_category_id: foodCatId,
                transaction_date: daysAgoIso(0, 12),
                description: "Almuerzo con equipo",
                tags: ["Trabajo"],
                metadata: { is_demo: true, mode: "DEFAULT" },
            },
        ].filter(Boolean) as Record<string, any>[]

        for (const txRow of demoTxs) {
            const tx = await safeInsert("transactions", txRow)
            if (tx?.id) manifest.transactionIds.push(tx.id)
        }

        // 4. Seed 2 Budgets
        const demoBudgets = [
            {
                user_id: user.id,
                name: "Alimentación (Demo)",
                amount: 600,
                budget_year: now.getFullYear(),
                budget_month: now.getMonth() + 1,
                currency_code: currency,
                type: "EXPENSE",
                color: "#EF4444",
                include_categories: [foodCatId],
                is_active: true,
            },
            {
                user_id: user.id,
                name: "Vivienda y servicios (Demo)",
                amount: 1200,
                budget_year: now.getFullYear(),
                budget_month: now.getMonth() + 1,
                currency_code: currency,
                type: "EXPENSE",
                color: "#F59E0B",
                include_categories: [housingCatId],
                is_active: true,
            },
        ]
        for (const b of demoBudgets) {
            const created = await safeInsert("budgets", b)
            if (created?.id) manifest.budgetIds.push(created.id)
        }

        // 5. Seed 2 Savings Goals
        const targetDate1 = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString().slice(0, 10)
        const targetDate2 = new Date(now.getFullYear(), now.getMonth() + 5, 1).toISOString().slice(0, 10)
        const demoGoals = [
            {
                user_id: user.id,
                name: "Fondo de emergencia (Demo)",
                goal_type: "EMERGENCY",
                priority: "HIGH",
                target_amount: 6000,
                current_amount: 2100,
                currency,
                primary_account_id: accBank?.id || null,
                target_date: targetDate1,
                color: "#10B981",
                icon: "emergency",
                status: "ACTIVE",
            },
            {
                user_id: user.id,
                name: "Viaje de vacaciones (Demo)",
                goal_type: "TRAVEL",
                priority: "MEDIUM",
                target_amount: 2500,
                current_amount: 850,
                currency,
                primary_account_id: accBank?.id || null,
                target_date: targetDate2,
                color: "#7C3AED",
                icon: "travel",
                status: "ACTIVE",
            },
        ]
        for (const g of demoGoals) {
            const created = await safeInsert("savings_goals", g)
            if (created?.id) manifest.goalIds.push(created.id)
        }

        // 6. Seed 1 Receivable + 1 Payable loan
        const dueNext = new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().slice(0, 10)
        const rec = await safeInsert("accounts_receivable", {
            user_id: user.id,
            contact_name: "Carlos Mendoza (Demo)",
            original_amount: 350,
            outstanding_balance: 350,
            currency_code: currency,
            status: "PENDING",
            due_date: dueNext,
            notes: "Préstamo de ejemplo",
            metadata: { is_demo: true },
        })
        if (rec?.id) manifest.receivableIds.push(rec.id)

        const pay = await safeInsert("accounts_payable", {
            user_id: user.id,
            contact_name: "Cuota Laptop (Demo)",
            original_amount: 800,
            outstanding_balance: 400,
            currency_code: currency,
            status: "PARTIAL",
            due_date: dueNext,
            notes: "Compra en cuotas de ejemplo",
            metadata: { is_demo: true },
        })
        if (pay?.id) manifest.payableIds.push(pay.id)

        // 7. Seed 1 Recurring rule
        if (accBank) {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
            const rule = await safeInsert("recurring_rules", {
                user_id: user.id,
                rule_name: "Internet fibra óptica (Demo)",
                transaction_type: "EXPENSE",
                account_id: accBank.id,
                amount: 89,
                currency_code: currency,
                expense_category_id: housingCatId,
                frequency: "MONTHLY",
                start_date: now.toISOString().slice(0, 10),
                next_occurrence: nextMonth,
                description: "Internet fibra óptica (Demo)",
                is_active: true,
                execution_method: "AUTO",
            })
            if (rule?.id) manifest.recurringRuleIds.push(rule.id)
        }

        // Save manifest & mark demo active
        try {
            await supabase.auth.updateUser({
                data: {
                    ...(user.user_metadata || {}),
                    demo_mode_active: true,
                    demo_manifest: manifest,
                },
            })
        } catch {
            // ignore auth metadata error
        }

        try {
            await db
                .from("profiles")
                .update({ demo_mode_active: true, updated_at: new Date().toISOString() })
                .eq("id", user.id)
        } catch {
            // ignore if demo_mode_active column not present yet
        }

        return NextResponse.json({ success: true, manifest })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[DEMO_POST]", error)
        return NextResponse.json(
            { error: error?.message || "No se pudo cargar el modo demo" },
            { status: 500 }
        )
    }
}

export async function DELETE() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const db = getServiceRoleClient() || supabase
        await cleanupDemoData(supabase, db, user)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[DEMO_DELETE]", error)
        return NextResponse.json({ error: "No se pudo desactivar el modo demo" }, { status: 500 })
    }
}
