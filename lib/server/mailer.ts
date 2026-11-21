import type { SupabaseClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"
import type { EmailTransportId, EmailTransportStatus } from "@/lib/email-providers"
import {
    getActiveProviderLabel,
    getResolvedEmailSettings,
} from "./email-settings"
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
    transport: EmailTransportId
    status: "SENT" | "QUEUED_LOG" | "FAILED"
    messageId?: string
    error?: string
    createdAt: string
}

const recentEmailLogs: EmailDispatchLogItem[] = []
const MAX_RECENT_LOGS = 60

export function getRecentEmailLogs(): EmailDispatchLogItem[] {
    return recentEmailLogs.slice(0, 40)
}

export async function getEmailTransportStatus(
    supabase?: SupabaseClient
): Promise<EmailTransportStatus> {
    const resolved = await getResolvedEmailSettings(supabase)
    const active = resolved.providersStatus[resolved.activeProvider]
    const fromAddress = resolved.fromName
        ? `${resolved.fromName} <${resolved.fromEmail}>`
        : resolved.fromEmail

    return {
        activeProvider: resolved.activeProvider,
        activeProviderLabel: getActiveProviderLabel(resolved.activeProvider),
        activeConfigured: active.configured,
        activeSource: active.source,
        fromAddress,
        replyTo: resolved.replyTo,
        siteUrl: resolved.siteUrl,
        storageMode: resolved.storageMode,
        providersStatus: resolved.providersStatus,
        brevoConfigured: resolved.providersStatus.BREVO.configured,
        resendConfigured: resolved.providersStatus.RESEND.configured,
        sendgridConfigured: resolved.providersStatus.SENDGRID.configured,
        smtpConfigured: resolved.providersStatus.SMTP.configured,
        webhookConfigured: resolved.providersStatus.WEBHOOK.configured,
    }
}

