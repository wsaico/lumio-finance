import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
    EMAIL_PROVIDER_CATALOG,
    EMAIL_PROVIDER_IDS,
    type EmailProviderId,
    type EmailProviderUpdatePayload,
    type EmailSecretFieldKey,
    type ProviderReadiness,
    type PublicEmailProviderConfig,
    type SecretSource,
    type SecretStatusItem,
} from "@/lib/email-providers"
import { getServiceRoleClient } from "./system-settings"

interface EmailSettingsRow {
    id: string
    active_provider: EmailProviderId
    from_name: string
    from_email: string
    reply_to: string
    site_url: string
    brevo_api_key: string
    resend_api_key: string
    sendgrid_api_key: string
    smtp_host: string
    smtp_port: number
    smtp_secure: boolean
    smtp_user: string
    smtp_pass: string
    webhook_url: string
    webhook_secret: string
    updated_by: string | null
    updated_at: string
}

export interface ResolvedEmailSettings {
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
    brevoApiKey: string
    resendApiKey: string
    sendgridApiKey: string
    smtpPass: string
    webhookSecret: string
    secretsMeta: Record<EmailSecretFieldKey, SecretStatusItem>
    providersStatus: Record<EmailProviderId, ProviderReadiness>
    storageMode: "DATABASE" | "LOCAL_FALLBACK"
    updatedAt: string
}

const DEFAULT_ROW: EmailSettingsRow = {
    id: "global",
    active_provider: "BREVO",
    from_name: "Lumio Finance",
    from_email: "no-reply@esaico.com",
    reply_to: "willysaico@gmail.com",
    site_url: "https://lumio.esaico.com",
    brevo_api_key: "",
    resend_api_key: "",
    sendgrid_api_key: "",
    smtp_host: "smtp-relay.brevo.com",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_pass: "",
    webhook_url: "",
    webhook_secret: "",
    updated_by: null,
    updated_at: new Date(0).toISOString(),
}

const FALLBACK_FILE = path.join(process.cwd(), ".lumio-email-settings.json")
let localRowCache: EmailSettingsRow | null = null

function getEncryptionKeyBuffer(): Buffer | null {
    const keyMaterial =
        process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim() ||
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
        ""
    if (!keyMaterial) return null
    return crypto.createHash("sha256").update(keyMaterial).digest()
}

export function encryptSecret(plain: string): string {
    const clean = plain.trim()
    if (!clean) return ""
    const key = getEncryptionKeyBuffer()
    if (!key) return clean
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    const encrypted = Buffer.concat([cipher.update(clean, "utf8"), cipher.final()])
    const tag = cipher.getAuthTag()
    return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptSecret(stored?: string | null): string {
    const raw = (stored || "").trim()
    if (!raw) return ""
    if (!raw.startsWith("enc:v1:")) return raw
    const key = getEncryptionKeyBuffer()
    if (!key) return ""
    const parts = raw.split(":")
    if (parts.length !== 5) return ""
    try {
        const iv = Buffer.from(parts[2], "base64")
        const tag = Buffer.from(parts[3], "base64")
        const ciphertext = Buffer.from(parts[4], "base64")
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
        decipher.setAuthTag(tag)
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
        return decrypted.toString("utf8")
    } catch {
        return ""
    }
}

export function maskSecret(raw?: string | null): string {
    const clean = (raw || "").trim()
    if (!clean) return ""
    if (clean.length <= 10) return "••••••••"
    return `${clean.slice(0, 4)}••••••${clean.slice(-4)}`
}

export function parseEmailFrom(raw?: string): { name?: string; email?: string } {
    const trimmed = (raw || "").trim()
    if (!trimmed) return {}
    const bracketMatch = trimmed.match(/^"?([^"<]+?)"?\s*<([^<>\s]+@[^<>\s]+)>$/)
    if (bracketMatch) {
        return {
            name: bracketMatch[1].trim(),
            email: bracketMatch[2].trim(),
        }
    }
    if (trimmed.includes("@") && !trimmed.includes(" ")) {
        return { email: trimmed }
    }
    return {}
}

