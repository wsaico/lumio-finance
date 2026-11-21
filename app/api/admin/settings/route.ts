export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/admin-auth"
import {
    getSystemBrandingAndPlans,
    saveSubscriptionPlans,
    saveSystemSettings,
} from "@/lib/server/system-settings"

export async function GET() {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const data = await getSystemBrandingAndPlans(auth.adminClient)
    return NextResponse.json(data)
}

export async function PATCH(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const body = await req.json()
        let updatedSettings = null
        let updatedPlans = null

        if (body.settings) {
            updatedSettings = await saveSystemSettings(body.settings, auth.adminClient)
        }

        if (Array.isArray(body.plans)) {
            updatedPlans = await saveSubscriptionPlans(body.plans, auth.adminClient)
        }

        const latest = await getSystemBrandingAndPlans(auth.adminClient)
        return NextResponse.json({
            settings: updatedSettings || latest.settings,
            plans: updatedPlans || latest.plans,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[ADMIN_SETTINGS_PATCH]", error)
        return NextResponse.json({ error: "No se pudo guardar la configuración" }, { status: 500 })
    }
}
