export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGoogleDriveService } from "@/lib/google-drive"

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: token } = await supabase
            .from("google_tokens")
            .select("id, updated_at, expiry_date")
            .eq("user_id", user.id)
            .maybeSingle()

        const configured = Boolean(
            process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        )

        return NextResponse.json({
            connected: Boolean(token),
            oauthConfigured: configured,
            updatedAt: token?.updated_at || null,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json({ connected: false, oauthConfigured: false })
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

        await supabase.from("google_tokens").delete().eq("user_id", user.id)
        return NextResponse.json({ connected: false })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json({ error: "No se pudo desconectar" }, { status: 500 })
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

        const driveService = await getGoogleDriveService(user.id, supabase)
        const [accountsRes, txRes, budgetsRes, goalsRes] = await Promise.all([
            supabase.from("accounts").select("*").eq("user_id", user.id),
            supabase.from("transactions").select("*").eq("user_id", user.id),
            supabase.from("budgets").select("*").eq("user_id", user.id),
            supabase.from("savings_goals").select("*").eq("user_id", user.id),
        ])

        const payload = JSON.stringify(
            {
                version: "2.4.0",
                exportedAt: new Date().toISOString(),
                userEmail: user.email,
                data: {
                    accounts: accountsRes.data || [],
                    transactions: txRes.data || [],
                    budgets: budgetsRes.data || [],
                    savings_goals: goalsRes.data || [],
                },
            },
            null,
            2
        )

        const stamp = new Date().toISOString().slice(0, 10)
        const result = await driveService.uploadBuffer(
            Buffer.from(payload, "utf-8"),
            `Lumio-Backup-${stamp}.json`,
            "application/json",
            "Backups"
        )

        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json(
            { error: error?.message || "No se pudo guardar en Google Drive" },
            { status: 400 }
        )
    }
}
