export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserEntitlementsServer } from "@/lib/server/entitlements"
import { getSystemBrandingAndPlans } from "@/lib/server/system-settings"

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const [resolved, systemData] = await Promise.all([
            getUserEntitlementsServer(supabase, user),
            getSystemBrandingAndPlans(supabase),
        ])

        return NextResponse.json({
            entitlements: resolved.entitlements,
            countryCode: resolved.countryCode,
            timezone: resolved.timezone,
            demoModeActive: resolved.demoModeActive,
            onboardingCompleted: resolved.onboardingCompleted,
            plans: systemData.plans.filter((p) => p.is_active !== false),
            paymentConfig: systemData.settings.payment_config,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[SUBSCRIPTION_GET]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
