export type EmailTemplateId =
    | "OTP_VERIFICATION"
    | "CONFIRM_SIGNUP"
    | "PASSWORD_RECOVERY"
    | "EMAIL_CHANGE"
    | "INVITE_USER"
    | "REAUTHENTICATION"
    | "WELCOME_TRIAL"
    | "PAYMENT_ORDER_RECEIVED"
    | "SUBSCRIPTION_ACTIVATED"
    | "PAYMENT_ORDER_REJECTED"
    | "TRIAL_EXPIRING_REMINDER"

export interface EmailBrandContext {
    appName: string
    tagline: string
    primaryColor: string
    siteUrl: string
    supportEmail: string
    logoUrl?: string
}

export function resolveEmailLogoUrl(logoUrl?: string, siteUrl?: string): string {
    const candidate = (logoUrl || "").trim()
    if (
        /^https?:\/\//i.test(candidate) &&
        !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(candidate)
    ) {
        return candidate
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "")
    if (supabaseUrl) {
        return `${supabaseUrl}/storage/v1/object/public/branding/lumio-icon-white.png`
    }
    const cleanSiteUrl = (siteUrl || "https://lumio.esaico.com").trim().replace(/\/+$/, "")
    return `${cleanSiteUrl}/icons/icon-white.png`
}

export interface EmailTemplatePayload {
    userName?: string
    userEmail?: string
    newEmail?: string
    token?: string
    confirmationUrl?: string
    trialDays?: number
    trialEndsAt?: string
    orderCode?: string
    planName?: string
    planCode?: string
    amount?: string | number
    currency?: string
    paymentMethod?: string
    operationNumber?: string
    expiresAt?: string | null
    rejectionReason?: string
}

export interface RenderedEmailTemplate {
    id: EmailTemplateId
    name: string
    category: "AUTH_SUPABASE" | "LIFECYCLE_SAAS"
    supabaseSlot?:
        | "magic_link"
        | "confirmation"
        | "recovery"
        | "email_change"
        | "invite"
        | "reauthentication"
    triggerDescription: string
    subject: string
    supabaseSubject?: string
    html: string
    supabaseHtml?: string
    text: string
}

export const EMAIL_TEMPLATES_META: {
    id: EmailTemplateId
    name: string
    category: "AUTH_SUPABASE" | "LIFECYCLE_SAAS"
    supabaseSlot?:
        | "magic_link"
        | "confirmation"
        | "recovery"
        | "email_change"
        | "invite"
        | "reauthentication"
    triggerDescription: string
}[] = [
    {
        id: "OTP_VERIFICATION",
        name: "1. Código OTP / Magic Link (Supabase: Magic Link)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "magic_link",
        triggerDescription:
            "Se envía al iniciar registro o acceso con código OTP (signInWithOtp). Pegar en Supabase Auth → Email Templates → Magic Link.",
    },
    {
        id: "CONFIRM_SIGNUP",
        name: "2. Confirmación de Registro (Supabase: Confirm signup)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "confirmation",
        triggerDescription:
            "Se envía cuando un nuevo usuario se registra por primera vez. Incluye código OTP destacado y enlace directo. Pegar en Confirm signup.",
    },
    {
        id: "PASSWORD_RECOVERY",
        name: "3. Recuperación de Contraseña (Supabase: Reset Password)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "recovery",
        triggerDescription:
            "Se envía desde /forgot-password para restablecer la contraseña de forma segura. Pegar en Supabase Auth → Reset Password.",
    },
    {
        id: "EMAIL_CHANGE",
        name: "4. Cambio de Correo (Supabase: Change Email Address)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "email_change",
        triggerDescription:
            "Se envía cuando el usuario solicita actualizar su correo electrónico registrado. Pegar en Supabase Auth → Change Email Address.",
    },
    {
        id: "INVITE_USER",
        name: "5. Invitación a la Plataforma (Supabase: Invite user)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "invite",
        triggerDescription:
            "Se envía cuando un administrador invita directamente a un usuario. Pegar en Supabase Auth → Invite user.",
    },
    {
        id: "REAUTHENTICATION",
        name: "6. Verificación de Seguridad (Supabase: Reauthentication)",
        category: "AUTH_SUPABASE",
        supabaseSlot: "reauthentication",
        triggerDescription:
            "Se envía para confirmar acciones sensibles en la cuenta con un código de seguridad. Pegar en Supabase Auth → Reauthentication.",
    },
    {
        id: "WELCOME_TRIAL",
        name: "7. Bienvenida y Alta + 15 Días de Prueba Gratis",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en POST /api/auth/register al verificar el código y activar la cuenta.",
    },
    {
        id: "PAYMENT_ORDER_RECEIVED",
        name: "8. Orden de Suscripción Recibida (En Verificación)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en POST /api/payments/orders cuando el usuario envía su comprobante de Yape, Plin, Tarjeta o PayPal.",
    },
    {
        id: "SUBSCRIPTION_ACTIVATED",
        name: "9. Suscripción Premium Activada (Alta de Plan)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en PATCH /api/admin/orders al aprobar un pago o en PATCH /api/admin/users al asignar un plan Premium.",
    },
    {
        id: "PAYMENT_ORDER_REJECTED",
        name: "10. Observación en Comprobante de Pago",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en PATCH /api/admin/orders cuando un comprobante no pudo validarse e incluye el motivo.",
    },
    {
        id: "TRIAL_EXPIRING_REMINDER",
        name: "11. Recordatorio de Fin de Prueba (Transición Transparente)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se envía antes de concluir los 15 días de prueba recordando que su Plan Básico es gratis de por vida o cómo pasar a Premium.",
    },
]

