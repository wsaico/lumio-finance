export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
    getLocalFallbackStore,
    getServiceRoleClient,
    getSystemBrandingAndPlans,
    updateLocalFallbackStore,
    type FallbackPaymentOrder,
} from "@/lib/server/system-settings"
import { sendTransactionalEmail } from "@/lib/server/mailer"
import * as z from "zod"

const createOrderSchema = z.object({
    planCode: z.enum([
        "PREMIUM_MONTHLY",
        "PREMIUM_SEMIANNUAL",
        "PREMIUM_ANNUAL",
        "PREMIUM_LIFETIME",
    ]),
    paymentMethod: z.enum(["YAPE", "PLIN", "CARD", "PAYPAL"]),
    currencyCode: z.enum(["PEN", "USD"]).default("PEN"),
    operationNumber: z.string().trim().min(3, "Ingresa el código o número de operación").max(80),
    proofUrl: z.string().optional().nullable(),
    notes: z.string().optional(),
})

function generateOrderCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = "LUM-"
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export async function GET() {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const adminClient = getServiceRoleClient() || supabase
        const { data, error } = await adminClient
            .from("payment_orders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

        const fallback = await getLocalFallbackStore()
        const localOrders = fallback.orders.filter((o) => o.user_id === user.id)

        if (!error && Array.isArray(data)) {
            const seen = new Set(data.map((d: any) => d.order_code))
            const merged = [...data, ...localOrders.filter((o) => !seen.has(o.order_code))]
            return NextResponse.json(merged)
        }

        return NextResponse.json(localOrders)
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json({ error: "Error cargando órdenes" }, { status: 500 })
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
        const parsed = createOrderSchema.parse(body)

        const { plans } = await getSystemBrandingAndPlans(supabase)
        const selectedPlan = plans.find((p) => p.code === parsed.planCode)
        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 })
        }

        const amount =
            parsed.currencyCode === "USD" ? selectedPlan.price_usd : selectedPlan.price_pen

        const orderRecord: FallbackPaymentOrder = {
            id: crypto.randomUUID(),
            order_code: generateOrderCode(),
            user_id: user.id,
            user_email: user.email,
            plan_code: parsed.planCode,
            payment_method: parsed.paymentMethod,
            amount,
            currency_code: parsed.currencyCode,
            operation_number: parsed.operationNumber,
            proof_url: parsed.proofUrl || null,
            status: "PENDING_VERIFICATION",
            metadata: { notes: parsed.notes || "" },
            created_at: new Date().toISOString(),
        }

        const adminClient = getServiceRoleClient() || supabase
        if (user.email) {
            await sendTransactionalEmail({
                to: user.email,
                userId: user.id,
                templateId: "PAYMENT_ORDER_RECEIVED",
                data: {
                    userName: user.user_metadata?.full_name || user.email.split("@")[0],
                    userEmail: user.email,
                    orderCode: orderRecord.order_code,
                    planName: selectedPlan.name,
                    planCode: selectedPlan.code,
                    amount: orderRecord.amount,
                    currency: orderRecord.currency_code,
                    paymentMethod: orderRecord.payment_method,
                    operationNumber: orderRecord.operation_number || "",
                },
            }).catch(() => null)
        }

        try {
            const { data: inserted, error } = await adminClient
                .from("payment_orders")
                .insert(orderRecord)
                .select()
                .single()

            if (!error && inserted) {
                return NextResponse.json(inserted, { status: 201 })
            }
        } catch {
            // Fall through to local resilient store
        }

        await updateLocalFallbackStore((store) => ({
            ...store,
            orders: [orderRecord, ...store.orders],
        }))

        return NextResponse.json(orderRecord, { status: 201 })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            )
        }
        console.error("[PAYMENT_ORDER_POST]", error)
        return NextResponse.json({ error: "No se pudo registrar tu pago" }, { status: 500 })
    }
}
