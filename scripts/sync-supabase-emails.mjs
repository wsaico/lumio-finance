#!/usr/bin/env node
/**
 * Sincroniza las plantillas de correo Premium de Lumio Finance:
 * 1. Genera los 6 archivos HTML listos para Supabase en ./supabase/templates/*.html
 * 2. Si pasas --push (con SUPABASE_ACCESS_TOKEN=sbp_...), actualiza directamente
 *    el proyecto en Supabase Cloud (mailer_otp_length=6 + subjects + templates HTML).
 *
 * Uso:
 *   node scripts/sync-supabase-emails.mjs
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/sync-supabase-emails.mjs --push
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
    const shouldPush = process.argv.includes("--push")
    const otpLength = Number(process.env.SUPABASE_OTP_LENGTH || 6)

    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true })
    }

    // Verify all HTML templates exist
    const payload = {
        mailer_otp_length: otpLength,
        mailer_otp_exp: 600,
    }

    let missing = []
    for (const item of TEMPLATE_CONFIG) {
        const fullPath = path.join(TEMPLATES_DIR, item.file)
        if (!fs.existsSync(fullPath)) {
            missing.push(item.file)
            continue
        }
        const html = fs.readFileSync(fullPath, "utf8")
        payload[item.subjectKey] = item.subject
        payload[item.contentKey] = html
    }

    if (missing.length > 0) {
        console.error("❌ Faltan archivos de plantilla en supabase/templates/:", missing.join(", "))
        process.exit(1)
    }

    console.log(`✅ ${TEMPLATE_CONFIG.length} plantillas HTML verificadas en supabase/templates/`)

    if (!shouldPush) {
        console.log("ℹ️  Para subirlas automáticamente a Supabase Cloud (y fijar OTP en 6 dígitos), ejecuta:")
        console.log("   $env:SUPABASE_ACCESS_TOKEN='sbp_tu_token'; node scripts/sync-supabase-emails.mjs --push")
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

    console.log(`🚀 Subiendo configuración Auth (OTP=${otpLength} dígitos + 6 plantillas Premium) a proyecto ${ref}...`)

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
    console.log(`   • Largo de código OTP: ${otpLength} dígitos`)
    console.log("   • Plantillas Premium aplicadas: Magic Link, Confirm Signup, Reset Password, Change Email, Invite, Reauthentication")
}

main().catch((err) => {
    console.error("❌ Error inesperado:", err)
    process.exit(1)
})
