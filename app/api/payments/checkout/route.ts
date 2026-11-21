export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
    getServiceRoleClient,
    getSystemBrandingAndPlans,
    updateLocalFallbackStore,
    type FallbackPaymentOrder,
} from "@/lib/server/system-settings"
import * as z from "zod"

const checkoutSchema = z.object({
    provider: z.enum(["CULQI", "PAYPAL"]),
    planCode: z.enum([
        "PREMIUM_MONTHLY",
        "PREMIUM_SEMIANNUAL",
        "PREMIUM_ANNUAL",
        "PREMIUM_LIFETIME",
    ]),
    currencyCode: z.enum(["PEN", "USD"]).default("PEN"),
    tokenId: z.string().optional(),
    paypalOrderId: z.string().optional(),
})

async function activatePlanForUser(params: {
    userId: string
    userEmail?: string | null
    planCode: string
    durationDays: number | null
    orderId: string
}) {
    const adminClient = getServiceRoleClient()
    const expiresAt =
        params.durationDays && params.durationDays > 0
            ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
            : null

    if (adminClient) {
        try {
            await adminClient.from("user_subscriptions").upsert(
                {
                    user_id: params.userId,
                    plan_code: params.planCode,
                    status: "ACTIVE",
                    started_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    payment_order_id: params.orderId,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" }
            )
            await adminClient
                .from("profiles")
                .update({ plan_tier: "PREMIUM", updated_at: new Date().toISOString() })
                .eq("id", params.userId)
        } catch {
            // fallback preserved below
        }
    }

    await updateLocalFallbackStore((store) => ({
        ...store,
        userOverrides: {
            ...store.userOverrides,
            [params.userId]: {
                plan_code: params.planCode,
                plan_tier: "PREMIUM",
                status: "ACTIVE",
                expires_at: expiresAt,
            },
        },
    }))

    return expiresAt
}

export async function GET() {
    return NextResponse.json({
        culqiConfigured: Boolean(
            process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY && process.env.CULQI_SECRET_KEY
        ),
        paypalConfigured: Boolean(
            process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
        ),
    })
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
        const parsed = checkoutSchema.parse(body)
        const { plans } = await getSystemBrandingAndPlans(supabase)
        const plan = plans.find((p) => p.code === parsed.planCode)
        if (!plan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
        }

        const amount = parsed.currencyCode === "USD" ? plan.price_usd : plan.price_pen

        if (parsed.provider === "CULQI") {
            const culqiSecret = process.env.CULQI_SECRET_KEY?.trim()
            if (!culqiSecret || !parsed.tokenId) {
                return NextResponse.json(
                    {
                        error: "Pasarela Culqi aún sin llaves de producción configuradas. Puedes completar tu pago con Yape, Plin o transferencia con activación rápida.",
                        code: "PROVIDER_NOT_CONFIGURED",
                    },
                    { status: 400 }
                )
            }

            const chargeRes = await fetch("https://api.culqi.com/v2/charges", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${culqiSecret}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    amount: Math.round(amount * 100),
                    currency_code: parsed.currencyCode,
                    email: user.email,
                    source_id: parsed.tokenId,
                    description: `Lumio ${plan.name}`,
                }),
            })

            const chargeData = await chargeRes.json()
            if (!chargeRes.ok) {
                return NextResponse.json(
                    { error: chargeData?.user_message || "No se pudo procesar el cobro con tarjeta" },
                    { status: 400 }
                )
            }

            const order: FallbackPaymentOrder = {
                id: crypto.randomUUID(),
                order_code: `LUM-${String(chargeData.id || "").slice(-6).toUpperCase() || "CARD"}`,
                user_id: user.id,
                user_email: user.email,
                plan_code: plan.code,
                payment_method: "CARD",
                amount,
                currency_code: parsed.currencyCode,
                operation_number: chargeData.id,
                status: "APPROVED",
                reviewed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            }

            const adminClient = getServiceRoleClient() || supabase
            await adminClient.from("payment_orders").insert(order).catch(() => null)
            await activatePlanForUser({
                userId: user.id,
                userEmail: user.email,
                planCode: plan.code,
                durationDays: plan.duration_days,
                orderId: order.id,
            })

            return NextResponse.json({ success: true, order })
        }

        // PAYPAL verification if configured
        const paypalClient = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim()
        const paypalSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
        if (!paypalClient || !paypalSecret || !parsed.paypalOrderId) {
            return NextResponse.json(
                {
                    error: "PayPal automático pendiente de llaves API. Puedes registrar tu pago directo o usar Yape / Plin.",
                    code: "PROVIDER_NOT_CONFIGURED",
                },
                { status: 400 }
            )
        }

        return NextResponse.json({ error: "Orden PayPal no verificada" }, { status: 400 })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json({ error: "Error en checkout" }, { status: 500 })
    }
}