function isValidProviderId(val: unknown): val is EmailProviderId {
    return typeof val === "string" && (EMAIL_PROVIDER_IDS as string[]).includes(val)
}

function isValidHttpUrl(val: string): boolean {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val.trim())
}

function isBasicEmail(val: string): boolean {
    const s = val.trim()
    const atIdx = s.indexOf("@")
    return atIdx > 0 && atIdx < s.length - 3 && !/\s/.test(s) && s.slice(atIdx + 1).includes(".")
}

async function readLocalRow(): Promise<{ row: EmailSettingsRow; exists: boolean }> {
    if (localRowCache) {
        return { row: localRowCache, exists: true }
    }
    try {
        const content = await fs.readFile(FALLBACK_FILE, "utf-8")
        const parsed = JSON.parse(content)
        const nextRow: EmailSettingsRow = {
            ...DEFAULT_ROW,
            ...parsed,
            active_provider: isValidProviderId(parsed?.active_provider)
                ? parsed.active_provider
                : DEFAULT_ROW.active_provider,
            smtp_port: Number(parsed?.smtp_port) || DEFAULT_ROW.smtp_port,
            smtp_secure: Boolean(parsed?.smtp_secure),
        }
        localRowCache = nextRow
        return { row: nextRow, exists: true }
    } catch {
        return { row: { ...DEFAULT_ROW }, exists: false }
    }
}

async function writeLocalRow(row: EmailSettingsRow): Promise<void> {
    localRowCache = row
    try {
        await fs.writeFile(FALLBACK_FILE, JSON.stringify(row, null, 2), "utf-8")
    } catch {
        // Safe ignore on read-only serverless filesystems
    }
}

async function loadStoredRow(supabase?: SupabaseClient): Promise<{
    row: EmailSettingsRow
    existsInDb: boolean
    storageMode: "DATABASE" | "LOCAL_FALLBACK"
}> {
    const client = getServiceRoleClient() || supabase
    if (client) {
        try {
            const { data, error } = await client
                .from("email_settings")
                .select("*")
                .eq("id", "global")
                .maybeSingle()

            if (!error) {
                if (data) {
                    return {
                        row: {
                            ...DEFAULT_ROW,
                            ...data,
                            active_provider: isValidProviderId(data.active_provider)
                                ? data.active_provider
                                : DEFAULT_ROW.active_provider,
                            smtp_port: Number(data.smtp_port) || DEFAULT_ROW.smtp_port,
                            smtp_secure: Boolean(data.smtp_secure),
                        },
                        existsInDb: true,
                        storageMode: "DATABASE",
                    }
                }
                return {
                    row: { ...DEFAULT_ROW },
                    existsInDb: false,
                    storageMode: "DATABASE",
                }
            }
        } catch {
            // Table may not exist yet; fall through to local store
        }
    }

    const local = await readLocalRow()
    return {
        row: local.row,
        existsInDb: local.exists,
        storageMode: "LOCAL_FALLBACK",
    }
}

function resolveSecretValue(
    storedEncrypted: string,
    envVarName: string
): { value: string; meta: SecretStatusItem } {
    const fromDb = decryptSecret(storedEncrypted)
    if (fromDb) {
        return {
            value: fromDb,
            meta: {
                configured: true,
                source: "DB",
                masked: maskSecret(fromDb),
            },
        }
    }
    const fromEnv = process.env[envVarName]?.trim() || ""
    if (fromEnv) {
        return {
            value: fromEnv,
            meta: {
                configured: true,
                source: "ENV",
                masked: maskSecret(fromEnv),
            },
        }
    }
    return {
        value: "",
        meta: {
            configured: false,
            source: "NONE",
            masked: "",
        },
    }
}

