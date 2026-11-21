export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getRegionByCountry } from "@/lib/regions"
import { resolveTimezone } from "@/lib/timezone"

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const {
            budgeting_method,
            country_code,
            base_currency,
            timezone,
            onboarding_completed,
            full_name,
        } = body

        const profileUpdate: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }
        const metaUpdate: Record<string, any> = {
            ...(user.user_metadata || {}),
        }

        if (budgeting_method) {
            profileUpdate.budgeting_method = budgeting_method
            metaUpdate.budgeting_method = budgeting_method
        }

        if (country_code) {
            const region = getRegionByCountry(country_code)
            profileUpdate.country_code = region.code
            metaUpdate.country_code = region.code
            if (!base_currency) {
                profileUpdate.base_currency = region.currencyCode
                profileUpdate.default_currency = region.currencyCode
                metaUpdate.currency = region.currencyCode
            }
            if (!timezone) {
                profileUpdate.timezone = region.timezone
                metaUpdate.timezone = region.timezone
            }
        }

        if (base_currency) {
            const upper = String(base_currency).toUpperCase()
            profileUpdate.base_currency = upper
            profileUpdate.default_currency = upper
            metaUpdate.currency = upper
        }

        if (timezone) {
            const safeTz = resolveTimezone(timezone)
            profileUpdate.timezone = safeTz
            metaUpdate.timezone = safeTz
        }

        if (typeof onboarding_completed === "boolean") {
            profileUpdate.onboarding_completed = onboarding_completed
            metaUpdate.onboarding_completed = onboarding_completed
        }

        if (typeof full_name === "string" && full_name.trim()) {
            profileUpdate.full_name = full_name.trim()
            metaUpdate.full_name = full_name.trim()
        }

        // Persist in auth metadata (works even before optional SQL migration columns exist)
        await supabase.auth.updateUser({ data: metaUpdate }).catch(() => null)

        // Update profiles table gracefully (strip missing columns if migration hasn't run yet)
        let data: any = null
        const { data: updated, error } = await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("id", user.id)
            .select()
            .maybeSingle()

        if (error) {
            // Fallback: update only core schema columns
            const coreUpdate: Record<string, any> = {
                updated_at: new Date().toISOString(),
            }
            if (profileUpdate.budgeting_method)
                coreUpdate.budgeting_method = profileUpdate.budgeting_method
            if (profileUpdate.base_currency) {
                coreUpdate.base_currency = profileUpdate.base_currency
                coreUpdate.default_currency = profileUpdate.default_currency
            }
            if (profileUpdate.full_name) coreUpdate.full_name = profileUpdate.full_name

            const { data: retryData } = await supabase
                .from("profiles")
                .update(coreUpdate)
                .eq("id", user.id)
                .select()
                .maybeSingle()
            data = retryData
        } else {
            data = updated
        }

        // Auto-categorization logic for 50/30/20
        if (budgeting_method === "50_30_20") {
            try {
                const { data: categories } = await supabase
                    .from("expense_categories")
                    .select("id, name")
                    .eq("user_id", user.id)

                if (categories && categories.length > 0) {
                    const NEED_KEYWORDS = [
                        "vivienda",
                        "alimentación",
                        "comida",
                        "salud",
                        "educación",
                        "transporte",
                        "servicios",
                        "impuestos",
                        "seguros",
                        "alquiler",
                        "luz",
                        "agua",
                        "internet",
                    ]
                    const WANT_KEYWORDS = [
                        "ocio",
                        "compras",
                        "cuidado",
                        "regalos",
                        "tecnología",
                        "restaurante",
                        "viajes",
                        "entretenimiento",
                        "vicios",
                        "mascotas",
                        "streaming",
                        "suscripciones",
                    ]
                    const SAVINGS_KEYWORDS = [
                        "ahorro",
                        "inversión",
                        "deudas",
                        "fondo",
                        "emergencia",
                    ]

                    await Promise.all(
                        categories.map((cat: any) => {
                            let rule = "WANT"
                            const lowerName = cat.name.toLowerCase()
                            if (NEED_KEYWORDS.some((k) => lowerName.includes(k))) rule = "NEED"
                            else if (SAVINGS_KEYWORDS.some((k) => lowerName.includes(k)))
                                rule = "SAVINGS"
                            else if (WANT_KEYWORDS.some((k) => lowerName.includes(k)))
                                rule = "WANT"

                            return supabase
                                .from("expense_categories")
                                .update({ budget_rule: rule })
                                .eq("id", cat.id)
                                .eq("user_id", user.id)
                        })
                    )
                }
            } catch (autoConfigError) {
                console.error("[AUTO_CONFIG_50_30_20]", autoConfigError)
            }
        }

        return NextResponse.json({
            ...(data || {}),
            ...metaUpdate,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }

        console.error("[PROFILE_UPDATE]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()

        const meta = user.user_metadata || {}

        return NextResponse.json({
            ...(data || {}),
            country_code: data?.country_code || meta.country_code || "PE",
            timezone: data?.timezone || meta.timezone || "America/Lima",
            base_currency: data?.base_currency || meta.currency || "PEN",
            onboarding_completed: Boolean(
                data?.onboarding_completed ?? meta.onboarding_completed ?? false
            ),
            demo_mode_active: Boolean(
                data?.demo_mode_active ?? meta.demo_mode_active ?? false
            ),
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }

        console.error("[PROFILE_GET]", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
