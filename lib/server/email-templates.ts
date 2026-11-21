export type EmailTemplateId =
    | "OTP_VERIFICATION"
    | "PASSWORD_RECOVERY"
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
}

export interface EmailTemplatePayload {
    userName?: string
    userEmail?: string
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
    triggerDescription: string
    subject: string
    html: string
    supabaseHtml?: string
    text: string
}

export const EMAIL_TEMPLATES_META: {
    id: EmailTemplateId
    name: string
    category: "AUTH_SUPABASE" | "LIFECYCLE_SAAS"
    triggerDescription: string
}[] = [
    {
        id: "OTP_VERIFICATION",
        name: "1. Código de Verificación de Registro (OTP 6 dígitos)",
        category: "AUTH_SUPABASE",
        triggerDescription:
            "Se envía cuando un nuevo usuario solicita crear su cuenta en /register para verificar su correo y evitar spam.",
    },
    {
        id: "PASSWORD_RECOVERY",
        name: "2. Recuperación de Contraseña",
        category: "AUTH_SUPABASE",
        triggerDescription:
            "Se envía cuando el usuario solicita restablecer su contraseña desde /forgot-password.",
    },
    {
        id: "WELCOME_TRIAL",
        name: "3. Bienvenida y Alta + 15 Días de Prueba Gratis",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en POST /api/auth/register al verificar el código de 6 dígitos y activar la cuenta.",
    },
    {
        id: "PAYMENT_ORDER_RECEIVED",
        name: "4. Orden de Suscripción Recibida (En Verificación)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en POST /api/payments/orders cuando el usuario envía su comprobante de Yape, Plin, Tarjeta o PayPal.",
    },
    {
        id: "SUBSCRIPTION_ACTIVATED",
        name: "5. Suscripción Premium Activada (Alta de Plan)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en PATCH /api/admin/orders al aprobar un pago o en PATCH /api/admin/users al asignar un plan Premium.",
    },
    {
        id: "PAYMENT_ORDER_REJECTED",
        name: "6. Observación en Comprobante de Pago",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se dispara automáticamente en PATCH /api/admin/orders cuando un comprobante no pudo validarse e incluye el motivo.",
    },
    {
        id: "TRIAL_EXPIRING_REMINDER",
        name: "7. Recordatorio de Fin de Prueba (Transición Transparente)",
        category: "LIFECYCLE_SAAS",
        triggerDescription:
            "Se envía antes de concluir los 15 días de prueba recordando que su Plan Básico es gratis de por vida o cómo pasar a Premium.",
    },
]