export async function getResolvedEmailSettings(
    supabase?: SupabaseClient
): Promise<ResolvedEmailSettings> {
    const { row, existsInDb, storageMode } = await loadStoredRow(supabase)
    const adminExplicitlySaved = existsInDb && Boolean(row.updated_by)

    const envProvider = process.env.EMAIL_PROVIDER?.trim().toUpperCase()
    const envFrom = parseEmailFrom(process.env.EMAIL_FROM)
    const envReplyTo = process.env.EMAIL_REPLY_TO?.trim() || ""
    const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || ""
    const envSmtpHost = process.env.SMTP_HOST?.trim() || ""
    const envSmtpPort = Number(process.env.SMTP_PORT)
    const envSmtpSecureRaw = process.env.SMTP_SECURE?.trim().toLowerCase()
    const envSmtpUser = process.env.SMTP_USER?.trim() || ""
    const envWebhookUrl = process.env.SMTP_WEBHOOK_URL?.trim() || ""

    const activeProvider: EmailProviderId = adminExplicitlySaved
        ? row.active_provider
        : isValidProviderId(envProvider)
          ? envProvider
          : row.active_provider

    const fromName = adminExplicitlySaved
        ? row.from_name || DEFAULT_ROW.from_name
        : envFrom.name || row.from_name || DEFAULT_ROW.from_name

    const fromEmail = adminExplicitlySaved
        ? row.from_email || DEFAULT_ROW.from_email
        : envFrom.email || row.from_email || DEFAULT_ROW.from_email

    const replyTo = adminExplicitlySaved
        ? row.reply_to ?? ""
        : envReplyTo || row.reply_to || DEFAULT_ROW.reply_to

    const siteUrl = adminExplicitlySaved
        ? row.site_url || DEFAULT_ROW.site_url
        : envSiteUrl || row.site_url || DEFAULT_ROW.site_url

    const smtpHost = adminExplicitlySaved
        ? row.smtp_host || DEFAULT_ROW.smtp_host
        : envSmtpHost || row.smtp_host || DEFAULT_ROW.smtp_host

    const smtpPort = adminExplicitlySaved
        ? row.smtp_port || DEFAULT_ROW.smtp_port
        : Number.isFinite(envSmtpPort) && envSmtpPort > 0
          ? envSmtpPort
          : row.smtp_port || DEFAULT_ROW.smtp_port

    const smtpSecure = adminExplicitlySaved
        ? Boolean(row.smtp_secure)
        : envSmtpSecureRaw === "true"
          ? true
          : envSmtpSecureRaw === "false"
            ? false
            : Boolean(row.smtp_secure)

    const smtpUser = row.smtp_user?.trim() || envSmtpUser
    const webhookUrl = row.webhook_url?.trim() || envWebhookUrl

    const brevo = resolveSecretValue(row.brevo_api_key, "BREVO_API_KEY")
    const resend = resolveSecretValue(row.resend_api_key, "RESEND_API_KEY")
    const sendgrid = resolveSecretValue(row.sendgrid_api_key, "SENDGRID_API_KEY")
    const smtpPass = resolveSecretValue(row.smtp_pass, "SMTP_PASS")
    const webhookSecret = resolveSecretValue(row.webhook_secret, "SMTP_WEBHOOK_SECRET")

    const smtpUserSource: SecretSource = row.smtp_user?.trim()
        ? "DB"
        : envSmtpUser
          ? "ENV"
          : "NONE"
    const smtpConfigured = Boolean(smtpHost) && (Boolean(smtpUser) || smtpPass.meta.configured)
    const smtpSource: SecretSource = !smtpConfigured
        ? "NONE"
        : smtpPass.meta.source !== "NONE"
          ? smtpPass.meta.source
          : smtpUserSource

    const webhookConfigured = isValidHttpUrl(webhookUrl)
    const webhookSource: SecretSource = !webhookConfigured
        ? "NONE"
        : row.webhook_url?.trim()
          ? "DB"
          : "ENV"

    const providersStatus: Record<EmailProviderId, ProviderReadiness> = {
        BREVO: {
            configured: brevo.meta.configured,
            source: brevo.meta.source,
            summary: brevo.meta.configured
                ? `Listo (${brevo.meta.source === "DB" ? "Panel Admin" : "Variable .env"})`
                : "Falta BREVO_API_KEY",
        },
        RESEND: {
            configured: resend.meta.configured,
            source: resend.meta.source,
            summary: resend.meta.configured
                ? `Listo (${resend.meta.source === "DB" ? "Panel Admin" : "Variable .env"})`
                : "Falta RESEND_API_KEY",
        },
        SENDGRID: {
            configured: sendgrid.meta.configured,
            source: sendgrid.meta.source,
            summary: sendgrid.meta.configured
                ? `Listo (${sendgrid.meta.source === "DB" ? "Panel Admin" : "Variable .env"})`
                : "Falta SENDGRID_API_KEY",
        },
        SMTP: {
            configured: smtpConfigured,
            source: smtpSource,
            summary: smtpConfigured
                ? `${smtpHost}:${smtpPort} (${smtpSource === "DB" ? "Panel Admin" : "Variable .env"})`
                : "Falta usuario o contraseña SMTP",
        },
        WEBHOOK: {
            configured: webhookConfigured,
            source: webhookSource,
            summary: webhookConfigured
                ? `URL activa (${webhookSource === "DB" ? "Panel Admin" : "Variable .env"})`
                : "Falta URL Webhook HTTP(S)",
        },
    }

    return {
        activeProvider,
        fromName,
        fromEmail,
        replyTo,
        siteUrl,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        webhookUrl,
        brevoApiKey: brevo.value,
        resendApiKey: resend.value,
        sendgridApiKey: sendgrid.value,
        smtpPass: smtpPass.value,
        webhookSecret: webhookSecret.value,
        secretsMeta: {
            brevoApiKey: brevo.meta,
            resendApiKey: resend.meta,
            sendgridApiKey: sendgrid.meta,
            smtpPass: smtpPass.meta,
            webhookSecret: webhookSecret.meta,
        },
        providersStatus,
        storageMode,
        updatedAt: row.updated_at || DEFAULT_ROW.updated_at,
    }
}

