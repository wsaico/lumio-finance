export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { entitlements } = await getUserEntitlementsServer(supabase, user)
        if (!entitlements.canExportReports) {
            return NextResponse.json(
                { error: "Las copias de seguridad requieren Plan Premium.", code: "PREMIUM_REQUIRED" },
                { status: 403 }
            )
        }

        const [
            accountsRes,
            txRes,
            budgetsRes,
            goalsRes,
            recRes,
            payRes,
            rulesRes,
            expCatRes,
            incCatRes,
            tagsRes,
        ] = await Promise.all([
            supabase.from("accounts").select("*").eq("user_id", user.id),
            supabase.from("transactions").select("*").eq("user_id", user.id),
            supabase.from("budgets").select("*").eq("user_id", user.id),
            supabase.from("savings_goals").select("*").eq("user_id", user.id),
            supabase.from("accounts_receivable").select("*").eq("user_id", user.id),
            supabase.from("accounts_payable").select("*").eq("user_id", user.id),
            supabase.from("recurring_rules").select("*").eq("user_id", user.id),
            supabase.from("expense_categories").select("*").eq("user_id", user.id),
            supabase.from("income_categories").select("*").eq("user_id", user.id),
            supabase.from("user_tags").select("*").eq("user_id", user.id),
        ])

        const backup = {
            version: "2.4.0",
            exportedAt: new Date().toISOString(),
            userEmail: user.email,
            data: {
                accounts: accountsRes.data || [],
                transactions: txRes.data || [],
                budgets: budgetsRes.data || [],
                savings_goals: goalsRes.data || [],
                accounts_receivable: recRes.data || [],
                accounts_payable: payRes.data || [],
                recurring_rules: rulesRes.data || [],
                expense_categories: expCatRes.data || [],
                income_categories: incCatRes.data || [],
                user_tags: tagsRes.data || user.user_metadata?.custom_tags || [],
            },
        }

        const stamp = new Date().toISOString().slice(0, 10)
        return new NextResponse(JSON.stringify(backup, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="Lumio-Backup-${stamp}.json"`,
            },
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[BACKUP_GET]", error)
        return NextResponse.json({ error: "No se pudo generar el respaldo" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const payload = body?.data
        if (!payload || typeof payload !== "object") {
            return NextResponse.json({ error: "Archivo de respaldo inválido" }, { status: 400 })
        }

        const sanitizeRows = (rows: any[]) =>
            rows.map((r) => ({
                ...r,
                user_id: user.id,
            }))

        let restoredCount = 0

        const tablesInOrder = [
            "expense_categories",
            "income_categories",
            "user_tags",
            "accounts",
            "savings_goals",
            "budgets",
            "accounts_receivable",
            "accounts_payable",
            "recurring_rules",
            "transactions",
        ]

        for (const table of tablesInOrder) {
            const rows = payload[table]
            if (Array.isArray(rows) && rows.length > 0) {
                const { error } = await supabase
                    .from(table)
                    .upsert(sanitizeRows(rows), { onConflict: "id" })
                if (!error) {
                    restoredCount += rows.length
                }
            }
        }

        return NextResponse.json({ success: true, restoredCount })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[BACKUP_POST]", error)
        return NextResponse.json({ error: "No se pudo restaurar el respaldo" }, { status: 500 })
    }
}
