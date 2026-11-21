import {
    renderEmailTemplate,
    type EmailTemplateId,
    type EmailTemplatePayload,
    type RenderedEmailTemplate,
} from "./email-templates"
import {
    getServiceRoleClient,
    getSystemBrandingAndPlans,
} from "./system-settings"

export interface EmailDispatchLogItem {
    id: string
    to: string
    templateId: EmailTemplateId
    subject: string
    transport: "RESEND" | "WEBHOOK" | "IN_APP_LOG"
    status: "SENT" | "QUEUED_LOG" | "FAILED"
    error?: string
    createdAt: string
}

const recentEmailLogs: EmailDispatchLogItem[] = []

export function getRecentEmailLogs(): EmailDispatchLogItem[] {
    return recentEmailLogs.slice(0, 40)
}

export function getEmailTransportStatus(): {
    resendConfigured: boolean
    webhookConfigured: boolean
    fromAddress: string
} {
    const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim())
    const webhookConfigured = Boolean(process.env.SMTP_WEBHOOK_URL?.trim())
    const fromAddress =
        process.env.EMAIL_FROM?.trim() || "Lumio Finance <no-reply@esaico.com>"
    return {
        resendConfigured,
        webhookConfigured,
        fromAddress,
    }
}

export async function sendTransactionalEmail(params: {
    to: string
    templateId: EmailTemplateId
    data?: EmailTemplatePayload
    userId?: string | null
}): Promise<{
    ok: boolean
    transport: "RESEND" | "WEBHOOK" | "IN_APP_LOG"
    rendered: RenderedEmailTemplate
    error?: string
}> {
    const { to, templateId, data = {}, userId } = params
    const adminClient = getServiceRoleClient()
    const { settings } = await getSystemBrandingAndPlans(adminClient || undefined)

    const rendered = renderEmailTemplate(templateId, data, {
        appName: settings.app_name,
        tagline: settings.tagline,
        primaryColor: settings.primary_color,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    })

    const resendKey = process.env.RESEND_API_KEY?.trim()
    const webhookUrl = process.env.SMTP_WEBHOOK_URL?.trim()
    const fromAddress =
        process.env.EMAIL_FROM?.trim() ||
        `${settings.app_name} <onboarding@resend.dev>`

    let transport: "RESEND" | "WEBHOOK" | "IN_APP_LOG" = "IN_APP_LOG"
    let status: "SENT" | "QUEUED_LOG" | "FAILED" = "QUEUED_LOG"
    let errorMsg: string | undefined

    if (resendKey && to && to.includes("@")) {
        transport = "RESEND"
        try {
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${resendKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: fromAddress,
                    to: [to],
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text,
                }),
            })
            if (res.ok) {
                status = "SENT"
            } else {
                const errBody = await res.json().catch(() => ({}))
                status = "FAILED"
                errorMsg = errBody?.message || `Resend HTTP ${res.status}`
            }
        } catch (err: any) {
            status = "FAILED"
            errorMsg = err?.message || "Resend network error"
        }
    } else if (webhookUrl && to && to.includes("@")) {
        transport = "WEBHOOK"
        try {
            const res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to,
                    subject: rendered.subject,
                    html: rendered.html,
                    text: rendered.text,
                    templateId,
                }),
            })
            status = res.ok ? "SENT" : "FAILED"
            if (!res.ok) errorMsg = `Webhook HTTP ${res.status}`
        } catch (err: any) {
            status = "FAILED"
            errorMsg = err?.message || "Webhook error"
        }
    }

    // Mirror transactional lifecycle notifications in public.notifications so user also sees it in-app
    if (adminClient && userId) {
        try {
            await adminClient.from("notifications").insert({
                user_id: userId,
                type: templateId,
                title: rendered.subject.split("—")[0]?.trim() || rendered.name,
                message: rendered.text,
                data: { templateId, to, transport, status },
            })
        } catch {
            // safe ignore if notifications table differs
        }
    }

    recentEmailLogs.unshift({
        id: crypto.randomUUID(),
        to,
        templateId,
        subject: rendered.subject,
        transport,
        status,
        error: errorMsg,
        createdAt: new Date().toISOString(),
    })

    return {
        ok: status !== "FAILED",
        transport,
        rendered,
        error: errorMsg,
    }
}
