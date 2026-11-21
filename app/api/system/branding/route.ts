export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSystemBrandingAndPlans } from "@/lib/server/system-settings"

export async function GET() {
    try {
        const supabase = await createClient()
        const { settings, plans } = await getSystemBrandingAndPlans(supabase)

        return NextResponse.json({
            appName: settings.app_name,
            tagline: settings.tagline,
            logoLightUrl: settings.logo_light_url,
            logoDarkUrl: settings.logo_dark_url,
            logoWhiteUrl: settings.logo_white_url,
            primaryColor: settings.primary_color,
            defaultCurrency: settings.default_currency,
            trialDays: settings.trial_days,
            paymentConfig: settings.payment_config,
            plans: plans.filter((p) => p.is_active !== false),
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[SYSTEM_BRANDING_GET]", error)
        return NextResponse.json({ error: "Error loading branding" }, { status: 500 })
    }
}