export function toPublicEmailProviderConfig(
    resolved: ResolvedEmailSettings
): PublicEmailProviderConfig {
    return {
        activeProvider: resolved.activeProvider,
        fromName: resolved.fromName,
        fromEmail: resolved.fromEmail,
        replyTo: resolved.replyTo,
        siteUrl: resolved.siteUrl,
        smtpHost: resolved.smtpHost,
        smtpPort: resolved.smtpPort,
        smtpSecure: resolved.smtpSecure,
        smtpUser: resolved.smtpUser,
        webhookUrl: resolved.webhookUrl,
        secrets: resolved.secretsMeta,
        providersStatus: resolved.providersStatus,
        storageMode: resolved.storageMode,
        updatedAt: resolved.updatedAt,
    }
}

export function getActiveProviderLabel(id: EmailProviderId): string {
    return EMAIL_PROVIDER_CATALOG[id]?.label || id
}

function mergeSecretField(
    existingEncrypted: string,
    key: EmailSecretFieldKey,
    payload: EmailProviderUpdatePayload
): string {
    if (Array.isArray(payload.clearSecrets) && payload.clearSecrets.includes(key)) {
        return ""
    }
    const incoming = payload.secrets?.[key]
    if (typeof incoming === "string" && incoming.trim().length > 0) {
        return encryptSecret(incoming.trim())
    }
    return existingEncrypted
}

