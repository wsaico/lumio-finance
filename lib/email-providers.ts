export type EmailProviderId =
    | "BREVO"
    | "RESEND"
    | "SENDGRID"
    | "SMTP"
    | "WEBHOOK"

export type EmailTransportId = EmailProviderId | "IN_APP_LOG"

export type SecretSource = "DB" | "ENV" | "NONE"

export type EmailSecretFieldKey =
    | "brevoApiKey"
    | "resendApiKey"
    | "sendgridApiKey"
    | "smtpPass"
    | "webhookSecret"

export interface SecretStatusItem {
    configured: boolean
    source: SecretSource
    masked: string
}

export interface ProviderReadiness {
    configured: boolean
    source: SecretSource
    summary: string
}

export interface PublicEmailProviderConfig {
    activeProvider: EmailProviderId
    fromName: string
    fromEmail: string
    replyTo: string
    siteUrl: string
    smtpHost: string
    smtpPort: number
    smtpSecure: boolean
    smtpUser: string
    webhookUrl: string
    secrets: Record<EmailSecretFieldKey, SecretStatusItem>
    providersStatus: Record<EmailProviderId, ProviderReadiness>
    storageMode: "DATABASE" | "LOCAL_FALLBACK"
    updatedAt: string
}

export interface EmailProviderUpdatePayload {
    activeProvider?: EmailProviderId
    fromName?: string
    fromEmail?: string
    replyTo?: string
    siteUrl?: string
    smtpHost?: string
    smtpPort?: number
    smtpSecure?: boolean
    smtpUser?: string
    webhookUrl?: string
    secrets?: Partial<Record<EmailSecretFieldKey, string>>
    clearSecrets?: EmailSecretFieldKey[]
}

export interface EmailTransportStatus {
    activeProvider: EmailProviderId
    activeProviderLabel: string
    activeConfigured: boolean
    activeSource: SecretSource
    fromAddress: string
    replyTo: string
    siteUrl: string
    storageMode: "DATABASE" | "LOCAL_FALLBACK"
    providersStatus: Record<EmailProviderId, ProviderReadiness>
    brevoConfigured: boolean
    resendConfigured: boolean
    sendgridConfigured: boolean
    smtpConfigured: boolean
    webhookConfigured: boolean
}

export const EMAIL_PROVIDER_IDS: EmailProviderId[] = [
    "BREVO",
    "RESEND",
    "SENDGRID",
    "SMTP",
    "WEBHOOK",
]

export interface EmailProviderMeta {
    id: EmailProviderId
    label: string
    shortLabel: string
    tagline: string
    recommended?: boolean
    envVarHint: string
    credentialHelp: string
    supabaseSmtp: {
        host: string
        port: number
        userHint: string
        passHint: string
    } | null
}

export const EMAIL_PROVIDER_CATALOG: Record<EmailProviderId, EmailProviderMeta> = {
    BREVO: {
        id: "BREVO",
        label: "Brevo (API v3)",
        shortLabel: "Brevo",
        tagline: "Recomendado · Dominio esaico.com verificado",
        recommended: true,
        envVarHint: "BREVO_API_KEY",
        credentialHelp:
            "Genera una API Key en Brevo → SMTP y API → Claves API (empieza con xkeysib-...).",
        supabaseSmtp: {
            host: "smtp-relay.brevo.com",
            port: 587,
            userHint: "Tu login SMTP de Brevo (ej. xxxxx@smtp-brevo.com)",
            passHint: "Clave SMTP de Brevo (xsmtpsib-...)",
        },
    },
    RESEND: {
        id: "RESEND",
        label: "Resend API",
        shortLabel: "Resend",
        tagline: "Respaldo moderno vía REST API",
        envVarHint: "RESEND_API_KEY",
        credentialHelp:
            "Genera una API Key en Resend → API Keys (empieza con re_...) y verifica tu dominio.",
        supabaseSmtp: {
            host: "smtp.resend.com",
            port: 465,
            userHint: "resend",
            passHint: "Tu API Key de Resend (re_...)",
        },
    },
    SENDGRID: {
        id: "SENDGRID",
        label: "SendGrid API v3",
        shortLabel: "SendGrid",
        tagline: "Respaldo Twilio SendGrid",
        envVarHint: "SENDGRID_API_KEY",
        credentialHelp:
            "Crea una API Key con permiso Mail Send en SendGrid (empieza con SG....).",
        supabaseSmtp: {
            host: "smtp.sendgrid.net",
            port: 587,
            userHint: "apikey",
            passHint: "Tu API Key de SendGrid (SG....)",
        },
    },
    SMTP: {
        id: "SMTP",
        label: "SMTP Propio / Relay",
        shortLabel: "SMTP",
        tagline: "Cualquier servidor SMTP (Brevo, Zoho, AWS SES, cPanel)",
        envVarHint: "SMTP_HOST / SMTP_USER / SMTP_PASS",
        credentialHelp:
            "Conecta cualquier servidor SMTP estándar con host, puerto (587 STARTTLS o 465 SSL), usuario y contraseña.",
        supabaseSmtp: {
            host: "smtp-relay.brevo.com",
            port: 587,
            userHint: "Usuario SMTP configurado",
            passHint: "Contraseña o clave SMTP",
        },
    },
    WEBHOOK: {
        id: "WEBHOOK",
        label: "Webhook HTTP",
        shortLabel: "Webhook",
        tagline: "Delega el envío a Make, n8n, Zapier o Edge Function",
        envVarHint: "SMTP_WEBHOOK_URL",
        credentialHelp:
            "Envía un POST JSON con el correo renderizado (asunto, html, texto, remitente) hacia tu endpoint HTTP.",
        supabaseSmtp: null,
    },
}