function wrapEmailLayout(params: {
    brand: EmailBrandContext
    preheader: string
    badgeText: string
    headline: string
    bodyHtml: string
    ctaLabel?: string
    ctaUrl?: string
    footerNote?: string
}): string {
    const { brand, preheader, badgeText, headline, bodyHtml, ctaLabel, ctaUrl, footerNote } =
        params
    const color = brand.primaryColor || "#7C3AED"

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#FFFFFF;border-radius:24px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 12px 32px -12px rgba(15,23,42,0.08);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${color} 0%, #3B0764 100%);background-color:${color};padding:28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;font-size:20px;font-weight:900;letter-spacing:-0.02em;color:#FFFFFF;">${brand.appName}</span>
                    <span style="display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,0.78);margin-top:2px;">${brand.tagline}</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:rgba(255,255,255,0.16);color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${badgeText}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:800;letter-spacing:-0.02em;color:#0F172A;">${headline}</h1>
              <div style="font-size:14px;line-height:1.65;color:#334155;">
                ${bodyHtml}
              </div>

              ${
                  ctaLabel && ctaUrl
                      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:8px;">
                <tr>
                  <td align="center" style="border-radius:14px;background-color:${color};">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:14px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>`
                      : ""
              }

              ${
                  footerNote
                      ? `<p style="margin:22px 0 0 0;padding-top:16px;border-top:1px solid #F1F5F9;font-size:12px;line-height:1.5;color:#64748B;">${footerNote}</p>`
                      : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:20px 36px;border-top:1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;line-height:1.6;color:#64748B;">
                    <strong style="color:#0F172A;">${brand.appName}</strong> · Gestión inteligente de finanzas personales<br />
                    Desarrollado por <a href="https://esaico.com" style="color:${color};text-decoration:none;font-weight:700;">Wilber Saico (esaico.com)</a>
                  </td>
                  <td align="right" style="font-size:11px;color:#94A3B8;">
                    <a href="${brand.siteUrl}/privacidad" style="color:#64748B;text-decoration:none;">Privacidad</a> ·
                    <a href="${brand.siteUrl}/terminos" style="color:#64748B;text-decoration:none;">Términos</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
    const brand: EmailBrandContext = {
        appName: brandInput?.appName || "Lumio Finance",
        tagline: brandInput?.tagline || "Claridad financiera para tu día a día",
        primaryColor: brandInput?.primaryColor || "#7C3AED",
        siteUrl:
            brandInput?.siteUrl ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000",
        supportEmail: brandInput?.supportEmail || "willysaico@gmail.com",
    }

    const meta =
        EMAIL_TEMPLATES_META.find((m) => m.id === templateId) || EMAIL_TEMPLATES_META[0]
    const userName = payload.userName || "Wilber"
    const color = brand.primaryColor

    switch (templateId) {
        case "OTP_VERIFICATION": {
            const buildOtpBody = (tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Hola,</p>
              <p style="margin:0 0 20px 0;">Estás a un paso de activar tu cuenta en <strong>${brand.appName}</strong> con tus <strong>15 días de acceso completo gratuito</strong>. Ingresa el siguiente código de verificación de 6 dígitos en la pantalla de registro:</p>
              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;padding:18px 32px;background-color:#F5F3FF;border:2px solid ${color};border-radius:18px;font-size:32px;font-weight:900;letter-spacing:10px;color:#1E1B4B;font-family:'Courier New',Courier,monospace;">
                  ${tokenVar}
                </div>
              </div>
              <p style="margin:0 0 10px 0;font-size:13px;color:#475569;">Por tu seguridad y para evitar registros automatizados, este código es de un solo uso y caduca en pocos minutos.</p>
            `

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de verificación de ${brand.appName} es ${payload.token || "482910"}`,
                badgeText: "Verificación",
                headline: "Verifica tu correo electrónico",
                bodyHtml: buildOtpBody(payload.token || "482910"),
                footerNote:
                    "Si no solicitaste crear una cuenta en Lumio Finance, puedes ignorar este correo con total tranquilidad.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Tu código de verificación de ${brand.appName} es {{ .Token }}`,
                badgeText: "Verificación",
                headline: "Verifica tu correo electrónico",
                bodyHtml: buildOtpBody("{{ .Token }}"),
                footerNote:
                    "Si no solicitaste crear una cuenta en Lumio Finance, puedes ignorar este correo con total tranquilidad.",
            })

            return {
                ...meta,
                subject: `Código de verificación: ${payload.token || "{{ .Token }}"} — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Tu código de verificación de ${brand.appName} es: ${payload.token || "482910"}. Ingresa estos 6 dígitos en la pantalla de registro para activar tu cuenta.`,
            }
        }

        case "PASSWORD_RECOVERY": {
            const buildRecoveryBody = (urlVar: string, tokenVar: string) => `
              <p style="margin:0 0 14px 0;">Recibimos una solicitud para restablecer la contraseña asociada a tu cuenta en <strong>${brand.appName}</strong>.</p>
              <p style="margin:0 0 18px 0;">Haz clic en el botón inferior para elegir una nueva contraseña de forma segura:</p>
              <div style="margin:18px 0;padding:14px 18px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;font-size:12px;color:#475569;">
                Código de seguridad alternativo: <strong style="color:#0F172A;font-family:monospace;letter-spacing:2px;">${tokenVar}</strong>
              </div>
            `

            const previewHtml = wrapEmailLayout({
                brand,
                preheader: `Restablece tu contraseña de ${brand.appName}`,
                badgeText: "Seguridad",
                headline: "Restablecer tu contraseña",
                bodyHtml: buildRecoveryBody(
                    payload.confirmationUrl || `${brand.siteUrl}/reset-password`,
                    payload.token || "739204"
                ),
                ctaLabel: "Crear nueva contraseña",
                ctaUrl: payload.confirmationUrl || `${brand.siteUrl}/reset-password`,
                footerNote:
                    "Si tú no solicitaste este cambio, tu cuenta sigue protegida y no necesitas hacer nada.",
            })

            const supabaseHtml = wrapEmailLayout({
                brand,
                preheader: `Restablece tu contraseña de ${brand.appName}`,
                badgeText: "Seguridad",
                headline: "Restablecer tu contraseña",
                bodyHtml: buildRecoveryBody("{{ .ConfirmationURL }}", "{{ .Token }}"),
                ctaLabel: "Crear nueva contraseña",
                ctaUrl: "{{ .ConfirmationURL }}",
                footerNote:
                    "Si tú no solicitaste este cambio, tu cuenta sigue protegida y no necesitas hacer nada.",
            })

            return {
                ...meta,
                subject: `Instrucciones para restablecer tu contraseña — ${brand.appName}`,
                html: previewHtml,
                supabaseHtml,
                text: `Para restablecer tu contraseña en ${brand.appName}, abre el siguiente enlace: ${payload.confirmationUrl || "{{ .ConfirmationURL }}"}`,
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

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:18px;">
                <tr>
                  <td style="padding-bottom:10px;border-bottom:1px solid #E2E8F0;">
                    <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:${color};">Estado de tu cuenta</span>
                    <div style="font-size:15px;font-weight:800;color:#0F172A;margin-top:2px;">Prueba Completa de ${trialDays} Días Activa</div>
                    <div style="font-size:12px;color:#64748B;margin-top:2px;">Acceso total disponible hasta el ${trialEndDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;font-size:13px;color:#334155;line-height:1.7;">
                    • <strong>Cuentas y tarjetas ilimitadas:</strong> Bancos, efectivo, billeteras y tarjetas de crédito.<br />
                    • <strong>Modo Demostración reversible:</strong> Explora todo con datos de ejemplo y límpialos con 1 clic.<br />
                    • <strong>Presupuestos, Préstamos y Metas:</strong> Diagnóstico 50/30/20 y reportes en Excel y PDF.
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#475569;">Al finalizar los ${trialDays} días, conservarás tu <strong>Plan Básico gratis de por vida</strong> con todos tus datos intactos, o podrás elegir un plan Premium desde S/. 10 al mes.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Bienvenido a ${brand.appName}. Tus ${trialDays} días de acceso completo ya están activos.`,
                badgeText: "Alta Exitosa",
                headline: `Bienvenido a ${brand.appName}, ${userName}`,
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

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:18px;font-size:13px;">
                <tr>
                  <td style="padding:6px 0;color:#64748B;">Código de orden:</td>
                  <td align="right" style="padding:6px 0;font-weight:800;color:#0F172A;font-family:monospace;">${orderCode}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;">Plan seleccionado:</td>
                  <td align="right" style="padding:6px 0;font-weight:700;color:#0F172A;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;">Importe reportado:</td>
                  <td align="right" style="padding:6px 0;font-weight:800;color:${color};">${currency} ${Number(amount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;">Método y N° operación:</td>
                  <td align="right" style="padding:6px 0;font-weight:700;color:#0F172A;">${method} · Op. ${opNumber}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;">Estado actual:</td>
                  <td align="right" style="padding:6px 0;font-weight:800;color:#D97706;">En verificación</td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#475569;">Recibirás un correo de confirmación apenas tu suscripción quede activada.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Recibimos tu orden ${orderCode} (${planName}). En verificación.`,
                badgeText: "Orden Recibida",
                headline: "Recibimos tu comprobante de pago",
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

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:16px;padding:18px;font-size:13px;">
                <tr>
                  <td style="padding:5px 0;color:#065F46;">Plan activo:</td>
                  <td align="right" style="padding:5px 0;font-weight:800;color:#064E3B;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#065F46;">Vigencia:</td>
                  <td align="right" style="padding:5px 0;font-weight:700;color:#064E3B;">${validityLabel}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;color:#065F46;">Referencia:</td>
                  <td align="right" style="padding:5px 0;font-weight:700;color:#064E3B;font-family:monospace;">${orderCode}</td>
                </tr>
              </table>

              <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#0F172A;">Lo que tienes desbloqueado:</p>
              <div style="font-size:13px;color:#334155;line-height:1.7;">
                • Cuentas bancarias, efectivo y tarjetas de crédito ilimitadas.<br />
                • Presupuestos inteligentes, planificación y control de préstamos.<br />
                • Metas de ahorro, transacciones recurrentes y suscripciones.<br />
                • Exportación completa en Excel (.xlsx), PDF Ejecutivo y respaldos JSON.
              </div>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Tu suscripción ${planName} en ${brand.appName} ya está activa.`,
                badgeText: "Premium Activo",
                headline: "Tu suscripción Premium está activa",
                bodyHtml,
                ctaLabel: "Abrir Lumio Finance Premium",
                ctaUrl: `${brand.siteUrl}/dashboard`,
                footerNote: "Gracias por confiar en Lumio Finance para organizar y hacer crecer tu patrimonio.",
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

              <div style="margin:18px 0;padding:16px 18px;background-color:#FFF1F2;border:1px solid #FECDD3;border-radius:14px;font-size:13px;color:#9F1239;">
                <strong>Motivo reportado:</strong> ${reason}
              </div>

              <p style="margin:0;font-size:13px;color:#475569;">Puedes ingresar nuevamente a la sección de Suscripción para adjuntar la captura completa o corregir el número de operación, o responder directamente a este correo para ayudarte de inmediato.</p>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Observación en tu orden ${orderCode} de ${brand.appName}`,
                badgeText: "Revisión de Pago",
                headline: "Necesitamos verificar tu comprobante",
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

              <div style="margin:18px 0;padding:16px 18px;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;font-size:13px;color:#334155;line-height:1.7;">
                • <strong>Tus datos nunca se borran:</strong> Si decides no suscribirte, pasas automáticamente al <strong>Plan Básico gratis de por vida</strong> (con 1 cuenta activa, movimientos ilimitados y vista en modo lector de tus demás módulos).<br />
                • <strong>Si deseas conservar acceso ilimitado:</strong> Puedes activar Premium con Yape, Plin, Tarjeta o PayPal desde <strong>S/. 10 al mes</strong>, <strong>S/. 79 al año</strong> o <strong>S/. 169 en un pago único de por vida</strong>.
              </div>
            `

            const html = wrapEmailLayout({
                brand,
                preheader: `Te quedan ${daysLeft} días de prueba completa en ${brand.appName}`,
                badgeText: "Recordatorio",
                headline: `Tu prueba completa finaliza en ${daysLeft} días`,
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