export async function sendTransactionalEmail(params: {
    to: string
    templateId: EmailTemplateId
    data?: EmailTemplatePayload
    userId?: string | null
}): Promise<{
    ok: boolean
    status: "SENT" | "QUEUED_LOG" | "FAILED"
    transport: EmailTransportId
    messageId?: string
    rendered: RenderedEmailTemplate
    error?: string
}> {
    const { to, templateId, data = {}, userId } = params
    const adminClient = getServiceRoleClient()
    const [{ settings }, resolved] = await Promise.all([
        getSystemBrandingAndPlans(adminClient || undefined),
        getResolvedEmailSettings(adminClient || undefined),
    ])

    const rendered = renderEmailTemplate(templateId, data, {
        appName: settings.app_name,
        tagline: settings.tagline,
        primaryColor: settings.primary_color,
        siteUrl: resolved.siteUrl || "https://lumio.esaico.com",
        supportEmail: resolved.replyTo || "willysaico@gmail.com",
        logoUrl: settings.logo_white_url,
    })

    const fromName = resolved.fromName || settings.app_name || "Lumio Finance"
    const fromEmail = resolved.fromEmail || "no-reply@esaico.com"
    const fromHeader = `${fromName} <${fromEmail}>`
    const replyTo = resolved.replyTo?.trim() || ""
    const hasValidRecipient = Boolean(to && to.includes("@"))

    let transport: EmailTransportId = "IN_APP_LOG"
    let status: "SENT" | "QUEUED_LOG" | "FAILED" = "QUEUED_LOG"
    let messageId: string | undefined
    let errorMsg: string | undefined

    const activeStatus = resolved.providersStatus[resolved.activeProvider]

    if (!hasValidRecipient) {
        status = "FAILED"
        errorMsg = "Dirección de correo destinatario no válida."
    } else if (!activeStatus.configured) {
        transport = "IN_APP_LOG"
        status = "QUEUED_LOG"
        errorMsg = `Proveedor ${resolved.activeProvider} seleccionado pero aún no tiene credenciales configuradas.`
    } else {
        switch (resolved.activeProvider) {
            case "BREVO": {
                transport = "BREVO"
                try {
                    const recipientName = data.userName?.trim()
                    const payload: Record<string, unknown> = {
                        sender: { name: fromName, email: fromEmail },
                        to: [
                            recipientName
                                ? { email: to, name: recipientName }
                                : { email: to },
                        ],
                        subject: rendered.subject,
                        htmlContent: rendered.html,
                        textContent: rendered.text,
                        tags: ["lumio-finance", templateId],
                    }
                    if (replyTo.includes("@")) {
                        payload.replyTo = { email: replyTo }
                    }

                    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                        method: "POST",
                        headers: {
                            accept: "application/json",
                            "content-type": "application/json",
                            "api-key": resolved.brevoApiKey,
                        },
                        body: JSON.stringify(payload),
                    })
                    const body = await res.json().catch(() => ({}))
                    if (res.ok) {
                        status = "SENT"
                        if (body?.messageId) {
                            messageId = String(body.messageId)
                        }
                    } else {
                        status = "FAILED"
                        errorMsg =
                            body?.message ||
                            body?.code ||
                            `Brevo HTTP ${res.status}`
                    }
                } catch (err: any) {
                    status = "FAILED"
                    errorMsg = err?.message || "Error de red al conectar con Brevo"
                }
                break
            }

            case "RESEND": {
                transport = "RESEND"
                try {
                    const payload: Record<string, unknown> = {
                        from: fromHeader,
                        to: [to],
                        subject: rendered.subject,
                        html: rendered.html,
                        text: rendered.text,
                    }
                    if (replyTo.includes("@")) {
                        payload.reply_to = replyTo
                    }

                    const res = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${resolved.resendApiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    })
                    const body = await res.json().catch(() => ({}))
                    if (res.ok) {
                        status = "SENT"
                        if (body?.id) messageId = String(body.id)
                    } else {
                        status = "FAILED"
                        errorMsg = body?.message || `Resend HTTP ${res.status}`
                    }
                } catch (err: any) {
                    status = "FAILED"
                    errorMsg = err?.message || "Error de red al conectar con Resend"
                }
                break
            }

            case "SENDGRID": {
                transport = "SENDGRID"
                try {
                    const payload: Record<string, unknown> = {
                        personalizations: [{ to: [{ email: to }] }],
                        from: { email: fromEmail, name: fromName },
                        subject: rendered.subject,
                        content: [
                            { type: "text/plain", value: rendered.text },
                            { type: "text/html", value: rendered.html },
                        ],
                    }
                    if (replyTo.includes("@")) {
                        payload.reply_to = { email: replyTo }
                    }

                    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${resolved.sendgridApiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    })

                    if (res.ok) {
                        status = "SENT"
                        const sgId = res.headers.get("x-message-id")
                        if (sgId) messageId = sgId
                    } else {
                        status = "FAILED"
                        const rawText = await res.text().catch(() => "")
                        let parsedErr = ""
                        try {
                            const parsed = JSON.parse(rawText)
                            parsedErr = parsed?.errors?.[0]?.message || ""
                        } catch {
                            // keep rawText fallback
                        }
                        errorMsg =
                            parsedErr || rawText || `SendGrid HTTP ${res.status}`
                    }
                } catch (err: any) {
                    status = "FAILED"
                    errorMsg = err?.message || "Error de red al conectar con SendGrid"
                }
                break
            }

            case "SMTP": {
                transport = "SMTP"
                const transporter = nodemailer.createTransport({
                    host: resolved.smtpHost,
                    port: resolved.smtpPort,
                    secure: resolved.smtpSecure,
                    auth: resolved.smtpUser
                        ? {
                              user: resolved.smtpUser,
                              pass: resolved.smtpPass,
                          }
                        : undefined,
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 15000,
                })
                try {
                    const info = await transporter.sendMail({
                        from: fromHeader,
                        to,
                        replyTo: replyTo.includes("@") ? replyTo : undefined,
                        subject: rendered.subject,
                        text: rendered.text,
                        html: rendered.html,
                    })
                    status = "SENT"
                    if (info?.messageId) messageId = String(info.messageId)
                } catch (err: any) {
                    status = "FAILED"
                    errorMsg = err?.message || "Error al enviar vía servidor SMTP"
                } finally {
                    try {
                        transporter.close()
                    } catch {
                        // ignore close errors
                    }
                }
                break
            }

            case "WEBHOOK": {
                transport = "WEBHOOK"
                try {
                    const headers: Record<string, string> = {
                        "Content-Type": "application/json",
                    }
                    if (resolved.webhookSecret) {
                        headers["X-Webhook-Secret"] = resolved.webhookSecret
                        headers["Authorization"] = `Bearer ${resolved.webhookSecret}`
                    }

                    const res = await fetch(resolved.webhookUrl, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            from: { name: fromName, email: fromEmail },
                            replyTo: replyTo || undefined,
                            to,
                            subject: rendered.subject,
                            html: rendered.html,
                            text: rendered.text,
                            templateId,
                        }),
                    })

                    if (res.ok) {
                        status = "SENT"
                    } else {
                        status = "FAILED"
                        errorMsg = `Webhook HTTP ${res.status}`
                    }
                } catch (err: any) {
                    status = "FAILED"
                    errorMsg = err?.message || "Error al llamar Webhook de correo"
                }
                break
            }
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
                data: { templateId, to, transport, status, messageId },
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
        messageId,
        error: errorMsg,
        createdAt: new Date().toISOString(),
    })
    if (recentEmailLogs.length > MAX_RECENT_LOGS) {
        recentEmailLogs.length = MAX_RECENT_LOGS
    }

    return {
        ok: status !== "FAILED",
        status,
        transport,
        messageId,
        rendered,
        error: errorMsg,
    }
}
