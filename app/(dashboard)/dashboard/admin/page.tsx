"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
    Check,
    CheckCircle2,
    Copy,
    CreditCard,
    Crown,
    Loader2,
    Mail,
    Palette,
    Search,
    Send,
    ShieldCheck,
    Sparkles,
    Upload,
    Users,
    XCircle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useUser } from "@/hooks/useUser"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { ACCENT_COLORS } from "@/lib/appearance"
import type { PlanDefinition } from "@/lib/entitlements"
import type { SystemBrandingSettings } from "@/lib/server/system-settings"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

async function toCompressedImage(file: File, maxDim = 512): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const img = new Image()
            img.onload = () => {
                const ratio = Math.min(1, maxDim / Math.max(img.width, img.height))
                const w = Math.round(img.width * ratio)
                const h = Math.round(img.height * ratio)
                const canvas = document.createElement("canvas")
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    resolve(String(reader.result))
                    return
                }
                ctx.drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL("image/png"))
            }
            img.onerror = reject
            img.src = String(reader.result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export default function AdminDashboardPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { profile, isLoading: userLoading } = useUser()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<SystemBrandingSettings | null>(null)
    const [plans, setPlans] = useState<PlanDefinition[]>([])
    const [orders, setOrders] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [userSearch, setUserSearch] = useState("")
    const [emailTemplates, setEmailTemplates] = useState<any[]>([])
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("OTP_VERIFICATION")
    const [emailTransport, setEmailTransport] = useState<any>(null)
    const [emailLogs, setEmailLogs] = useState<any[]>([])
    const [testRecipient, setTestRecipient] = useState<string>("willysaico@gmail.com")
    const [sendingTestEmail, setSendingTestEmail] = useState(false)

    const loadAll = async () => {
        setLoading(true)
        try {
            const [sRes, oRes, uRes, eRes] = await Promise.all([
                fetch("/api/admin/settings"),
                fetch("/api/admin/orders"),
                fetch("/api/admin/users"),
                fetch("/api/admin/emails"),
            ])
            if (sRes.status === 403 || sRes.status === 401) {
                router.replace("/dashboard")
                return
            }
            if (sRes.ok) {
                const sData = await sRes.json()
                setSettings(sData.settings)
                setPlans(sData.plans || [])
            }
            if (oRes.ok) setOrders(await oRes.json())
            if (uRes.ok) setUsers(await uRes.json())
            if (eRes.ok) {
                const eData = await eRes.json()
                setEmailTemplates(eData.templates || [])
                setEmailTransport(eData.transport || null)
                setEmailLogs(eData.logs || [])
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSendTestEmail = async (templateId: string) => {
        if (!testRecipient.trim() || sendingTestEmail) return
        setSendingTestEmail(true)
        try {
            const res = await fetch("/api/admin/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId, to: testRecipient.trim() }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || "Error al despachar plantilla")
            if (Array.isArray(data?.logs)) setEmailLogs(data.logs)
            toast.success(
                data.transport === "RESEND" || data.transport === "WEBHOOK"
                    ? `Correo enviado a ${testRecipient}`
                    : `Plantilla procesada y registrada en el historial de notificaciones`
            )
        } catch (err: any) {
            toast.error(err?.message || "No se pudo enviar el correo de prueba")
        } finally {
            setSendingTestEmail(false)
        }
    }

    useEffect(() => {
        if (!userLoading) {
            if (!profile?.isAdmin) {
                router.replace("/dashboard")
                return
            }
            loadAll()
        }
    }, [userLoading, profile?.isAdmin])

    const handleSaveSettingsAndPlans = async () => {
        if (!settings) return
        setSaving(true)
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings, plans }),
            })
            if (!res.ok) throw new Error("No se pudo guardar")
            useSettingsStore.getState().setAccentColor(settings.primary_color, false)
            await queryClient.invalidateQueries({ queryKey: ["system-branding"] })
            toast.success("Configuración global actualizada")
        } catch (err: any) {
            toast.error(err?.message || "Error al guardar")
        } finally {
            setSaving(false)
        }
    }

    const handleReviewOrder = async (orderId: string, status: "APPROVED" | "REJECTED") => {
        try {
            const res = await fetch("/api/admin/orders", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status }),
            })
            if (!res.ok) throw new Error("Error al procesar orden")
            toast.success(status === "APPROVED" ? "Pago aprobado y plan activado" : "Orden rechazada")
            await loadAll()
        } catch (err: any) {
            toast.error(err?.message || "No se pudo actualizar la orden")
        }
    }

    const handleUpdateUser = async (userId: string, payload: { planCode?: string; role?: string }) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, ...payload }),
            })
            if (!res.ok) throw new Error("No se pudo actualizar el usuario")
            toast.success("Usuario actualizado")
            await loadAll()
        } catch (err: any) {
            toast.error(err?.message || "Error al actualizar")
        }
    }

    if (loading || !settings) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
        )
    }

    const pendingOrders = orders.filter((o) => o.status === "PENDING_VERIFICATION")
    const approvedTotalPen = orders
        .filter((o) => o.status === "APPROVED" && o.currency_code === "PEN")
        .reduce((s, o) => s + Number(o.amount || 0), 0)
    const premiumCount = users.filter((u) => u.plan_tier === "PREMIUM").length

    const filteredUsers = users.filter((u) => {
        const q = userSearch.trim().toLowerCase()
        if (!q) return true
        return (
            (u.full_name || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q)
        )
    })

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        Centro de Control SaaS
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        Administración Global
                    </h1>
                </div>
                <Button
                    onClick={handleSaveSettingsAndPlans}
                    disabled={saving}
                    className="h-10 px-5 rounded-2xl font-extrabold text-xs gap-2 shadow-md shadow-primary/20"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Guardar cambios globales
                </Button>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Usuarios</span>
                    <p className="text-2xl font-black text-foreground">{users.length}</p>
                </div>
                <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Premium activos</span>
                    <p className="text-2xl font-black text-primary">{premiumCount}</p>
                </div>
                <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Pagos por revisar</span>
                    <p className="text-2xl font-black text-amber-500">{pendingOrders.length}</p>
                </div>
                <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-1">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Ingresos confirmados</span>
                    <p className="text-2xl font-black text-emerald-600 tabular-nums">
                        S/. {approvedTotalPen.toFixed(2)}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="branding" className="space-y-5">
                <TabsList className="bg-card p-1.5 border border-border/70 rounded-2xl h-auto flex-wrap justify-start gap-1">
                    <TabsTrigger value="branding" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <Palette className="h-3.5 w-3.5" />
                        Marca y Logo
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <Crown className="h-3.5 w-3.5" />
                        Planes y Trial
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        Métodos de Pago
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        Aprobar Pagos ({pendingOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="users" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <Users className="h-3.5 w-3.5" />
                        Usuarios
                    </TabsTrigger>
                    <TabsTrigger value="emails" className="rounded-xl text-xs font-bold gap-1.5 px-3.5 py-2">
                        <Mail className="h-3.5 w-3.5" />
                        Correos y Plantillas ({emailTemplates.length || 7})
                    </TabsTrigger>
                </TabsList>

                {/* 1. BRANDING */}
                <TabsContent value="branding" className="space-y-5">
                    <div className="rounded-3xl bg-card border border-border/70 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Nombre de la plataforma</Label>
                                <Input
                                    value={settings.app_name}
                                    onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                                    className="h-11 rounded-2xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Color de marca del sistema</Label>
                                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                    {ACCENT_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setSettings({ ...settings, primary_color: c.value })}
                                            className={cn(
                                                "h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                                                settings.primary_color === c.value &&
                                                    "ring-2 ring-offset-2 ring-foreground"
                                            )}
                                            style={{ backgroundColor: c.value }}
                                        >
                                            {settings.primary_color === c.value && (
                                                <Check className="h-4 w-4 text-white" />
                                            )}
                                        </button>
                                    ))}
                                    <Input
                                        value={settings.primary_color}
                                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                        className="w-28 h-9 rounded-xl font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: "logo_light_url" as const, label: "Logo Modo Claro" },
                                { key: "logo_dark_url" as const, label: "Logo Modo Oscuro" },
                                { key: "logo_white_url" as const, label: "Logo Blanco Monocromo" },
                            ].map((item) => (
                                <div key={item.key} className="flex items-center gap-3">
                                    <img
                                        src={settings[item.key] || "/icons/icon-light.png"}
                                        alt={item.label}
                                        className="h-12 w-12 rounded-2xl object-contain bg-muted p-1 border border-border shrink-0"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs font-bold">{item.label}</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={settings[item.key]}
                                                onChange={(e) =>
                                                    setSettings({ ...settings, [item.key]: e.target.value })
                                                }
                                                className="h-9 rounded-xl text-xs flex-1"
                                            />
                                            <label className="h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                                                <Upload className="h-3.5 w-3.5" />
                                                Subir
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const f = e.target.files?.[0]
                                                        if (!f) return
                                                        const dataUrl = await toCompressedImage(f, 360)
                                                        setSettings({ ...settings, [item.key]: dataUrl })
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* 2. PLANS & TRIAL */}
                <TabsContent value="plans" className="space-y-5">
                    <div className="rounded-3xl bg-card border border-border/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-black text-foreground">Días de prueba gratuita (Trial)</h3>
                            <p className="text-xs text-muted-foreground">
                                Los usuarios nuevos prueban todos los módulos sin tarjeta durante este tiempo.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={90}
                                value={settings.trial_days}
                                onChange={(e) =>
                                    setSettings({ ...settings, trial_days: Number(e.target.value) || 0 })
                                }
                                className="w-24 h-10 rounded-xl font-black text-center"
                            />
                            <span className="text-xs font-bold text-muted-foreground">días</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map((plan, idx) => (
                            <div
                                key={plan.code}
                                className="rounded-3xl bg-card border border-border/70 p-5 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-mono uppercase text-muted-foreground">
                                            {plan.code}
                                        </span>
                                        <h4 className="text-base font-black text-foreground">{plan.name}</h4>
                                    </div>
                                    <Switch
                                        checked={plan.is_active !== false}
                                        onCheckedChange={(checked) => {
                                            const copy = [...plans]
                                            copy[idx] = { ...plan, is_active: checked }
                                            setPlans(copy)
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold">Precio Soles (S/.)</Label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            value={plan.price_pen}
                                            onChange={(e) => {
                                                const copy = [...plans]
                                                copy[idx] = { ...plan, price_pen: Number(e.target.value) }
                                                setPlans(copy)
                                            }}
                                            className="h-10 rounded-xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold">Precio USD ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            value={plan.price_usd}
                                            onChange={(e) => {
                                                const copy = [...plans]
                                                copy[idx] = { ...plan, price_usd: Number(e.target.value) }
                                                setPlans(copy)
                                            }}
                                            className="h-10 rounded-xl font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold">Etiqueta destacada</Label>
                                    <Input
                                        value={plan.badge || ""}
                                        onChange={(e) => {
                                            const copy = [...plans]
                                            copy[idx] = { ...plan, badge: e.target.value || null }
                                            setPlans(copy)
                                        }}
                                        placeholder="Ej. Más popular"
                                        className="h-9 rounded-xl text-xs"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* 3. PAYMENT METHODS */}
                <TabsContent value="payments" className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(["yape", "plin"] as const).map((method) => {
                            const cfg = settings.payment_config[method]
                            return (
                                <div key={method} className="rounded-3xl bg-card border border-border/70 p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-black text-base uppercase">{method}</h4>
                                        <Switch
                                            checked={cfg.enabled}
                                            onCheckedChange={(v) =>
                                                setSettings({
                                                    ...settings,
                                                    payment_config: {
                                                        ...settings.payment_config,
                                                        [method]: { ...cfg, enabled: v },
                                                    },
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Número celular</Label>
                                        <Input
                                            value={cfg.number}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    payment_config: {
                                                        ...settings.payment_config,
                                                        [method]: { ...cfg, number: e.target.value },
                                                    },
                                                })
                                            }
                                            placeholder="999 999 999"
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold">Titular</Label>
                                        <Input
                                            value={cfg.holder}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    payment_config: {
                                                        ...settings.payment_config,
                                                        [method]: { ...cfg, holder: e.target.value },
                                                    },
                                                })
                                            }
                                            className="h-10 rounded-xl"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {cfg.qrUrl && (
                                            <img
                                                src={cfg.qrUrl}
                                                alt={`QR ${method}`}
                                                className="h-16 w-16 rounded-xl object-contain bg-white border p-1"
                                            />
                                        )}
                                        <label className="h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                                            <Upload className="h-3.5 w-3.5" />
                                            Subir imagen QR
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const f = e.target.files?.[0]
                                                    if (!f) return
                                                    const dataUrl = await toCompressedImage(f, 512)
                                                    setSettings({
                                                        ...settings,
                                                        payment_config: {
                                                            ...settings.payment_config,
                                                            [method]: { ...cfg, qrUrl: dataUrl },
                                                        },
                                                    })
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            )
                        })}

                        <div className="rounded-3xl bg-card border border-border/70 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-base">Visa / Mastercard (Culqi)</h4>
                                <Switch
                                    checked={settings.payment_config.card.enabled}
                                    onCheckedChange={(v) =>
                                        setSettings({
                                            ...settings,
                                            payment_config: {
                                                ...settings.payment_config,
                                                card: { ...settings.payment_config.card, enabled: v },
                                            },
                                        })
                                    }
                                />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Configura las variables <code className="font-mono">NEXT_PUBLIC_CULQI_PUBLIC_KEY</code> y <code className="font-mono">CULQI_SECRET_KEY</code> en tu entorno para cobros automáticos con tarjeta.
                            </p>
                        </div>

                        <div className="rounded-3xl bg-card border border-border/70 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-base">PayPal</h4>
                                <Switch
                                    checked={settings.payment_config.paypal.enabled}
                                    onCheckedChange={(v) =>
                                        setSettings({
                                            ...settings,
                                            payment_config: {
                                                ...settings.payment_config,
                                                paypal: { ...settings.payment_config.paypal, enabled: v },
                                            },
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold">Enlace PayPal.me (opcional)</Label>
                                <Input
                                    value={settings.payment_config.paypal.paypalMe}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            payment_config: {
                                                ...settings.payment_config,
                                                paypal: { ...settings.payment_config.paypal, paypalMe: e.target.value },
                                            },
                                        })
                                    }
                                    placeholder="https://paypal.me/tuusuario"
                                    className="h-10 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* 4. PAYMENT ORDERS APPROVAL */}
                <TabsContent value="orders" className="space-y-4">
                    <div className="rounded-3xl bg-card border border-border/70 divide-y divide-border/50 overflow-hidden">
                        {orders.length === 0 ? (
                            <p className="p-8 text-center text-xs text-muted-foreground">
                                No hay órdenes de pago registradas aún.
                            </p>
                        ) : (
                            orders.map((ord) => (
                                <div key={ord.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        {ord.proof_url && (
                                            <a
                                                href={ord.proof_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0"
                                            >
                                                <img
                                                    src={ord.proof_url}
                                                    alt="Comprobante"
                                                    className="h-14 w-14 rounded-xl object-cover border border-border"
                                                />
                                            </a>
                                        )}
                                        <div className="space-y-0.5 min-w-0 text-xs">
                                            <p className="font-black text-sm text-foreground">
                                                {ord.order_code} · {ord.plan_code}
                                            </p>
                                            <p className="text-muted-foreground truncate">
                                                {ord.user_email || ord.user_id} · {ord.payment_method} · Op. {ord.operation_number}
                                            </p>
                                            <p className="font-bold text-primary">
                                                {ord.currency_code} {Number(ord.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {ord.status === "PENDING_VERIFICATION" ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReviewOrder(ord.id, "REJECTED")}
                                                    className="h-9 rounded-xl text-xs font-bold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" /> Rechazar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReviewOrder(ord.id, "APPROVED")}
                                                    className="h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar y activar
                                                </Button>
                                            </>
                                        ) : (
                                            <span
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-bold",
                                                    ord.status === "APPROVED"
                                                        ? "bg-emerald-500/12 text-emerald-600"
                                                        : "bg-rose-500/12 text-rose-600"
                                                )}
                                            >
                                                {ord.status === "APPROVED" ? "Aprobado" : "Rechazado"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* 5. USERS MANAGEMENT */}
                <TabsContent value="users" className="space-y-4">
                    <div className="relative max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <Input
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Buscar usuario por nombre o correo..."
                            className="pl-10 h-10 rounded-2xl bg-card"
                        />
                    </div>

                    <div className="rounded-3xl bg-card border border-border/70 divide-y divide-border/50 overflow-hidden">
                        {filteredUsers.map((u) => (
                            <div
                                key={u.id}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-foreground truncate">
                                            {u.full_name}
                                        </span>
                                        {u.role === "ADMIN" && (
                                            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold">
                                                ADMIN
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground truncate">{u.email}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Select
                                        value={u.plan_code || "FREE"}
                                        onValueChange={(val) => handleUpdateUser(u.id, { planCode: val })}
                                    >
                                        <SelectTrigger className="w-[175px] h-9 rounded-xl text-xs font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="FREE">Plan Básico (Gratis)</SelectItem>
                                            <SelectItem value="PREMIUM_MONTHLY">Premium Mensual</SelectItem>
                                            <SelectItem value="PREMIUM_SEMIANNUAL">Premium 6 Meses</SelectItem>
                                            <SelectItem value="PREMIUM_ANNUAL">Premium Anual</SelectItem>
                                            <SelectItem value="PREMIUM_LIFETIME">Premium De por vida</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* 6. EMAIL TEMPLATES STUDIO & DISPATCHER */}
                <TabsContent value="emails" className="space-y-5">
                    {(() => {
                        const activeTpl =
                            emailTemplates.find((t) => t.id === selectedTemplateId) ||
                            emailTemplates[0]
                        return (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                {/* Left Catalog of 7 Templates */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                                Catálogo de Plantillas ({emailTemplates.length})
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                                                    emailTransport?.resendConfigured ||
                                                        emailTransport?.webhookConfigured
                                                        ? "bg-emerald-500/12 text-emerald-600"
                                                        : "bg-primary/12 text-primary"
                                                )}
                                            >
                                                {emailTransport?.resendConfigured
                                                    ? "Resend SMTP Activo"
                                                    : emailTransport?.webhookConfigured
                                                      ? "Webhook SMTP Activo"
                                                      : "Motor Integrado + Notificaciones"}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            {emailTemplates.map((tpl) => {
                                                const isSelected = tpl.id === activeTpl?.id
                                                const isSupa = tpl.category === "AUTH_SUPABASE"
                                                return (
                                                    <button
                                                        key={tpl.id}
                                                        type="button"
                                                        onClick={() => setSelectedTemplateId(tpl.id)}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-2xl border transition-all cursor-pointer space-y-1",
                                                            isSelected
                                                                ? "bg-primary/10 border-primary/40 shadow-xs"
                                                                : "bg-muted/25 border-border/60 hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-xs font-extrabold text-foreground leading-snug">
                                                                {tpl.name}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    "shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                                    isSupa
                                                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                                )}
                                                            >
                                                                {isSupa ? "Supabase Auth" : "Automático API"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {tpl.triggerDescription}
                                                        </p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Recent Transactional Dispatch Log */}
                                    <div className="rounded-3xl bg-card border border-border/70 p-4 space-y-2.5">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                            Historial Reciente de Disparo ({emailLogs.length})
                                        </span>
                                        {emailLogs.length === 0 ? (
                                            <p className="text-xs text-muted-foreground py-2">
                                                Aún no se han disparado correos en esta sesión. Usa el botón de prueba o registra una orden.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                                {emailLogs.slice(0, 8).map((log) => (
                                                    <div
                                                        key={log.id}
                                                        className="p-2.5 rounded-xl bg-muted/35 border border-border/60 text-xs flex items-center justify-between gap-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-foreground truncate">
                                                                {log.subject}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground truncate">
                                                                Para: {log.to} ·{" "}
                                                                {new Date(log.createdAt).toLocaleTimeString("es-PE")}
                                                            </p>
                                                        </div>
                                                        <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-600">
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Live HTML Email Preview & Actions */}
                                <div className="lg:col-span-7 space-y-4">
                                    {activeTpl && (
                                        <div className="rounded-3xl bg-card border border-border/70 p-5 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                                                        Asunto del correo
                                                    </span>
                                                    <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate mt-0.5">
                                                        {activeTpl.subject}
                                                    </h3>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    {activeTpl.supabaseHtml && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(
                                                                    activeTpl.supabaseHtml
                                                                )
                                                                toast.success(
                                                                    "HTML con variables {{ .Token }} copiado para Supabase Auth"
                                                                )
                                                            }}
                                                            className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                            Copiar para Supabase
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(activeTpl.html)
                                                            toast.success("Código HTML copiado al portapapeles")
                                                        }}
                                                        className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                        Copiar HTML
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Send Test Email Bar */}
                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/35 p-2.5 rounded-2xl border border-border/60">
                                                <Input
                                                    value={testRecipient}
                                                    onChange={(e) => setTestRecipient(e.target.value)}
                                                    placeholder="Correo de prueba (ej. willysaico@gmail.com)"
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={sendingTestEmail}
                                                    onClick={() => handleSendTestEmail(activeTpl.id)}
                                                    className="h-9 rounded-xl text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
                                                >
                                                    {sendingTestEmail ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Send className="h-3.5 w-3.5" />
                                                    )}
                                                    Probar envío
                                                </Button>
                                            </div>

                                            {/* Live Rendered HTML Email Frame */}
                                            <div className="rounded-2xl border border-border overflow-hidden bg-[#F4F4F8]">
                                                <iframe
                                                    title={activeTpl.name}
                                                    srcDoc={activeTpl.html}
                                                    className="w-full h-[540px] border-0"
                                                    sandbox="allow-same-origin"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </TabsContent>
            </Tabs>
        </div>
    )
}