export async function saveEmailSettings(
    payload: EmailProviderUpdatePayload,
    opts?: { supabase?: SupabaseClient; updatedBy?: string | null }
): Promise<{
    resolved: ResolvedEmailSettings
    publicConfig: PublicEmailProviderConfig
}> {
    if (payload.activeProvider !== undefined && !isValidProviderId(payload.activeProvider)) {
        throw new Error("Proveedor de correo no válido.")
    }

    if (payload.fromEmail !== undefined && !isBasicEmail(payload.fromEmail)) {
        throw new Error("El correo remitente (From) no tiene un formato válido.")
    }

    if (
        payload.replyTo !== undefined &&
        payload.replyTo.trim() !== "" &&
        !isBasicEmail(payload.replyTo)
    ) {
        throw new Error("El correo de respuesta (Reply-To) no tiene un formato válido.")
    }

    if (
        payload.siteUrl !== undefined &&
        payload.siteUrl.trim() !== "" &&
        !isValidHttpUrl(payload.siteUrl)
    ) {
        throw new Error("La URL pública del sitio debe empezar con http:// o https://.")
    }

    if (
        payload.webhookUrl !== undefined &&
        payload.webhookUrl.trim() !== "" &&
        !isValidHttpUrl(payload.webhookUrl)
    ) {
        throw new Error("La URL del Webhook debe empezar con http:// o https://.")
    }

    if (payload.smtpPort !== undefined) {
        const port = Number(payload.smtpPort)
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error("El puerto SMTP debe ser un número entero entre 1 y 65535.")
        }
    }

    const { row: currentRow } = await loadStoredRow(opts?.supabase)
    const nowIso = new Date().toISOString()

    const nextRow: EmailSettingsRow = {
        id: "global",
        active_provider: payload.activeProvider ?? currentRow.active_provider,
        from_name:
            payload.fromName !== undefined
                ? payload.fromName.trim() || DEFAULT_ROW.from_name
                : currentRow.from_name,
        from_email:
            payload.fromEmail !== undefined
                ? payload.fromEmail.trim()
                : currentRow.from_email,
        reply_to:
            payload.replyTo !== undefined ? payload.replyTo.trim() : currentRow.reply_to,
        site_url:
            payload.siteUrl !== undefined
                ? payload.siteUrl.trim().replace(/\/+$/, "") || DEFAULT_ROW.site_url
                : currentRow.site_url,
        brevo_api_key: mergeSecretField(currentRow.brevo_api_key, "brevoApiKey", payload),
        resend_api_key: mergeSecretField(currentRow.resend_api_key, "resendApiKey", payload),
        sendgrid_api_key: mergeSecretField(
            currentRow.sendgrid_api_key,
            "sendgridApiKey",
            payload
        ),
        smtp_host:
            payload.smtpHost !== undefined
                ? payload.smtpHost.trim() || DEFAULT_ROW.smtp_host
                : currentRow.smtp_host,
        smtp_port:
            payload.smtpPort !== undefined ? Number(payload.smtpPort) : currentRow.smtp_port,
        smtp_secure:
            payload.smtpSecure !== undefined
                ? Boolean(payload.smtpSecure)
                : currentRow.smtp_secure,
        smtp_user:
            payload.smtpUser !== undefined ? payload.smtpUser.trim() : currentRow.smtp_user,
        smtp_pass: mergeSecretField(currentRow.smtp_pass, "smtpPass", payload),
        webhook_url:
            payload.webhookUrl !== undefined
                ? payload.webhookUrl.trim()
                : currentRow.webhook_url,
        webhook_secret: mergeSecretField(
            currentRow.webhook_secret,
            "webhookSecret",
            payload
        ),
        updated_by: opts?.updatedBy ?? currentRow.updated_by ?? "admin",
        updated_at: nowIso,
    }

    await writeLocalRow(nextRow)

    const client = getServiceRoleClient() || opts?.supabase
    if (client) {
        try {
            const { updated_by: rawUpdatedBy, ...restRow } = nextRow
            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            await client.from("email_settings").upsert(
                {
                    ...restRow,
                    updated_by:
                        rawUpdatedBy && uuidRegex.test(rawUpdatedBy) ? rawUpdatedBy : null,
                },
                { onConflict: "id" }
            )
        } catch {
            // Safe fallback remains persisted locally if migration hasn't run yet
        }
    }

    const resolved = await getResolvedEmailSettings(opts?.supabase)
    return {
        resolved,
        publicConfig: toPublicEmailProviderConfig(resolved),
    }
}
