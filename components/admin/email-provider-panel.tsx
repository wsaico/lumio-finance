"use client"

import { useEffect, useState } from "react"
import {
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Server,
    ShieldAlert,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    EMAIL_PROVIDER_CATALOG,
    EMAIL_PROVIDER_IDS,
    type EmailProviderId,
    type EmailSecretFieldKey,
    type EmailTransportStatus,
    type PublicEmailProviderConfig,
} from "@/lib/email-providers"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface EmailProviderPanelProps {
    config: PublicEmailProviderConfig
    onSaved: (
        nextConfig: PublicEmailProviderConfig,
        nextTransport: EmailTransportStatus
    ) => void
}

const API_KEY_FIELD_BY_PROVIDER: Partial<
    Record<EmailProviderId, EmailSecretFieldKey>
> = {
    BREVO: "brevoApiKey",
    RESEND: "resendApiKey",
    SENDGRID: "sendgridApiKey",
}

export function EmailProviderPanel({
    config,
    onSaved,
}: EmailProviderPanelProps) {
    const [activeProvider, setActiveProvider] = useState<EmailProviderId>(
        config.activeProvider
    )
    const [fromName, setFromName] = useState(config.fromName)
    const [fromEmail, setFromEmail] = useState(config.fromEmail)
    const [replyTo, setReplyTo] = useState(config.replyTo)
    const [siteUrl, setSiteUrl] = useState(config.siteUrl)

    const [smtpHost, setSmtpHost] = useState(config.smtpHost)
    const [smtpPort, setSmtpPort] = useState(String(config.smtpPort || 587))
    const [smtpSecure, setSmtpSecure] = useState(config.smtpSecure)
    const [smtpUser, setSmtpUser] = useState(config.smtpUser)

    const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl)

    const [secretDrafts, setSecretDrafts] = useState<
        Partial<Record<EmailSecretFieldKey, string>>
    >({})
    const [clearSecrets, setClearSecrets] = useState<EmailSecretFieldKey[]>([])
    const [revealedSecrets, setRevealedSecrets] = useState<
        Partial<Record<EmailSecretFieldKey, boolean>>
    >({})

    const [saving, setSaving] = useState(false)
    const [showSupabaseGuide, setShowSupabaseGuide] = useState(false)

    useEffect(() => {
        setActiveProvider(config.activeProvider)
        setFromName(config.fromName)
        setFromEmail(config.fromEmail)
        setReplyTo(config.replyTo)
        setSiteUrl(config.siteUrl)
        setSmtpHost(config.smtpHost)
        setSmtpPort(String(config.smtpPort || 587))
        setSmtpSecure(config.smtpSecure)
        setSmtpUser(config.smtpUser)
        setWebhookUrl(config.webhookUrl)
        setSecretDrafts({})
        setClearSecrets([])
    }, [config])

    const activeMeta = EMAIL_PROVIDER_CATALOG[activeProvider]
    const activeReadiness = config.providersStatus[activeProvider]
    const activeApiKeyField = API_KEY_FIELD_BY_PROVIDER[activeProvider]

    const setSecretDraft = (key: EmailSecretFieldKey, value: string) => {
        setSecretDrafts((prev) => ({ ...prev, [key]: value }))
        if (value.trim()) {
            setClearSecrets((prev) => prev.filter((item) => item !== key))
        }
    }

    const toggleClearSecret = (key: EmailSecretFieldKey) => {
        setClearSecrets((prev) =>
            prev.includes(key)
                ? prev.filter((item) => item !== key)
                : [...prev, key]
        )
        setSecretDrafts((prev) => ({ ...prev, [key]: "" }))
    }

    const handleCopyValue = (label: string, value: string) => {
        navigator.clipboard.writeText(value)
        toast.success(`${label} copiado al portapapeles`)
    }

    const handleSave = async () => {
        if (saving) return
        setSaving(true)
        try {
            const secretsPayload: Partial<Record<EmailSecretFieldKey, string>> = {}
            for (const key of Object.keys(secretDrafts) as EmailSecretFieldKey[]) {
                const v = secretDrafts[key]?.trim()
                if (v) secretsPayload[key] = v
            }

            const res = await fetch("/api/admin/emails", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    activeProvider,
                    fromName: fromName.trim(),
                    fromEmail: fromEmail.trim(),
                    replyTo: replyTo.trim(),
                    siteUrl: siteUrl.trim(),
                    smtpHost: smtpHost.trim(),
                    smtpPort: Number(smtpPort) || 587,
                    smtpSecure,
                    smtpUser: smtpUser.trim(),
                    webhookUrl: webhookUrl.trim(),
                    secrets: secretsPayload,
                    clearSecrets,
                }),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(
                    data?.error || "No se pudo guardar el proveedor de correo"
                )
            }

            if (data.providerConfig && data.transport) {
                onSaved(data.providerConfig, data.transport)
            }
            toast.success(
                `Proveedor ${EMAIL_PROVIDER_CATALOG[activeProvider].shortLabel} guardado y activado`
            )
        } catch (err: any) {
            toast.error(err?.message || "Error al guardar la configuración")
        } finally {
            setSaving(false)
        }
    }

    const renderSecretControl = (opts: {
        fieldKey: EmailSecretFieldKey
        label: string
        placeholder: string
        help?: string
    }) => {
        const meta = config.secrets[opts.fieldKey]
        const isPendingClear = clearSecrets.includes(opts.fieldKey)
        const isVisible = Boolean(revealedSecrets[opts.fieldKey])
        const draftValue = secretDrafts[opts.fieldKey] || ""

        return (
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-bold">{opts.label}</Label>
                    <div className="flex items-center gap-2">
                        {meta.configured && !isPendingClear && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                                <KeyRound className="h-3 w-3" />
                                {meta.masked} ·{" "}
                                {meta.source === "DB"
                                    ? "Panel Admin"
                                    : "Variable .env"}
                            </span>
                        )}
                        {meta.source === "DB" && (
                            <button
                                type="button"
                                onClick={() => toggleClearSecret(opts.fieldKey)}
                                className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
                                    isPendingClear
                                        ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                        : "bg-muted/50 text-muted-foreground border-border hover:text-rose-600 hover:border-rose-500/30"
                                )}
                            >
                                <Trash2 className="h-3 w-3" />
                                {isPendingClear
                                    ? "Deshacer borrado"
                                    : "Borrar clave guardada"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Input
                        type={isVisible ? "text" : "password"}
                        value={draftValue}
                        onChange={(e) =>
                            setSecretDraft(opts.fieldKey, e.target.value)
                        }
                        placeholder={
                            isPendingClear
                                ? "La clave guardada se borrará al guardar"
                                : meta.configured
                                  ? "Clave guardada — escribe solo si deseas reemplazarla"
                                  : opts.placeholder
                        }
                        className="h-10 rounded-xl pr-10 font-mono text-xs bg-background"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            setRevealedSecrets((prev) => ({
                                ...prev,
                                [opts.fieldKey]: !isVisible,
                            }))
                        }
                        aria-label={isVisible ? "Ocultar clave" : "Mostrar clave"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    >
                        {isVisible ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {opts.help && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {opts.help}
                    </p>
                )}
            </div>
        )
    }

    const smtpGuidePreset =
        activeMeta.supabaseSmtp || EMAIL_PROVIDER_CATALOG.BREVO.supabaseSmtp!

    return (
        <div className="rounded-3xl bg-card border border-border/70 p-5 space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-foreground">
                            Proveedor de Correo Transaccional
                        </h3>
                        <span
                            className={cn(
                                "text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full",
                                activeReadiness.configured
                                    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            )}
                        >
                            {activeReadiness.configured
                                ? `${activeMeta.shortLabel} · Activo (${
                                      activeReadiness.source === "DB"
                                          ? "Panel Admin"
                                          : "Variable .env"
                                  })`
                                : `${activeMeta.shortLabel} · Falta configurar clave`}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Elige y cambia en caliente el motor de envío para
                        bienvenida, pagos y notificaciones SaaS sin redeploy.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-10 px-4 rounded-2xl text-xs font-extrabold gap-1.5 shrink-0 cursor-pointer"
                >
                    {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                    Guardar proveedor
                </Button>
            </div>

            {/* Provider Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {EMAIL_PROVIDER_IDS.map((id) => {
                    const meta = EMAIL_PROVIDER_CATALOG[id]
                    const readiness = config.providersStatus[id]
                    const isSelected = activeProvider === id
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveProvider(id)}
                            className={cn(
                                "text-left p-3 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between",
                                isSelected
                                    ? "bg-primary/10 border-primary/50 shadow-xs"
                                    : "bg-muted/25 border-border/60 hover:bg-muted/50"
                            )}
                        >
                            <div className="flex items-start justify-between gap-1.5">
                                <span className="text-xs font-extrabold text-foreground leading-tight">
                                    {meta.shortLabel}
                                </span>
                                {meta.recommended && (
                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                                        Recomendado
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-1">
                                <span
                                    className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                        readiness.configured
                                            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                            : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {readiness.configured
                                        ? "Listo"
                                        : "Sin clave"}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Common Sender Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                        Nombre del remitente (From Name)
                    </Label>
                    <Input
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="Lumio Finance"
                        className="h-10 rounded-xl text-xs"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                        Correo remitente (From Email)
                    </Label>
                    <Input
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="no-reply@esaico.com"
                        className="h-10 rounded-xl text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Usa tu dominio verificado{" "}
                        <code className="font-mono text-foreground/80">
                            esaico.com
                        </code>{" "}
                        (ej.{" "}
                        <code className="font-mono text-foreground/80">
                            no-reply@esaico.com
                        </code>
                        ).
                    </p>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                        Correo de respuesta y soporte (Reply-To)
                    </Label>
                    <Input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        placeholder="willysaico@gmail.com"
                        className="h-10 rounded-xl text-xs"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                        URL pública de la plataforma (enlaces de correo)
                    </Label>
                    <Input
                        value={siteUrl}
                        onChange={(e) => setSiteUrl(e.target.value)}
                        placeholder="https://lumio.esaico.com"
                        className="h-10 rounded-xl text-xs"
                    />
                </div>
            </div>

            {/* Provider-Specific Credentials Box */}
            <div className="rounded-2xl bg-muted/30 border border-border/60 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                            Credenciales · {activeMeta.label}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {activeMeta.tagline}
                        </p>
                    </div>
                    <code className="text-[10px] font-mono px-2 py-1 rounded-lg bg-background border border-border/60 text-muted-foreground self-start">
                        ENV: {activeMeta.envVarHint}
                    </code>
                </div>

                {activeApiKeyField &&
                    renderSecretControl({
                        fieldKey: activeApiKeyField,
                        label: `API Key de ${activeMeta.shortLabel}`,
                        placeholder:
                            activeProvider === "BREVO"
                                ? "xkeysib-..."
                                : activeProvider === "RESEND"
                                  ? "re_..."
                                  : "SG....",
                        help: activeMeta.credentialHelp,
                    })}

                {activeProvider === "SMTP" && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold">
                                    Servidor SMTP (Host)
                                </Label>
                                <Input
                                    value={smtpHost}
                                    onChange={(e) =>
                                        setSmtpHost(e.target.value)
                                    }
                                    placeholder="smtp-relay.brevo.com"
                                    className="h-10 rounded-xl text-xs bg-background"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">
                                    Puerto SMTP
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={smtpPort}
                                    onChange={(e) =>
                                        setSmtpPort(e.target.value)
                                    }
                                    placeholder="587"
                                    className="h-10 rounded-xl text-xs bg-background"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-background/70 border border-border/60 px-3.5 py-2.5">
                            <div>
                                <p className="text-xs font-bold text-foreground">
                                    Conexión SSL/TLS directa
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Puerto 465 = activado · Puerto 587 STARTTLS
                                    = desactivado
                                </p>
                            </div>
                            <Switch
                                checked={smtpSecure}
                                onCheckedChange={setSmtpSecure}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">
                                Usuario SMTP (Login)
                            </Label>
                            <Input
                                value={smtpUser}
                                onChange={(e) => setSmtpUser(e.target.value)}
                                placeholder="xxxxx@smtp-brevo.com"
                                className="h-10 rounded-xl text-xs bg-background"
                            />
                        </div>

                        {renderSecretControl({
                            fieldKey: "smtpPass",
                            label: "Contraseña / Clave SMTP",
                            placeholder: "xsmtpsib-...",
                            help: activeMeta.credentialHelp,
                        })}
                    </div>
                )}

                {activeProvider === "WEBHOOK" && (
                    <div className="space-y-3.5">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold">
                                Endpoint URL (POST JSON)
                            </Label>
                            <Input
                                type="url"
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://hook.us1.make.com/..."
                                className="h-10 rounded-xl text-xs bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                {activeMeta.credentialHelp}
                            </p>
                        </div>

                        {renderSecretControl({
                            fieldKey: "webhookSecret",
                            label: "Secreto del Webhook (opcional)",
                            placeholder: "whsec_...",
                            help: "Se enviará en las cabeceras X-Webhook-Secret y Authorization: Bearer.",
                        })}
                    </div>
                )}
            </div>

            {/* Local Fallback Migration Notice */}
            {config.storageMode === "LOCAL_FALLBACK" && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 leading-relaxed">
                        <p className="font-bold">
                            Modo respaldo local activo (.lumio-email-settings.json)
                        </p>
                        <p className="text-[11px] opacity-90">
                            Para persistir cambios en producción (Vercel) con
                            cifrado y RLS solo para administradores, ejecuta la
                            migración{" "}
                            <code className="font-mono font-bold">
                                supabase/migrations/20261121_email_provider_settings.sql
                            </code>{" "}
                            en Supabase SQL Editor.
                        </p>
                    </div>
                </div>
            )}

            {/* Collapsible Supabase Auth Custom SMTP Guide */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowSupabaseGuide((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-extrabold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                >
                    <span className="inline-flex items-center gap-2">
                        <Server className="h-3.5 w-3.5 text-primary" />
                        Ver datos SMTP para Supabase Auth (OTP de 6 dígitos y
                        recuperar clave)
                    </span>
                    {showSupabaseGuide ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>

                {showSupabaseGuide && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3 text-xs">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Los correos de acceso OTP y recuperación los envía{" "}
                            <strong>Supabase Auth</strong> directamente.
                            Configura estos datos en{" "}
                            <strong>
                                Supabase Dashboard → Authentication → Emails →
                                SMTP Settings
                            </strong>{" "}
                            para quitar el límite de 2 correos/hora:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                                {
                                    label: "Host SMTP",
                                    value: smtpGuidePreset.host,
                                },
                                {
                                    label: "Puerto",
                                    value: String(smtpGuidePreset.port),
                                },
                                {
                                    label: "Sender Email",
                                    value: fromEmail || "no-reply@esaico.com",
                                },
                                {
                                    label: "Sender Name",
                                    value: fromName || "Lumio Finance",
                                },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between gap-2 rounded-xl bg-background border border-border/60 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                            {item.label}
                                        </p>
                                        <p className="font-mono text-xs text-foreground truncate">
                                            {item.value}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            handleCopyValue(
                                                item.label,
                                                item.value
                                            )
                                        }
                                        className="h-7 w-7 p-0 shrink-0 cursor-pointer"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="text-[11px] text-muted-foreground space-y-1">
                            <p>
                                <strong>Username SMTP:</strong>{" "}
                                {smtpGuidePreset.userHint} ·{" "}
                                <strong>Password SMTP:</strong>{" "}
                                {smtpGuidePreset.passHint}
                            </p>
                            <p>
                                También puedes aplicarlo por CLI ejecutando:{" "}
                                <code className="font-mono bg-background px-1.5 py-0.5 rounded border border-border/60 text-foreground">
                                    node scripts/sync-supabase-emails.mjs --push --push-smtp
                                </code>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
