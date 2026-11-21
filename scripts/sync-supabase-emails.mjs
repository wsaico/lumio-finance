#!/usr/bin/env node
/**
 * Sincroniza las plantillas de correo Premium y Custom SMTP (Brevo) en Supabase Auth:
 * 1. Verifica los 6 archivos HTML en ./supabase/templates/*.html
 * 2. Con --push (requiere SUPABASE_ACCESS_TOKEN=sbp_...), actualiza directamente
 *    el proyecto en Supabase Cloud (mailer_otp_length=6 + subjects + templates HTML).
 * 3. Con --push-smtp (requiere SUPABASE_ACCESS_TOKEN + BREVO_SMTP_USER + BREVO_SMTP_PASS),
 *    configura Custom SMTP en Supabase Auth (por defecto smtp-relay.brevo.com:587).
 *
 * Uso:
 *   node scripts/sync-supabase-emails.mjs
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/sync-supabase-emails.mjs --push
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx BREVO_SMTP_USER=... BREVO_SMTP_PASS=... node scripts/sync-supabase-emails.mjs --push --push-smtp
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

dotenv.config({ path: path.join(ROOT, ".env") })
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true })

// Extract project ref from NEXT_PUBLIC_SUPABASE_URL (e.g. https://<ref>.supabase.co)
function resolveProjectRef() {
    if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF.trim()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const match = url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i)
    return match ? match[1] : ""
}

const TEMPLATES_DIR = path.join(ROOT, "supabase", "templates")

const TEMPLATE_CONFIG = [
    {
        file: "magic_link.html",
        id: "OTP_VERIFICATION",
        subjectKey: "mailer_subjects_magic_link",
        contentKey: "mailer_templates_magic_link_content",
        subject: "{{ .Token }} es tu código de verificación — Lumio Finance",
    },
    {
        file: "confirmation.html",
        id: "CONFIRM_SIGNUP",
        subjectKey: "mailer_subjects_confirmation",
        contentKey: "mailer_templates_confirmation_content",
        subject: "Confirma tu cuenta ({{ .Token }}) — Lumio Finance",
    },
    {
        file: "recovery.html",
        id: "PASSWORD_RECOVERY",
        subjectKey: "mailer_subjects_recovery",
        contentKey: "mailer_templates_recovery_content",
        subject: "Restablece tu contraseña — Lumio Finance",
    },
    {
        file: "email_change.html",
        id: "EMAIL_CHANGE",
        subjectKey: "mailer_subjects_email_change",
        contentKey: "mailer_templates_email_change_content",
        subject: "Confirma tu cambio de correo — Lumio Finance",
    },
    {
        file: "invite.html",
        id: "INVITE_USER",
        subjectKey: "mailer_subjects_invite",
        contentKey: "mailer_templates_invite_content",
        subject: "Has sido invitado a Lumio Finance",
    },
    {
        file: "reauthentication.html",
        id: "REAUTHENTICATION",
        subjectKey: "mailer_subjects_reauthentication",
        contentKey: "mailer_templates_reauthentication_content",
        subject: "{{ .Token }} es tu código de seguridad — Lumio Finance",
    },
]

async function main() {
    const shouldPushTemplates = process.argv.includes("--push")
    const shouldPushSmtp = process.argv.includes("--push-smtp")
    const otpLength = Number(process.env.SUPABASE_OTP_LENGTH || 6)

    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    }

    const templatePayload = {
        mailer_otp_length: otpLength,
        mailer_otp_exp: 600,
    }

    const missing = []
    for (const item of TEMPLATE_CONFIG) {
        const fullPath = path.join(TEMPLATES_DIR, item.file)
        if (!fs.existsSync(fullPath)) {
            missing.push(item.file)
            continue
        }
        const html = fs.readFileSync(fullPath, "utf8")
        templatePayload[item.subjectKey] = item.subject
        templatePayload[item.contentKey] = html
    }

    if (missing.length > 0) {
        console.error("❌ Faltan archivos de plantilla en supabase/templates/:", missing.join(", "))
        process.exit(1)
    }

    console.log(`✅ ${TEMPLATE_CONFIG.length} plantillas HTML verificadas en supabase/templates/`)

    if (!shouldPushTemplates && !shouldPushSmtp) {
        console.log("ℹ️  Para subir plantillas + OTP de 6 dígitos a Supabase Cloud:")
        console.log("   $env:SUPABASE_ACCESS_TOKEN='sbp_tu_token'; node scripts/sync-supabase-emails.mjs --push")
        console.log("ℹ️  Para activar además Brevo Custom SMTP en Supabase Auth:")
        console.log("   $env:SUPABASE_ACCESS_TOKEN='sbp_tu_token'; $env:BREVO_SMTP_USER='tu_login@smtp-brevo.com'; $env:BREVO_SMTP_PASS='xsmtpsib-xxx'; node scripts/sync-supabase-emails.mjs --push --push-smtp")
        return
    }

    const token = process.env.SUPABASE_ACCESS_TOKEN?.trim()
    const ref = resolveProjectRef()

    if (!token) {
        console.error("❌ Falta SUPABASE_ACCESS_TOKEN. Genera un token en: https://supabase.com/dashboard/account/tokens")
        process.exit(1)
    }
    if (!ref) {
        console.error("❌ No se pudo detectar el Project Ref desde NEXT_PUBLIC_SUPABASE_URL.")
        process.exit(1)
    }

    const payload = {}
    if (shouldPushTemplates) {
        Object.assign(payload, templatePayload)
    }

    let smtpHost = ""
    let smtpPort = ""
    let smtpAdminEmail = ""
    if (shouldPushSmtp) {
        smtpHost = process.env.SUPABASE_SMTP_HOST?.trim() || "smtp-relay.brevo.com"
        smtpPort = String(process.env.SUPABASE_SMTP_PORT?.trim() || "587")
        const smtpUser = (
            process.env.SUPABASE_SMTP_USER ||
            process.env.BREVO_SMTP_USER ||
            ""
        ).trim()
        const smtpPass = (
            process.env.SUPABASE_SMTP_PASS ||
            process.env.BREVO_SMTP_PASS ||
            ""
        ).trim()
        smtpAdminEmail =
            process.env.SUPABASE_SMTP_ADMIN_EMAIL?.trim() || "no-reply@esaico.com"
        const smtpSenderName =
            process.env.SUPABASE_SMTP_SENDER_NAME?.trim() || "Lumio Finance"

        if (!smtpUser || !smtpPass) {
            console.error(
                "❌ Para usar --push-smtp debes definir BREVO_SMTP_USER y BREVO_SMTP_PASS (o SUPABASE_SMTP_USER / SUPABASE_SMTP_PASS)."
            )
            process.exit(1)
        }

        Object.assign(payload, {
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            smtp_pass: smtpPass,
            smtp_admin_email: smtpAdminEmail,
            smtp_sender_name: smtpSenderName,
            smtp_max_frequency: 1,
        })
    }

    console.log(`🚀 Actualizando configuración de Supabase Auth en proyecto ${ref}...`)

    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const body = await res.text()
        console.error(`❌ Error HTTP ${res.status} al actualizar Supabase Auth:`, body)
        process.exit(1)
    }

    console.log("🎉 ¡Listo! Supabase Auth actualizado con éxito:")
    if (shouldPushTemplates) {
        console.log(`   • Largo de código OTP: ${otpLength} dígitos`)
        console.log("   • Plantillas Premium aplicadas: Magic Link, Confirm Signup, Reset Password, Change Email, Invite, Reauthentication")
    }
    if (shouldPushSmtp) {
        console.log(`   • Custom SMTP configurado: ${smtpHost}:${smtpPort} (${smtpAdminEmail})`)
    }
}

main().catch((err) => {
    console.error("❌ Error inesperado:", err)
    process.exit(1)
})
