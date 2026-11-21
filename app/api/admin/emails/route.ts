export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/server/admin-auth"
import {
    getResolvedEmailSettings,
    saveEmailSettings,
    toPublicEmailProviderConfig,
} from "@/lib/server/email-settings"
import {
    EMAIL_TEMPLATES_META,
    renderEmailTemplate,
    type EmailTemplateId,
} from "@/lib/server/email-templates"
import {
    getEmailTransportStatus,
    getRecentEmailLogs,
    sendTransactionalEmail,
} from "@/lib/server/mailer"
import { getSystemBrandingAndPlans } from "@/lib/server/system-settings"

export async function GET() {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const [{ settings }, resolved, transport] = await Promise.all([
            getSystemBrandingAndPlans(auth.adminClient),
            getResolvedEmailSettings(auth.adminClient),
            getEmailTransportStatus(auth.adminClient),
        ])

        const brand = {
            appName: settings.app_name,
            tagline: settings.tagline,
            primaryColor: settings.primary_color,
            siteUrl: resolved.siteUrl || "https://lumio.esaico.com",
            supportEmail: resolved.replyTo || "willysaico@gmail.com",
            logoUrl: settings.logo_white_url,
        }

        const templates = EMAIL_TEMPLATES_META.map((meta) =>
            renderEmailTemplate(
                meta.id,
                {
                    userName: "Wilber Saico",
                    userEmail: auth.user.email || "willysaico@gmail.com",
                    token: "482910",
                    trialDays: settings.trial_days || 15,
                    orderCode: "LUM-92X4K8",
                    planName: "Premium Anual",
                    amount: 79,
                    currency: settings.default_currency || "PEN",
                    paymentMethod: "YAPE",
                    operationNumber: "18492037",
                },
                brand
            )
        )

        return NextResponse.json({
            templates,
            transport,
            providerConfig: toPublicEmailProviderConfig(resolved),
            logs: getRecentEmailLogs(),
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json(
            { error: "No se pudieron cargar las plantillas de correo" },
            { status: 500 }
        )
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const body = await req.json()
        const { publicConfig } = await saveEmailSettings(body, {
            supabase: auth.adminClient,
            updatedBy: auth.user.id,
        })
        const transport = await getEmailTransportStatus(auth.adminClient)

        return NextResponse.json({
            ok: true,
            providerConfig: publicConfig,
            transport,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json(
            { error: error?.message || "No se pudo guardar la configuración de correo" },
            { status: 400 }
        )
    }
}

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    try {
        const body = await req.json()
        const templateId = body?.templateId as EmailTemplateId
        const to = String(body?.to || auth.user.email || "").trim()

        if (!templateId || !to || !to.includes("@")) {
            return NextResponse.json(
                { error: "Selecciona una plantilla y un correo destino válido." },
                { status: 400 }
            )
        }

        const result = await sendTransactionalEmail({
            to,
            userId: auth.user.id,
            templateId,
            data: {
                userName: "Wilber Saico",
                userEmail: to,
                token: "482910",
                trialDays: 15,
                orderCode: "LUM-TEST01",
                planName: "Premium Anual",
                amount: 79,
                currency: "PEN",
                paymentMethod: "YAPE",
                operationNumber: "00491827",
            },
        })

        return NextResponse.json({
            ok: result.ok,
            status: result.status,
            transport: result.transport,
            messageId: result.messageId,
            error: result.error,
            logs: getRecentEmailLogs(),
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                String(error).includes("Dynamic server usage"))
        ) {
            throw error
        }
        return NextResponse.json(
            { error: error?.message || "No se pudo enviar el correo de prueba" },
            { status: 500 }
        )
    }
}