function buildOtpSpotlightBlock(tokenVar: string, accentColor: string): string {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 24px 0;">
        <tr>
          <td align="center" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:20px;padding:26px 20px;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#64748B;margin-bottom:14px;">
              Código de verificación de un solo uso
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="background:linear-gradient(135deg, #0F0D24 0%, #1E1B4B 100%);background-color:#0F0D24;border:1px solid ${accentColor};border-radius:14px;padding:16px 32px;box-shadow:0 10px 25px -10px rgba(124,58,237,0.45);">
                  <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,Courier,monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#FFFFFF;line-height:1;">
                    ${tokenVar}
                  </span>
                </td>
              </tr>
            </table>
            <div style="font-size:12px;color:#64748B;margin-top:14px;line-height:1.5;">
              Válido por pocos minutos · <strong style="color:#334155;">No compartas este código con nadie</strong>
            </div>
          </td>
        </tr>
      </table>
    `
}

function wrapEmailLayout(params: {
    brand: EmailBrandContext
    preheader: string
    badgeText: string
    badgeTone?: "violet" | "emerald" | "amber" | "rose"
    headline: string
    subtitle?: string
    bodyHtml: string
    ctaLabel?: string
    ctaUrl?: string
    secondaryNote?: string
    footerNote?: string
}): string {
    const {
        brand,
        preheader,
        badgeText,
        badgeTone = "violet",
        headline,
        subtitle,
        bodyHtml,
        ctaLabel,
        ctaUrl,
        secondaryNote,
        footerNote,
    } = params
    const color = brand.primaryColor || "#7C3AED"
    const logoUrl = resolveEmailLogoUrl(brand.logoUrl, brand.siteUrl)

    const badgeStyles: Record<
        NonNullable<typeof badgeTone>,
        { bg: string; border: string; text: string }
    > = {
        violet: {
            bg: "rgba(167,139,250,0.16)",
            border: "rgba(167,139,250,0.38)",
            text: "#E9D5FF",
        },
        emerald: {
            bg: "rgba(52,211,153,0.16)",
            border: "rgba(52,211,153,0.4)",
            text: "#A7F3D0",
        },
        amber: {
            bg: "rgba(251,191,36,0.16)",
            border: "rgba(251,191,36,0.4)",
            text: "#FDE68A",
        },
        rose: {
            bg: "rgba(251,113,133,0.16)",
            border: "rgba(251,113,133,0.4)",
            text: "#FECDD3",
        },
    }
    const pill = badgeStyles[badgeTone]

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 20px 44px -24px rgba(15,23,42,0.18);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, ${color} 0%, #A855F7 55%, #38BDF8 100%);background-color:${color};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Luxury Dark Fintech Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #0B0A1A 0%, #1B1438 60%, #2E1065 100%);background-color:#0F0D24;padding:28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center" valign="middle" width="42" height="42" style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg, ${color} 0%, #A855F7 100%);background-color:${color};box-shadow:0 6px 16px rgba(124,58,237,0.45);text-align:center;vertical-align:middle;">
                                <img src="${logoUrl}" alt="${brand.appName}" width="26" height="26" style="display:block;margin:0 auto;width:26px;height:26px;border:0;outline:none;text-decoration:none;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="display:block;font-size:18px;font-weight:800;letter-spacing:-0.025em;color:#FFFFFF;line-height:1.15;">${brand.appName}</span>
                          <span style="display:block;font-size:11px;font-weight:500;color:#C4B5FD;margin-top:2px;">${brand.tagline}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:${pill.bg};border:1px solid ${pill.border};color:${pill.text};font-size:10px;font-weight:800;letter-spacing:0.09em;text-transform:uppercase;white-space:nowrap;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 30px 36px;">
              <h1 style="margin:0 0 8px 0;font-size:23px;line-height:1.25;font-weight:800;letter-spacing:-0.025em;color:#0F172A;">
                ${headline}
              </h1>
              ${
                  subtitle
                      ? `<p style="margin:0 0 22px 0;font-size:13.5px;line-height:1.5;color:#64748B;">${subtitle}</p>`
                      : `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>`
              }

              <div style="font-size:14.5px;line-height:1.68;color:#334155;">
                ${bodyHtml}
              </div>

              ${
                  ctaLabel && ctaUrl
                      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:8px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius:14px;background:linear-gradient(135deg, ${color} 0%, #6D28D9 100%);background-color:${color};box-shadow:0 10px 22px -10px rgba(124,58,237,0.65);">
                          <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:14px;letter-spacing:-0.01em;">
                            ${ctaLabel} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
                      : ""
              }

              ${
                  secondaryNote
                      ? `<p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#64748B;text-align:center;">${secondaryNote}</p>`
                      : ""
              }

              ${
                  footerNote
                      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                <tr>
                  <td style="padding-top:18px;border-top:1px solid #F1F5F9;font-size:12px;line-height:1.6;color:#64748B;">
                    ${footerNote}
                  </td>
                </tr>
              </table>`
                      : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:22px 36px;border-top:1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11.5px;line-height:1.65;color:#64748B;">
                    <strong style="color:#0F172A;">${brand.appName}</strong> · Finanzas personales inteligentes<br />
                    Un producto de <a href="https://esaico.com" style="color:${color};text-decoration:none;font-weight:700;">esaico.com</a> · Soporte: <a href="mailto:${brand.supportEmail}" style="color:#475569;text-decoration:none;">${brand.supportEmail}</a>
                  </td>
                  <td align="right" style="vertical-align:top;font-size:11px;color:#94A3B8;white-space:nowrap;">
                    <a href="${brand.siteUrl}/privacidad" style="color:#64748B;text-decoration:none;font-weight:600;">Privacidad</a>
                    <span style="padding:0 5px;color:#CBD5E1;">·</span>
                    <a href="${brand.siteUrl}/terminos" style="color:#64748B;text-decoration:none;font-weight:600;">Términos</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Sub-footer Security Line -->
        <p style="margin:16px 0 0 0;font-size:11px;color:#94A3B8;text-align:center;">
          Mensaje automático enviado de forma segura por ${brand.appName}. Por favor, nunca compartas tus códigos ni contraseñas.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderEmailTemplate(
    templateId: EmailTemplateId,
    payload: EmailTemplatePayload = {},
    brandInput?: Partial<EmailBrandContext>
): RenderedEmailTemplate {
    const siteUrl =
        brandInput?.siteUrl ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://lumio.esaico.com"

    const brand: EmailBrandContext = {
        appName: brandInput?.appName || "Lumio Finance",
        tagline: brandInput?.tagline || "Claridad financiera para tu día a día",
        primaryColor: brandInput?.primaryColor || "#7C3AED",
        siteUrl,
        supportEmail: brandInput?.supportEmail || "willysaico@gmail.com",
        logoUrl: resolveEmailLogoUrl(brandInput?.logoUrl, siteUrl),
    }

    const meta =
        EMAIL_TEMPLATES_META.find((m) => m.id === templateId) || EMAIL_TEMPLATES_META[0]
    const userName = payload.userName || "Wilber"
    const color = brand.primaryColor

    switch (templateId) {
        case "OTP_VERIFICATION": {
            const buildOtpBody = (tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Hola,</p>
              <p style="margin:0 0 6px 0;">Estás a un paso de activar o acceder a tu cuenta en <strong>${brand.appName}</strong>. Ingresa el siguiente código de verificación en la pantalla donde lo solicitaste:</p>
              ${buildOtpSpotlightBlock(tokenVar, color)}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3FF;border:1px solid #DDD6FE;border-radius:14px;">
                <tr>
                  <td style="padding:14px 16px;font-size:12.5px;line-height:1.55;color:#4C1D95;">
                    <strong>¿Qué incluye tu cuenta?</strong> 15 días de acceso completo a todas las herramientas Premium sin tarjeta de crédito ni cobros automáticos.
                  </td>
                </tr>
              </table>
            `

            const sampleToken = payload.token || "482910"
            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de verificación de ${brand.appName} es ${sampleToken}`,
                badgeText: "Verificación",
                badgeTone: "violet",
                headline: "Verifica tu correo electrónico",
                subtitle: "Confirma tu identidad para continuar de forma segura",
                bodyHtml: buildOtpBody(sampleToken),
                footerNote:
                    "Si no solicitaste este código en Lumio Finance, puedes ignorar este mensaje con total tranquilidad. Tu cuenta permanece segura.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de verificación de ${brand.appName} es {{ .Token }}`,
                badgeText: "Verificación",
                badgeTone: "violet",
                headline: "Verifica tu correo electrónico",
                subtitle: "Confirma tu identidad para continuar de forma segura",
                bodyHtml: buildOtpBody("{{ .Token }}"),
                footerNote:
                    "Si no solicitaste este código en Lumio Finance, puedes ignorar este mensaje con total tranquilidad. Tu cuenta permanece segura.",
            })

            return {
                ...meta,
                subject: `${sampleToken} es tu código de verificación — ${brand.appName}`,
                supabaseSubject: `{{ .Token }} es tu código de verificación — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Tu código de verificación de ${brand.appName} es: ${sampleToken}. Ingrésalo en la pantalla de verificación para continuar.`,
            }
        }

        case "CONFIRM_SIGNUP": {
            const buildConfirmBody = (tokenVar: string) => `
              <p style="margin:0 0 14px 0;">¡Bienvenido a <strong>${brand.appName}</strong>!</p>
              <p style="margin:0 0 6px 0;">Para completar tu registro y activar tus <strong>15 días de acceso completo gratuito</strong>, ingresa este código de verificación en la app:</p>
              ${buildOtpSpotlightBlock(tokenVar, color)}
              <p style="margin:0;font-size:13px;color:#475569;text-align:center;">
                También puedes confirmar directamente haciendo clic en el botón de abajo:
              </p>
            `

            const sampleToken = payload.token || "482910"
            const sampleUrl = payload.confirmationUrl || `${brand.siteUrl}/auth/callback`

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Confirma tu cuenta en ${brand.appName} con el código ${sampleToken}`,
                badgeText: "Nueva Cuenta",
                badgeTone: "violet",
                headline: "Confirma tu registro en Lumio",
                subtitle: "Un solo paso para empezar a dominar tus finanzas personales",
                bodyHtml: buildConfirmBody(sampleToken),
                ctaLabel: "Confirmar mi correo",
                ctaUrl: sampleUrl,
                footerNote:
                    "Si no creaste una cuenta en Lumio Finance, simplemente ignora este correo.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Confirma tu cuenta en ${brand.appName} con el código {{ .Token }}`,
                badgeText: "Nueva Cuenta",
                badgeTone: "violet",
                headline: "Confirma tu registro en Lumio",
                subtitle: "Un solo paso para empezar a dominar tus finanzas personales",
                bodyHtml: buildConfirmBody("{{ .Token }}"),
                ctaLabel: "Confirmar mi correo",
                ctaUrl: "{{ .ConfirmationURL }}",
                footerNote:
                    "Si no creaste una cuenta en Lumio Finance, simplemente ignora este correo.",
            })

            return {
                ...meta,
                subject: `Confirma tu cuenta (${sampleToken}) — ${brand.appName}`,
                supabaseSubject: `Confirma tu cuenta ({{ .Token }}) — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Bienvenido a ${brand.appName}. Tu código de confirmación es ${sampleToken}. También puedes confirmar en: ${sampleUrl}`,
            }
        }

        case "PASSWORD_RECOVERY": {
            const buildRecoveryBody = (tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${brand.appName}</strong>.</p>
              <p style="margin:0 0 18px 0;">Haz clic en el botón inferior para elegir una nueva contraseña de forma segura. Este enlace es personal y expira automáticamente:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 4px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12.5px;color:#475569;">
                    Código de seguridad alternativo:
                    <strong style="margin-left:6px;color:#0F172A;font-family:'SFMono-Regular',Consolas,monospace;font-size:14px;letter-spacing:3px;">${tokenVar}</strong>
                  </td>
                </tr>
              </table>
            `

            const sampleUrl = payload.confirmationUrl || `${brand.siteUrl}/reset-password`
            const sampleToken = payload.token || "739204"

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Restablece tu contraseña de ${brand.appName} de forma segura`,
                badgeText: "Seguridad",
                badgeTone: "amber",
                headline: "Restablecer tu contraseña",
                subtitle: "Protegemos el acceso a tu información financiera",
                bodyHtml: buildRecoveryBody(sampleToken),
                ctaLabel: "Crear nueva contraseña",
                ctaUrl: sampleUrl,
                footerNote:
                    "Si tú no solicitaste restablecer tu contraseña, tu cuenta sigue protegida y no necesitas realizar ninguna acción.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Restablece tu contraseña de ${brand.appName} de forma segura`,
                badgeText: "Seguridad",
                badgeTone: "amber",
                headline: "Restablecer tu contraseña",
                subtitle: "Protegemos el acceso a tu información financiera",
                bodyHtml: buildRecoveryBody("{{ .Token }}"),
                ctaLabel: "Crear nueva contraseña",
                ctaUrl: "{{ .ConfirmationURL }}",
                footerNote:
                    "Si tú no solicitaste restablecer tu contraseña, tu cuenta sigue protegida y no necesitas realizar ninguna acción.",
            })

            return {
                ...meta,
                subject: `Restablece tu contraseña — ${brand.appName}`,
                supabaseSubject: `Restablece tu contraseña — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Para restablecer tu contraseña en ${brand.appName}, abre el siguiente enlace: ${sampleUrl}`,
            }
        }

        case "EMAIL_CHANGE": {
            const buildChangeBody = (newEmailVar: string, tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Recibimos una solicitud para actualizar el correo electrónico asociado a tu cuenta de <strong>${brand.appName}</strong>.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;color:#334155;">
                    <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748B;">Nuevo correo solicitado</span>
                    <strong style="display:block;margin-top:4px;font-size:15px;color:#0F172A;">${newEmailVar}</strong>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;">Haz clic en el botón para confirmar este cambio o utiliza el código <strong style="font-family:monospace;letter-spacing:2px;color:#0F172A;">${tokenVar}</strong>:</p>
            `

            const sampleNewEmail = payload.newEmail || "nuevo.correo@ejemplo.com"
            const sampleToken = payload.token || "518294"
            const sampleUrl = payload.confirmationUrl || `${brand.siteUrl}/auth/callback`

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Confirma el cambio de correo en ${brand.appName}`,
                badgeText: "Cambio de Correo",
                badgeTone: "amber",
                headline: "Confirma tu nuevo correo",
                subtitle: "Verificamos que tú autorizaste esta modificación",
                bodyHtml: buildChangeBody(sampleNewEmail, sampleToken),
                ctaLabel: "Confirmar nuevo correo",
                ctaUrl: sampleUrl,
                footerNote:
                    "Si no solicitaste cambiar tu correo, ignora este mensaje y te recomendamos cambiar tu contraseña.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Confirma el cambio de correo en ${brand.appName}`,
                badgeText: "Cambio de Correo",
                badgeTone: "amber",
                headline: "Confirma tu nuevo correo",
                subtitle: "Verificamos que tú autorizaste esta modificación",
                bodyHtml: buildChangeBody("{{ .NewEmail }}", "{{ .Token }}"),
                ctaLabel: "Confirmar nuevo correo",
                ctaUrl: "{{ .ConfirmationURL }}",
                footerNote:
                    "Si no solicitaste cambiar tu correo, ignora este mensaje y te recomendamos cambiar tu contraseña.",
            })

            return {
                ...meta,
                subject: `Confirma tu cambio de correo — ${brand.appName}`,
                supabaseSubject: `Confirma tu cambio de correo — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Confirma el cambio de correo de tu cuenta en ${brand.appName} abriendo: ${sampleUrl}`,
            }
        }

        case "INVITE_USER": {
            const buildInviteBody = () => `
              <p style="margin:0 0 14px 0;">Has recibido una invitación exclusiva para unirte a <strong>${brand.appName}</strong>.</p>
              <p style="margin:0 0 18px 0;">Organiza tus cuentas, tarjetas, presupuestos, metas y reportes financieros desde un solo panel moderno, privado y sin complicaciones.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 4px 0;background-color:#F5F3FF;border:1px solid #DDD6FE;border-radius:14px;">
                <tr>
                  <td style="padding:14px 18px;font-size:13px;line-height:1.6;color:#4C1D95;">
                    Haz clic en el botón inferior para aceptar tu invitación y configurar tu acceso personal.
                  </td>
                </tr>
              </table>
            `

            const sampleUrl = payload.confirmationUrl || `${brand.siteUrl}/auth/callback`

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Te invitaron a unirte a ${brand.appName}`,
                badgeText: "Invitación",
                badgeTone: "violet",
                headline: `Te invitamos a ${brand.appName}`,
                subtitle: "Tu acceso personal ya está listo para activarse",
                bodyHtml: buildInviteBody(),
                ctaLabel: "Aceptar invitación",
                ctaUrl: sampleUrl,
                footerNote:
                    "Si no esperabas esta invitación, puedes ignorar este correo sin problema.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Te invitaron a unirte a ${brand.appName}`,
                badgeText: "Invitación",
                badgeTone: "violet",
                headline: `Te invitamos a ${brand.appName}`,
                subtitle: "Tu acceso personal ya está listo para activarse",
                bodyHtml: buildInviteBody(),
                ctaLabel: "Aceptar invitación",
                ctaUrl: "{{ .ConfirmationURL }}",
                footerNote:
                    "Si no esperabas esta invitación, puedes ignorar este correo sin problema.",
            })

            return {
                ...meta,
                subject: `Has sido invitado a ${brand.appName}`,
                supabaseSubject: `Has sido invitado a ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Has sido invitado a ${brand.appName}. Acepta tu invitación aquí: ${sampleUrl}`,
            }
        }

        case "REAUTHENTICATION": {
            const buildReauthBody = (tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Por tu seguridad, necesitamos confirmar que realmente eres tú antes de completar esta acción sensible en <strong>${brand.appName}</strong>.</p>
              ${buildOtpSpotlightBlock(tokenVar, color)}
            `

            const sampleToken = payload.token || "604219"

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de seguridad de ${brand.appName} es ${sampleToken}`,
                badgeText: "Seguridad",
                badgeTone: "amber",
                headline: "Confirma tu identidad",
                subtitle: "Verificación requerida para proteger tu cuenta",
                bodyHtml: buildReauthBody(sampleToken),
                footerNote:
                    "Si no realizaste esta acción, te recomendamos cambiar tu contraseña de inmediato.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de seguridad de ${brand.appName} es {{ .Token }}`,
                badgeText: "Seguridad",
                badgeTone: "amber",
                headline: "Confirma tu identidad",
                subtitle: "Verificación requerida para proteger tu cuenta",
                bodyHtml: buildReauthBody("{{ .Token }}"),
                footerNote:
                    "Si no realizaste esta acción, te recomendamos cambiar tu contraseña de inmediato.",
            })

            return {
                ...meta,
                subject: `${sampleToken} es tu código de seguridad — ${brand.appName}`,
                supabaseSubject: `{{ .Token }} es tu código de seguridad — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Tu código de seguridad de ${brand.appName} es: ${sampleToken}.`,
            }
        }

        case "WELCOME_TRIAL": {
            const trialDays = payload.trialDays ?? 15
            const trialEndDate =
                payload.trialEndsAt ||
                new Date(Date.now() + trialDays * 86400000).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                })

            const bodyHtml = `
              <p style="margin:0 0 14px 0;">Hola <strong>${userName}</strong>,</p>
              <p style="margin:0 0 18px 0;">Tu correo ha sido verificado y tu cuenta en <strong>${brand.appName}</strong> ya está activa. Desde hoy tienes <strong>${trialDays} días de acceso completo a todas las funciones Premium</strong> sin ningún compromiso ni cargos automáticos.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;">
                <tr>
                  <td style="padding:20px 22px 14px 22px;border-bottom:1px solid #E2E8F0;">
                    <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${color};">Estado de tu cuenta</span>
                    <div style="font-size:16px;font-weight:800;color:#0F172A;margin-top:4px;">Prueba Completa de ${trialDays} Días Activa</div>
                    <div style="font-size:12.5px;color:#64748B;margin-top:2px;">Acceso total disponible hasta el <strong>${trialEndDate}</strong></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 22px 20px 22px;font-size:13.5px;color:#334155;line-height:1.75;">
                    <strong style="color:${color};">✓</strong> <strong>Cuentas y tarjetas ilimitadas:</strong> Bancos, efectivo, billeteras y tarjetas de crédito.<br />
                    <strong style="color:${color};">✓</strong> <strong>Modo Demostración reversible:</strong> Explora todo con datos de ejemplo y límpialos con 1 clic.<br />
                    <strong style="color:${color};">✓</strong> <strong>Presupuestos, Préstamos y Metas:</strong> Diagnóstico 50/30/20 y reportes en Excel y PDF.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#475569;">Al finalizar los ${trialDays} días, conservarás tu <strong>Plan Básico gratis de por vida</strong> con todos tus datos intactos, o podrás elegir un plan Premium desde S/. 10 al mes.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Bienvenido a ${brand.appName}. Tus ${trialDays} días de acceso completo ya están activos.`,
                badgeText: "Alta Exitosa",
                badgeTone: "emerald",
                headline: `Bienvenido a ${brand.appName}, ${userName}`,
                subtitle: "Tu espacio financiero ya está listo",
                bodyHtml,
                ctaLabel: "Entrar a mi panel financiero",
                ctaUrl: `${brand.siteUrl}/dashboard`,
                footerNote: `¿Tienes alguna consulta? Responde a este correo o escríbenos a ${brand.supportEmail}.`,
            })

            return {
                ...meta,
                subject: `Bienvenido a ${brand.appName} — Tus ${trialDays} días de prueba completa están activos`,
                html,
                text: `Hola ${userName}, tu cuenta en ${brand.appName} ya está activa con ${trialDays} días de prueba completa hasta el ${trialEndDate}. Ingresa en ${brand.siteUrl}/dashboard`,
            }
        }

        case "PAYMENT_ORDER_RECEIVED": {
            const orderCode = payload.orderCode || "LUM-84K9P2"
            const planName = payload.planName || "Premium Anual"
            const currency = payload.currency || "PEN"
            const amount = payload.amount ?? "79.00"
            const method = payload.paymentMethod || "YAPE"
            const opNumber = payload.operationNumber || "09481726"

            const bodyHtml = `
              <p style="margin:0 0 14px 0;">Hola <strong>${userName}</strong>,</p>
              <p style="margin:0 0 18px 0;">Hemos recibido el registro de tu pago para activar el plan <strong>${planName}</strong>. Estamos verificando la operación y activaremos tu suscripción en breve.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:18px;font-size:13.5px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #EEF2F6;">Código de orden</td>
                        <td align="right" style="padding:7px 0;font-weight:800;color:#0F172A;font-family:monospace;border-bottom:1px solid #EEF2F6;">${orderCode}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #EEF2F6;">Plan seleccionado</td>
                        <td align="right" style="padding:7px 0;font-weight:700;color:#0F172A;border-bottom:1px solid #EEF2F6;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #EEF2F6;">Importe reportado</td>
                        <td align="right" style="padding:7px 0;font-weight:800;color:${color};border-bottom:1px solid #EEF2F6;">${currency} ${Number(amount).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;color:#64748B;border-bottom:1px solid #EEF2F6;">Método y operación</td>
                        <td align="right" style="padding:7px 0;font-weight:700;color:#0F172A;border-bottom:1px solid #EEF2F6;">${method} · Op. ${opNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:9px 0 2px 0;color:#64748B;">Estado actual</td>
                        <td align="right" style="padding:9px 0 2px 0;font-weight:800;color:#D97706;">● En verificación</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#475569;">Recibirás un correo de confirmación apenas tu suscripción quede activada.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Recibimos tu orden ${orderCode} (${planName}). En verificación.`,
                badgeText: "Orden Recibida",
                badgeTone: "amber",
                headline: "Recibimos tu comprobante de pago",
                subtitle: `Orden ${orderCode} registrada correctamente`,
                bodyHtml,
                ctaLabel: "Ver estado de mi suscripción",
                ctaUrl: `${brand.siteUrl}/dashboard/billing`,
            })

            return {
                ...meta,
                subject: `Orden ${orderCode} recibida — ${planName} en verificación`,
                html,
                text: `Hola ${userName}, recibimos tu orden ${orderCode} por el plan ${planName} (${currency} ${amount} vía ${method}, Op. ${opNumber}). Te notificaremos apenas quede activada.`,
            }
        }

        case "SUBSCRIPTION_ACTIVATED": {
            const planName = payload.planName || "Premium Anual"
            const orderCode = payload.orderCode || "LUM-84K9P2"
            const validityLabel = payload.expiresAt
                ? `Válido hasta el ${new Date(payload.expiresAt).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                  })}`
                : "Acceso Vitalicio (De por vida · Sin renovaciones)"

            const bodyHtml = `
              <p style="margin:0 0 14px 0;">Hola <strong>${userName}</strong>,</p>
              <p style="margin:0 0 18px 0;">Tu suscripción a <strong>${brand.appName} Premium</strong> ha sido confirmada y activada. Ya tienes acceso ilimitado a todos los módulos avanzados de la plataforma.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:18px;font-size:13.5px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#065F46;">Plan activo</td>
                        <td align="right" style="padding:6px 0;font-weight:800;color:#064E3B;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#065F46;">Vigencia</td>
                        <td align="right" style="padding:6px 0;font-weight:700;color:#064E3B;">${validityLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#065F46;">Referencia</td>
                        <td align="right" style="padding:6px 0;font-weight:700;color:#064E3B;font-family:monospace;">${orderCode}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px 0;font-size:13.5px;font-weight:800;color:#0F172A;">Lo que tienes desbloqueado:</p>
              <div style="font-size:13.5px;color:#334155;line-height:1.75;">
                <strong style="color:#059669;">✓</strong> Cuentas bancarias, efectivo y tarjetas de crédito ilimitadas.<br />
                <strong style="color:#059669;">✓</strong> Presupuestos inteligentes, planificación y control de préstamos.<br />
                <strong style="color:#059669;">✓</strong> Metas de ahorro, transacciones recurrentes y suscripciones.<br />
                <strong style="color:#059669;">✓</strong> Exportación completa en Excel (.xlsx), PDF Ejecutivo y respaldos JSON.
              </div>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Tu suscripción ${planName} en ${brand.appName} ya está activa.`,
                badgeText: "Premium Activo",
                badgeTone: "emerald",
                headline: "Tu suscripción Premium está activa",
                subtitle: "Gracias por llevar tus finanzas al siguiente nivel",
                bodyHtml,
                ctaLabel: "Abrir Lumio Finance Premium",
                ctaUrl: `${brand.siteUrl}/dashboard`,
                footerNote:
                    "Gracias por confiar en Lumio Finance para organizar y hacer crecer tu patrimonio.",
            })

            return {
                ...meta,
                subject: `Suscripción Premium activada (${planName}) — ${brand.appName}`,
                html,
                text: `Hola ${userName}, tu suscripción ${planName} (${validityLabel}) ya está activa en ${brand.appName}. Ingresa en ${brand.siteUrl}/dashboard`,
            }
        }

        case "PAYMENT_ORDER_REJECTED": {
            const orderCode = payload.orderCode || "LUM-84K9P2"
            const planName = payload.planName || "Premium Mensual"
            const reason =
                payload.rejectionReason ||
                "No pudimos validar el número de operación o la imagen adjunta no era legible."

            const bodyHtml = `
              <p style="margin:0 0 14px 0;">Hola <strong>${userName}</strong>,</p>
              <p style="margin:0 0 16px 0;">Revisamos tu orden <strong>${orderCode}</strong> para el plan <strong>${planName}</strong>, pero encontramos el siguiente detalle al verificar el comprobante:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#FFF1F2;border:1px solid #FECDD3;border-radius:16px;">
                <tr>
                  <td style="padding:16px 20px;font-size:13.5px;line-height:1.6;color:#9F1239;">
                    <strong>Motivo reportado:</strong> ${reason}
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13.5px;color:#475569;">Puedes ingresar nuevamente a la sección de Suscripción para adjuntar la captura completa o corregir el número de operación, o responder directamente a este correo para ayudarte de inmediato.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Observación en tu orden ${orderCode} de ${brand.appName}`,
                badgeText: "Revisión de Pago",
                badgeTone: "rose",
                headline: "Necesitamos verificar tu comprobante",
                subtitle: `Orden ${orderCode} · ${planName}`,
                bodyHtml,
                ctaLabel: "Subir comprobante nuevamente",
                ctaUrl: `${brand.siteUrl}/dashboard/billing`,
                footerNote: `Si necesitas asistencia directa, escríbenos a ${brand.supportEmail}.`,
            })

            return {
                ...meta,
                subject: `Acción requerida en tu orden ${orderCode} — ${brand.appName}`,
                html,
                text: `Hola ${userName}, revisamos tu orden ${orderCode} (${planName}) y encontramos esta observación: ${reason}. Puedes volver a enviar tu comprobante en ${brand.siteUrl}/dashboard/billing`,
            }
        }

        case "TRIAL_EXPIRING_REMINDER": {
            const daysLeft = payload.trialDays ?? 3
            const bodyHtml = `
              <p style="margin:0 0 14px 0;">Hola <strong>${userName}</strong>,</p>
              <p style="margin:0 0 16px 0;">Te quedan <strong>${daysLeft} día(s)</strong> de tu periodo de prueba completa de 15 días en <strong>${brand.appName}</strong>. Queremos explicarte con total claridad cómo funciona tu cuenta:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;">
                <tr>
                  <td style="padding:18px 20px;font-size:13.5px;color:#334155;line-height:1.75;">
                    <strong style="color:${color};">•</strong> <strong>Tus datos nunca se borran:</strong> Si decides no suscribirte, pasas automáticamente al <strong>Plan Básico gratis de por vida</strong> (con 1 cuenta activa, movimientos ilimitados y vista en modo lector de tus demás módulos).<br />
                    <strong style="color:${color};">•</strong> <strong>Si deseas conservar acceso ilimitado:</strong> Puedes activar Premium con Yape, Plin, Tarjeta o PayPal desde <strong>S/. 10 al mes</strong>, <strong>S/. 79 al año</strong> o <strong>S/. 169 en un pago único de por vida</strong>.
                  </td>
                </tr>
              </table>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Te quedan ${daysLeft} días de prueba completa en ${brand.appName}`,
                badgeText: "Recordatorio",
                badgeTone: "violet",
                headline: `Tu prueba completa finaliza en ${daysLeft} días`,
                subtitle: "Sin cargos automáticos · Tú mantienes el control total",
                bodyHtml,
                ctaLabel: "Ver planes desde S/. 10",
                ctaUrl: `${brand.siteUrl}/dashboard/billing`,
                footerNote: "Cero cobros automáticos. Tú decides cuándo y cómo actualizar tu plan.",
            })

            return {
                ...meta,
                subject: `Te quedan ${daysLeft} días de prueba completa — ${brand.appName}`,
                html,
                text: `Hola ${userName}, te quedan ${daysLeft} días de tu prueba completa en ${brand.appName}. Recuerda que tu Plan Básico es gratis de por vida o puedes activar Premium desde S/. 10 en ${brand.siteUrl}/dashboard/billing`,
            }
        }
    }
}
