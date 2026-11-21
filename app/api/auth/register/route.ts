export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServiceRoleClient } from "@/lib/server/system-settings"
import { isPrimaryAdminEmail } from "@/lib/entitlements"
import { sendTransactionalEmail } from "@/lib/server/mailer"

// Common disposable/spam email domains blocked at registration
const DISPOSABLE_DOMAINS = new Set([
    "mailinator.com",
    "tempmail.com",
    "temp-mail.org",
    "10minutemail.com",
    "guerrillamail.com",
    "yopmail.com",
    "trashmail.com",
    "sharklasers.com",
    "getnada.com",
    "maildrop.cc",
    "dispostable.com",
    "fakeinbox.com",
])

// In-memory rate-limit map per email to prevent OTP spam bursts
const otpCooldownMap = new Map<string, number>()
const COOLDOWN_MS = 45_000

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const action = body?.action || "check"

        if (action === "check") {
            const rawEmail = String(body?.email || "")
                .trim()
                .toLowerCase()
            if (!rawEmail || !rawEmail.includes("@")) {
                return NextResponse.json(
                    { error: "Ingresa un correo electrónico válido." },
                    { status: 400 }
                )
            }

            const domain = rawEmail.split("@")[1] || ""
            if (DISPOSABLE_DOMAINS.has(domain)) {
                return NextResponse.json(
                    {
                        error: "No se permiten correos temporales o desechables. Usa tu correo personal o corporativo.",
                    },
                    { status: 400 }
                )
            }

            const lastSent = otpCooldownMap.get(rawEmail) || 0
            const elapsed = Date.now() - lastSent
            if (elapsed < COOLDOWN_MS && !body?.isResend) {
                const waitSec = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
                return NextResponse.json(
                    {
                        error: `Ya enviamos un código recientemente. Espera ${waitSec}s antes de solicitar otro.`,
                    },
                    { status: 429 }
                )
            }

            const admin = getServiceRoleClient()
            if (admin) {
                const { data: usersData } = await admin.auth.admin.listUsers({
                    page: 1,
                    perPage: 500,
                })
                const existing = (usersData?.users || []).find(
                    (u) => u.email?.toLowerCase() === rawEmail
                )
                // If user exists with pending_verification=true and otp_verified!==true,
                // they never completed OTP + password setup (e.g. closed tab or code expired).
                // Allow them to re-request OTP instead of trapping them in limbo!
                const isIncompletePending =
                    existing?.user_metadata?.pending_verification === true &&
                    existing?.user_metadata?.otp_verified !== true

                if (
                    existing &&
                    !isIncompletePending &&
                    (existing.user_metadata?.otp_verified === true ||
                        Boolean(existing.last_sign_in_at) ||
                        (Array.isArray(existing.identities) &&
                            existing.identities.length > 0))
                ) {
                    return NextResponse.json(
                        {
                            error: "Este correo ya está registrado. Inicia sesión con tu contraseña.",
                            code: "USER_ALREADY_EXISTS",
                        },
                        { status: 409 }
                    )
                }
            }

            otpCooldownMap.set(rawEmail, Date.now())
            return NextResponse.json({ ok: true })
        }

        if (action === "complete") {
            const supabase = await createClient()
            const {
                data: { user },
                error: authErr,
            } = await supabase.auth.getUser()

            if (authErr || !user) {
                return NextResponse.json(
                    { error: "Sesión de verificación no encontrada. Verifica el código nuevamente." },
                    { status: 401 }
                )
            }

            const fullName = String(body?.fullName || user.user_metadata?.full_name || "")
                .trim()
            const password = String(body?.password || "")
            const countryCode = String(
                body?.countryCode || user.user_metadata?.country_code || "PE"
            )
            const currency = String(body?.currency || user.user_metadata?.currency || "PEN")
            const timezone = String(
                body?.timezone || user.user_metadata?.timezone || "America/Lima"
            )

            if (password.length < 6) {
                return NextResponse.json(
                    { error: "La contraseña debe tener al menos 6 caracteres." },
                    { status: 400 }
                )
            }

            const nextMeta = {
                ...(user.user_metadata || {}),
                full_name: fullName || (user.email ? user.email.split("@")[0] : "Usuario"),
                country_code: countryCode,
                currency,
                timezone,
                otp_verified: true,
                pending_verification: false,
            }

            const admin = getServiceRoleClient()
            if (admin) {
                const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
                    password,
                    email_confirm: true,
                    user_metadata: nextMeta,
                })
                if (updateErr) {
                    return NextResponse.json(
                        { error: updateErr.message || "No se pudo guardar la contraseña." },
                        { status: 400 }
                    )
                }

                // Ensure public.profiles row exists immediately so accounts/budgets FK never fails
                const isOwner = isPrimaryAdminEmail(user.email)
                try {
                    await admin.from("profiles").upsert(
                        {
                            id: user.id,
                            full_name: nextMeta.full_name,
                            default_currency: currency,
                            base_currency: currency,
                            country_code: countryCode,
                            timezone,
                            role: isOwner ? "ADMIN" : "USER",
                            plan_tier: isOwner ? "PREMIUM" : "FREE",
                            trial_started_at: new Date().toISOString(),
                        },
                        { onConflict: "id" }
                    )
                } catch {
                    await admin.from("profiles").upsert(
                        {
                            id: user.id,
                            full_name: nextMeta.full_name,
                            default_currency: currency,
                            base_currency: currency,
                        },
                        { onConflict: "id" }
                    )
                }
            } else {
                const { error: selfErr } = await supabase.auth.updateUser({
                    password,
                    data: nextMeta,
                })
                if (selfErr) {
                    return NextResponse.json(
                        { error: selfErr.message || "No se pudo finalizar el registro." },
                        { status: 400 }
                    )
                }
            }

            // Fire Welcome + 15-day Trial activation email
            if (user.email) {
                await sendTransactionalEmail({
                    to: user.email,
                    userId: user.id,
                    templateId: "WELCOME_TRIAL",
                    data: {
                        userName: nextMeta.full_name,
                        userEmail: user.email,
                        trialDays: 15,
                    },
                }).catch(() => null)
            }

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
    } catch (error: any) {
        console.error("[REGISTER_API_ERROR]", error)
        return NextResponse.json(
            { error: error?.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
