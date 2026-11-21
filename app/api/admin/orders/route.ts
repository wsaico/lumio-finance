export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/admin-auth"
import {
    getLocalFallbackStore,
    getSystemBrandingAndPlans,
    updateLocalFallbackStore,
} from "@/lib/server/system-settings"
import { sendTransactionalEmail } from "@/lib/server/mailer"

export async function GET() {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const { data, error } = await auth.adminClient
            .from("payment_orders")
            .select("*")
            .order("created_at", { ascending: false })

        const fallback = await getLocalFallbackStore()
        if (!error && Array.isArray(data)) {
            const seen = new Set(data.map((d: any) => d.order_code))
            const merged = [...data, ...fallback.orders.filter((o) => !seen.has(o.order_code))]
            return NextResponse.json(merged)
        }

        return NextResponse.json(fallback.orders)
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

export async function PATCH(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const body = await req.json()
        const { orderId, status, rejectionReason } = body

        if (!orderId || !["APPROVED", "REJECTED"].includes(status)) {
            return NextResponse.json({ error: "Datos de revisión inválidos" }, { status: 400 })
        }

        // Find order from DB or fallback
        let order: any = null
        try {
            const { data } = await auth.adminClient
                .from("payment_orders")
                .select("*")
                .eq("id", orderId)
                .maybeSingle()
            order = data
        } catch {
            order = null
        }

        if (!order) {
            const fallback = await getLocalFallbackStore()
            order = fallback.orders.find((o) => o.id === orderId)
        }

        if (!order) {
            return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
        }

        const reviewedAt = new Date().toISOString()

        // Update DB payment_orders if available
        try {
            await auth.adminClient
                .from("payment_orders")
                .update({
                    status,
                    rejection_reason: status === "REJECTED" ? rejectionReason || "Comprobante no verificado" : null,
                    reviewed_by: auth.user.id,
                    reviewed_at: reviewedAt,
                })
                .eq("id", orderId)
        } catch {
            // fallback handled below
        }

        // Compute expiration if APPROVED and dispatch transactional email
        const { plans } = await getSystemBrandingAndPlans(auth.adminClient)
        const plan = plans.find((p) => p.code === order.plan_code)
        let expiresAt: string | null = null
        if (status === "APPROVED") {
            expiresAt =
                plan?.duration_days && plan.duration_days > 0
                    ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString()
                    : null

            try {
                await auth.adminClient.from("user_subscriptions").upsert(
                    {
                        user_id: order.user_id,
                        plan_code: order.plan_code,
                        status: "ACTIVE",
                        started_at: reviewedAt,
                        expires_at: expiresAt,
                        payment_order_id: order.id,
                        updated_by: auth.user.id,
                        updated_at: reviewedAt,
                    },
                    { onConflict: "user_id" }
                )

                await auth.adminClient
                    .from("profiles")
                    .update({ plan_tier: "PREMIUM", updated_at: reviewedAt })
                    .eq("id", order.user_id)
            } catch {
                // fallback overrides below
            }
        }

        // Resolve user email & name to dispatch approval or rejection email
        let targetEmail = order.user_email || ""
        let targetName = "Usuario"
        try {
            const { data: prof } = await auth.adminClient
                .from("profiles")
                .select("full_name")
                .eq("id", order.user_id)
                .maybeSingle()
            if (prof?.full_name) targetName = prof.full_name
            if (!targetEmail) {
                const { data: uRes } = await auth.adminClient.auth.admin.getUserById(
                    order.user_id
                )
                targetEmail = uRes?.user?.email || ""
            }
        } catch {
            // ignore
        }

        if (targetEmail) {
            await sendTransactionalEmail({
                to: targetEmail,
                userId: order.user_id,
                templateId:
                    status === "APPROVED"
                        ? "SUBSCRIPTION_ACTIVATED"
                        : "PAYMENT_ORDER_REJECTED",
                data: {
                    userName: targetName,
                    userEmail: targetEmail,
                    orderCode: order.order_code,
                    planName: plan?.name || order.plan_code,
                    planCode: order.plan_code,
                    amount: order.amount,
                    currency: order.currency_code,
                    expiresAt,
                    rejectionReason:
                        rejectionReason ||
                        "No pudimos verificar el número de operación o la imagen adjunta.",
                },
            }).catch(() => null)
        }

        await updateLocalFallbackStore((store) => ({
            ...store,
            orders: store.orders.map((o) =>
                o.id === orderId
                    ? {
                          ...o,
                          status,
                          rejection_reason: rejectionReason || null,
                          reviewed_by: auth.user.id,
                          reviewed_at: reviewedAt,
                      }
                    : o
            ),
            userOverrides:
                status === "APPROVED"
                    ? {
                          ...store.userOverrides,
                          [order.user_id]: {
                              plan_code: order.plan_code,
                              plan_tier: "PREMIUM",
                              status: "ACTIVE",
                              expires_at: expiresAt,
                          },
                      }
                    : store.userOverrides,
        }))

        return NextResponse.json({ success: true, status, expiresAt })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[ADMIN_ORDER_PATCH]", error)
        return NextResponse.json({ error: "No se pudo actualizar la orden" }, { status: 500 })
    }
}
