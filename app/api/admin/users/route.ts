export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/admin-auth"
import { isPrimaryAdminEmail } from "@/lib/entitlements"
import {
    getLocalFallbackStore,
    getServiceRoleClient,
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
        const serviceClient = getServiceRoleClient()
        const fallback = await getLocalFallbackStore()

        const [{ data: profiles }, subsRes] = await Promise.all([
            auth.adminClient.from("profiles").select("*").order("created_at", { ascending: false }),
            auth.adminClient.from("user_subscriptions").select("*"),
        ])
        const subs: any[] = !subsRes.error && Array.isArray(subsRes.data) ? subsRes.data : []

        let authUsers: any[] = []
        if (serviceClient) {
            const listRes = await serviceClient.auth.admin.listUsers({ perPage: 200 }).catch(() => null)
            authUsers = listRes?.data?.users || []
        }

        const emailMap = new Map(authUsers.map((u: any) => [u.id, u.email]))
        const subMap = new Map<string, any>((subs || []).map((s: any) => [s.user_id, s]))

        const merged = (profiles || []).map((p: any) => {
            const email = emailMap.get(p.id) || (p.id === auth.user.id ? auth.user.email : null)
            const sub = subMap.get(p.id)
            const override = fallback.userOverrides[p.id]

            return {
                id: p.id,
                full_name: p.full_name || "Usuario",
                email: email || p.username || "Sin correo visible",
                role: isPrimaryAdminEmail(email) || override?.role === "ADMIN" ? "ADMIN" : p.role || "USER",
                plan_tier: override?.plan_tier || p.plan_tier || (sub?.status === "ACTIVE" && sub?.plan_code !== "FREE" ? "PREMIUM" : "FREE"),
                plan_code: override?.plan_code || sub?.plan_code || "FREE",
                expires_at: override?.expires_at ?? sub?.expires_at ?? null,
                trial_ends_at: override?.trial_ends_at || p.trial_ends_at || null,
                country_code: p.country_code || "PE",
                created_at: p.created_at,
            }
        })

        return NextResponse.json(merged)
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        console.error("[ADMIN_USERS_GET]", error)
        return NextResponse.json({ error: "Error cargando usuarios" }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const body = await req.json()
        const { userId, planCode, role } = body

        if (!userId) {
            return NextResponse.json({ error: "userId requerido" }, { status: 400 })
        }

        const nowIso = new Date().toISOString()
        const { plans } = await getSystemBrandingAndPlans(auth.adminClient)

        let planTier: "FREE" | "PREMIUM" = "FREE"
        let expiresAt: string | null = null

        if (planCode) {
            if (planCode === "FREE") {
                planTier = "FREE"
                try {
                    await auth.adminClient.from("user_subscriptions").upsert(
                        {
                            user_id: userId,
                            plan_code: "FREE",
                            status: "CANCELLED",
                            expires_at: nowIso,
                            updated_by: auth.user.id,
                            updated_at: nowIso,
                        },
                        { onConflict: "user_id" }
                    )
                    await auth.adminClient
                        .from("profiles")
                        .update({ plan_tier: "FREE", trial_ends_at: nowIso, updated_at: nowIso })
                        .eq("id", userId)
                } catch {
                    // fallback
                }
            } else {
                const plan = plans.find((p) => p.code === planCode)
                planTier = "PREMIUM"
                expiresAt =
                    plan?.duration_days && plan.duration_days > 0
                        ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString()
                        : null

                try {
                    await auth.adminClient.from("user_subscriptions").upsert(
                        {
                            user_id: userId,
                            plan_code: planCode,
                            status: "ACTIVE",
                            started_at: nowIso,
                            expires_at: expiresAt,
                            updated_by: auth.user.id,
                            updated_at: nowIso,
                        },
                        { onConflict: "user_id" }
                    )
                    await auth.adminClient
                        .from("profiles")
                        .update({ plan_tier: "PREMIUM", updated_at: nowIso })
                        .eq("id", userId)
                } catch {
                    // fallback
                }

                // Dispatch SUBSCRIPTION_ACTIVATED email
                try {
                    const [{ data: prof }, uRes] = await Promise.all([
                        auth.adminClient
                            .from("profiles")
                            .select("full_name")
                            .eq("id", userId)
                            .maybeSingle(),
                        auth.adminClient.auth.admin.getUserById(userId).catch(() => null),
                    ])
                    const targetEmail = uRes?.data?.user?.email
                    if (targetEmail) {
                        await sendTransactionalEmail({
                            to: targetEmail,
                            userId,
                            templateId: "SUBSCRIPTION_ACTIVATED",
                            data: {
                                userName: prof?.full_name || targetEmail.split("@")[0],
                                userEmail: targetEmail,
                                orderCode: "ADMIN-DIRECT",
                                planName: plan?.name || planCode,
                                planCode,
                                expiresAt,
                            },
                        })
                    }
                } catch {
                    // safe ignore
                }
            }
        }

        if (role && ["USER", "ADMIN"].includes(role)) {
            try {
                await auth.adminClient
                    .from("profiles")
                    .update({ role, updated_at: nowIso })
                    .eq("id", userId)
            } catch {
                // fallback
            }
        }

        await updateLocalFallbackStore((store) => ({
            ...store,
            userOverrides: {
                ...store.userOverrides,
                [userId]: {
                    ...(store.userOverrides[userId] || {}),
                    plan_code: planCode || store.userOverrides[userId]?.plan_code || "FREE",
                    plan_tier: planCode ? planTier : store.userOverrides[userId]?.plan_tier || "FREE",
                    status: planCode === "FREE" ? "CANCELLED" : "ACTIVE",
                    expires_at: planCode === "FREE" ? nowIso : expiresAt,
                    ...(planCode === "FREE" ? { trial_ends_at: nowIso } : {}),
                    ...(role ? { role } : {}),
                },
            },
        }))

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json({ error: "Error actualizando usuario" }, { status: 500 })
    }
}
