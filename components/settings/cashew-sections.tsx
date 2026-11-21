"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useQueryClient } from "@tanstack/react-query"
import {
    AlertTriangle,
    ArrowUpRight,
    Bell,
    Calculator,
    Calendar,
    Check,
    Cloud,
    Coins,
    Contrast,
    Crown,
    DollarSign,
    Download,
    ExternalLink,
    Eye,
    EyeOff,
    FileJson,
    FileSpreadsheet,
    FileText,
    Globe,
    HandCoins,
    History,
    Home,
    KeyRound,
    Keyboard,
    LayoutGrid,
    ListFilter,
    Loader2,
    Lock,
    Moon,
    Monitor as MonitorIcon,
    Palette,
    Paperclip,
    PenTool,
    PieChart,
    PiggyBank,
    Plus,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
    SlidersHorizontal,
    Smartphone,
    Sparkles,
    Sun,
    Tags,
    Trash2,
    Type,
    Upload,
    User,
    Vibrate,
    Wallet,
    Zap,
} from "lucide-react"
import {
    SettingsSection,
    SettingsGroupCard,
    SettingsRow,
    SettingsSelect,
    SettingsSwitch,
} from "./settings-components"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Avatar } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { showAppToast } from "@/components/ui/app-alert-toast"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useUser } from "@/hooks/useUser"
import { useFormat } from "@/hooks/useFormat"
import { useSystemBranding } from "@/hooks/useSystemBranding"
import { usePWA } from "@/components/pwa/pwa-provider"
import { ACCENT_COLORS, FONT_OPTIONS } from "@/lib/appearance"
import { CURRENCIES, getCurrencyName } from "@/lib/currencies"
import { COMMON_TIMEZONES, REGIONS, getRegionByCountry } from "@/lib/regions"
import { formatTimeNowInTimezone } from "@/lib/timezone"
import { triggerHaptic } from "@/lib/haptics"
import { resetUserData } from "@/app/actions/settings/reset-data"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ============================================================================
// 1. CONFIGURACIÓN GENERAL
// ============================================================================
export function GeneralSettingsSection({
    onNavigateSection,
}: {
    onNavigateSection: (s: string) => void
}) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const store = useSettingsStore()
    const { profile, entitlements, mutateProfile } = useUser()

    const [loadingAvatar, setLoadingAvatar] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [fullNameInput, setFullNameInput] = useState(profile?.full_name || "")
    const [savingName, setSavingName] = useState(false)

    const [homeModalOpen, setHomeModalOpen] = useState(false)
    const [pinModalOpen, setPinModalOpen] = useState(false)
    const [pinInput, setPinInput] = useState("")
    const [demoLoading, setDemoLoading] = useState(false)

    useEffect(() => {
        if (profile?.full_name) setFullNameInput(profile.full_name)
    }, [profile?.full_name])

    const handleSaveName = async () => {
        if (!fullNameInput.trim()) return
        setSavingName(true)
        try {
            const res = await fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ full_name: fullNameInput.trim() }),
            })
            if (!res.ok) throw new Error("No se pudo actualizar tu nombre")
            await mutateProfile()
            toast.success("Nombre actualizado")
            setEditingName(false)
        } catch (err: any) {
            toast.error(err?.message || "Error al guardar nombre")
        } finally {
            setSavingName(false)
        }
    }

    const handleToggleDemo = async () => {
        if (demoLoading) return
        setDemoLoading(true)
        try {
            const isCurrentlyDemo = Boolean(profile?.demo_mode_active)
            const method = isCurrentlyDemo ? "DELETE" : "POST"
            const res = await fetch("/api/demo", { method })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(payload?.error || "No se pudo actualizar el modo demostración")
            }
            await queryClient.invalidateQueries()
            await mutateProfile()
            showAppToast.success({
                title: isCurrentlyDemo
                    ? "Modo demostración desactivado"
                    : "Modo demostración activado",
                description: isCurrentlyDemo
                    ? "Se limpiaron los datos de ejemplo conservando intactos tus registros reales."
                    : "Se cargaron cuentas, movimientos, presupuestos y metas de ejemplo.",
            })
            router.refresh()
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo actualizar el modo demostración",
                description: err?.message || "Intenta nuevamente en unos segundos.",
            })
        } finally {
            setDemoLoading(false)
        }
    }

    const editTiles = [
        { label: "Cuentas", icon: Wallet, href: "/dashboard/accounts" },
        { label: "Categorías", icon: LayoutGrid, href: "/dashboard/settings/categories" },
        { label: "Etiquetas", icon: Tags, href: "/dashboard/settings/categories" },
        { label: "Presupuestos", icon: PieChart, href: "/dashboard/budgets" },
        { label: "Objetivos", icon: PiggyBank, href: "/dashboard/savings-goals" },
        { label: "Préstamos", icon: HandCoins, href: "/dashboard/loans" },
        { label: "Programados", icon: RefreshCw, href: "/dashboard/subscriptions" },
    ]

    return (
        <div className="space-y-6">
            {/* Perfil */}
            <div className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative group shrink-0">
                        <div className="h-20 w-20 rounded-3xl overflow-hidden border-2 border-border shadow-sm">
                            <Avatar className="h-full w-full rounded-3xl">
                                <img
                                    src={
                                        profile?.avatar_url ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            profile?.full_name || "Usuario"
                                        )}&background=6366F1&color=fff`
                                    }
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                />
                            </Avatar>
                        </div>
                        <label
                            htmlFor="settings-avatar-upload"
                            className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-primary text-primary-foreground rounded-xl shadow-md hover:scale-110 transition-transform cursor-pointer"
                        >
                            {loadingAvatar ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <PenTool className="h-3.5 w-3.5" />
                            )}
                        </label>
                        <input
                            id="settings-avatar-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            disabled={loadingAvatar}
                            onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                    setLoadingAvatar(true)
                                    const fd = new FormData()
                                    fd.append("file", file)
                                    const r = await fetch("/api/user/avatar", { method: "POST", body: fd })
                                    if (!r.ok) throw new Error("No se pudo subir la imagen")
                                    toast.success("Foto actualizada")
                                    await mutateProfile()
                                } catch (err: any) {
                                    toast.error(err?.message || "Error al subir imagen")
                                } finally {
                                    setLoadingAvatar(false)
                                }
                            }}
                        />
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                        {editingName ? (
                            <div className="flex items-center gap-2 justify-center sm:justify-start">
                                <Input
                                    value={fullNameInput}
                                    onChange={(e) => setFullNameInput(e.target.value)}
                                    className="h-9 max-w-[220px] rounded-xl text-sm font-bold"
                                />
                                <Button size="sm" onClick={handleSaveName} disabled={savingName} className="h-9 rounded-xl">
                                    Guardar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingName(false)}
                                    className="h-9 rounded-xl"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <h3 className="text-lg font-black text-foreground truncate">
                                    {profile?.full_name || "Usuario Lumio"}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setEditingName(true)}
                                    className="text-muted-foreground hover:text-primary p-1 rounded-lg"
                                    title="Editar nombre"
                                >
                                    <PenTool className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold">
                                <Crown className="h-3 w-3" />
                                {entitlements?.planName || "Plan Básico"}
                            </span>
                            <Link
                                href="/dashboard/billing"
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Ver suscripción
                            </Link>
                            {profile?.isAdmin && (
                                <Link
                                    href="/dashboard/admin"
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-bold"
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    Panel Admin
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Privacidad y comportamiento */}
            <SettingsSection title="General y Privacidad">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={Vibrate}
                        title="Respuesta háptica"
                        description="Vibración sutil al tocar botones y teclado numérico en móvil"
                        action={
                            <SettingsSwitch
                                checked={store.hapticsEnabled}
                                onCheckedChange={(v) => {
                                    store.setHapticsEnabled(v)
                                    if (v) setTimeout(() => triggerHaptic(18), 30)
                                }}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={store.isBalanceVisible ? Eye : EyeOff}
                        title="Mostrar saldos y montos"
                        description="Alterna visibilidad inmediata en tarjetas, listas y encabezados"
                        action={
                            <SettingsSwitch
                                checked={store.isBalanceVisible}
                                onCheckedChange={store.setIsBalanceVisible}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={EyeOff}
                        title="Iniciar con saldos ocultos"
                        description="Modo discreto automático cada vez que abres la aplicación"
                        action={
                            <SettingsSwitch
                                checked={store.startHiddenBalances}
                                onCheckedChange={store.setStartHiddenBalances}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={KeyRound}
                        title="Bloqueo con PIN (4 dígitos)"
                        description={
                            store.pinLockEnabled
                                ? "Activo en este dispositivo para proteger tu pantalla"
                                : "Pide un PIN rápido al abrir la aplicación"
                        }
                        onClick={() => {
                            setPinInput(store.pinCode || "")
                            setPinModalOpen(true)
                        }}
                        action={
                            <div className="flex items-center gap-2">
                                {store.pinLockEnabled && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.dispatchEvent(new CustomEvent("lumio:lock-pin"))
                                        }}
                                        className="h-7 rounded-lg text-[11px] font-bold"
                                    >
                                        Bloquear
                                    </Button>
                                )}
                                <SettingsSwitch
                                    checked={store.pinLockEnabled}
                                    onCheckedChange={(v) => {
                                        if (v) {
                                            setPinInput(store.pinCode || "")
                                            setPinModalOpen(true)
                                        } else {
                                            store.setPinLockEnabled(false)
                                            toast.info("Bloqueo por PIN desactivado")
                                        }
                                    }}
                                />
                            </div>
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Home}
                        title="Editar página de inicio"
                        description="Elige qué bloques se muestran en tu Dashboard"
                        onClick={() => setHomeModalOpen(true)}
                    />
                    <SettingsRow
                        grouped
                        icon={Sparkles}
                        title={
                            profile?.demo_mode_active
                                ? "Desactivar modo demostración"
                                : "Cargar datos de demostración"
                        }
                        description={
                            profile?.demo_mode_active
                                ? "Limpia solo los ejemplos y conserva intactos tus registros reales"
                                : "Explora toda la app con cuentas y movimientos de ejemplo reversibles"
                        }
                        onClick={handleToggleDemo}
                        action={
                            <Button
                                type="button"
                                size="sm"
                                variant={profile?.demo_mode_active ? "outline" : "secondary"}
                                disabled={demoLoading}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleDemo()
                                }}
                                className="h-8 rounded-xl text-xs font-bold"
                            >
                                {demoLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : profile?.demo_mode_active ? (
                                    "Limpiar demo"
                                ) : (
                                    "Cargar demo"
                                )}
                            </Button>
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            {/* Editar datos (Grid Cashew) */}
            <SettingsSection title="Editar datos">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {editTiles.map((tile) => (
                        <button
                            key={tile.label}
                            type="button"
                            onClick={() => router.push(tile.href)}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-center active:scale-95 shadow-xs"
                        >
                            <div className="h-10 w-10 rounded-[var(--icon-radius,0.85rem)] bg-primary/10 text-primary flex items-center justify-center">
                                <tile.icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-foreground leading-tight">
                                {tile.label}
                            </span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => onNavigateSection("data")}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-center active:scale-95 shadow-xs"
                    >
                        <div className="h-10 w-10 rounded-[var(--icon-radius,0.85rem)] bg-primary/10 text-primary flex items-center justify-center">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-foreground leading-tight">
                            Importar CSV
                        </span>
                    </button>
                </div>
            </SettingsSection>

            {/* Modal PIN */}
            <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
                <DialogContent className="sm:max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Configurar PIN de 4 dígitos</DialogTitle>
                        <DialogDescription className="text-xs">
                            Se solicitará al abrir Lumio en este dispositivo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label className="text-xs font-bold">PIN numérico (4 dígitos)</Label>
                        <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            placeholder="••••"
                            className="h-12 text-center text-2xl tracking-[0.5em] font-black rounded-2xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPinModalOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            disabled={pinInput.length !== 4}
                            onClick={() => {
                                store.setPinCode(pinInput)
                                store.setPinLockEnabled(true)
                                if (typeof window !== "undefined") {
                                    window.sessionStorage.setItem("lumio_pin_unlocked", "true")
                                }
                                setPinModalOpen(false)
                                toast.success("PIN de bloqueo guardado")
                            }}
                            className="rounded-xl font-bold"
                        >
                            Guardar PIN
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Editar Página de Inicio */}
            <Dialog open={homeModalOpen} onOpenChange={setHomeModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Editar página de inicio</DialogTitle>
                        <DialogDescription className="text-xs">
                            Activa u oculta los módulos visibles en tu Dashboard principal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        {[
                            { key: "kpis", title: "Indicadores principales y flujo neto", desc: "Patrimonio, ingresos, gastos y liquidez" },
                            { key: "charts", title: "Gráficos de tendencia y categorías", desc: "Comparativa de 6 meses y dona de gastos" },
                            { key: "budgets", title: "Tarjetas de progreso y resumen diario", desc: "Gasto promedio, ritmo mensual y presupuesto" },
                            { key: "recentTx", title: "Últimos movimientos", desc: "Lista rápida de movimientos recientes" },
                        ].map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between p-3 rounded-2xl border border-border/60 bg-muted/20"
                            >
                                <div className="pr-3">
                                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                                <SettingsSwitch
                                    checked={
                                        store.homeWidgets[item.key as keyof typeof store.homeWidgets]
                                    }
                                    onCheckedChange={(v) =>
                                        store.setHomeWidgets({ [item.key]: v })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setHomeModalOpen(false)} className="rounded-xl font-bold w-full">
                            Listo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ============================================================================
// 2. TEMA Y ESTILO (ESTILO CASHEW)
// ============================================================================
export function AppearanceSettingsSection() {
    const store = useSettingsStore()
    const { theme, setTheme } = useTheme()

    return (
        <div className="space-y-6">
            <SettingsSection title="Tema">
                <SettingsGroupCard>
                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-[var(--icon-radius,0.85rem)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Palette className="h-[18px] w-[18px]" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">Color de énfasis</p>
                                <p className="text-xs text-muted-foreground">
                                    Selecciona el color principal para toda la interfaz
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2.5 pl-12">
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => {
                                        store.setAccentColor(c.value)
                                        toast.success(`Color aplicado: ${c.name}`)
                                    }}
                                    className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                                        store.accentColor === c.value &&
                                            "ring-2 ring-offset-2 ring-foreground ring-offset-background"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                >
                                    {store.accentColor === c.value && (
                                        <Check className="h-4 w-4 text-white" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SettingsRow
                        grouped
                        icon={Sparkles}
                        title="Material You"
                        description="Usa una interfaz colorida tiñendo fondos y superficies con tu color"
                        action={
                            <SettingsSwitch
                                checked={store.materialYou}
                                onCheckedChange={store.setMaterialYou}
                            />
                        }
                    />

                    <SettingsRow
                        grouped
                        icon={theme === "dark" ? Moon : theme === "light" ? Sun : MonitorIcon}
                        title="Tema"
                        description="Apariencia clara, oscura o automática según tu equipo"
                        action={
                            <SettingsSelect
                                value={theme || "system"}
                                onValueChange={(v) => setTheme(v)}
                                options={[
                                    { label: "Sistema", value: "system" },
                                    { label: "Claro", value: "light" },
                                    { label: "Oscuro", value: "dark" },
                                ]}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Estilo">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={LayoutGrid}
                        title="Estilo de ícono"
                        description="Forma de los contenedores de categorías y ajustes"
                        action={
                            <SettingsSelect
                                value={store.iconStyle}
                                onValueChange={(v: any) => store.setIconStyle(v)}
                                options={[
                                    { label: "Redondeado", value: "rounded" },
                                    { label: "Suave", value: "soft" },
                                    { label: "Circular", value: "circle" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={ListFilter}
                        title="Lista de transacciones y diseño"
                        description="Densidad de filas en la lista de movimientos"
                        action={
                            <SettingsSelect
                                value={store.txListDensity}
                                onValueChange={(v: any) => store.setTxListDensity(v)}
                                options={[
                                    { label: "Cómoda", value: "comfortable" },
                                    { label: "Compacta", value: "compact" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={DollarSign}
                        title="Estilo del total del importe"
                        description="Color de los subtotales diarios de ingresos y gastos"
                        action={
                            <SettingsSelect
                                value={store.txAmountTotalStyle}
                                onValueChange={(v: any) => store.setTxAmountTotalStyle(v)}
                                options={[
                                    { label: "Colorido", value: "colorful" },
                                    { label: "Neutro", value: "neutral" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={SlidersHorizontal}
                        title="Estilo de barra de progreso"
                        description="Visualización de avance en presupuestos y metas"
                        action={
                            <SettingsSelect
                                value={store.progressBarStyle}
                                onValueChange={(v: any) => store.setProgressBarStyle(v)}
                                options={[
                                    { label: "Simple", value: "simple" },
                                    { label: "Segmentada", value: "segmented" },
                                    { label: "Degradado", value: "gradient" },
                                ]}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Animaciones y Diseño">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={Zap}
                        title="Animaciones y movimiento"
                        description="Controla la velocidad o desactiva animaciones"
                        action={
                            <SettingsSelect
                                value={store.motionMode}
                                onValueChange={(v: any) => store.setMotionMode(v)}
                                options={[
                                    { label: "Todo", value: "full" },
                                    { label: "Reducido", value: "reduced" },
                                    { label: "Sin movimiento", value: "none" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Smartphone}
                        title="Acceso para zurdos"
                        description="Mejora la ergonomía de acciones rápidas en móvil"
                        action={
                            <SettingsSwitch
                                checked={store.leftHandedMode}
                                onCheckedChange={store.setLeftHandedMode}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Texto">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={Type}
                        title="Fuente"
                        description="Tipografía principal de la interfaz"
                        action={
                            <SettingsSelect
                                value={store.fontFamily}
                                onValueChange={(v) => {
                                    store.setFontFamily(v)
                                    toast.success(`Tipografía cambiada a ${v}`)
                                }}
                                options={FONT_OPTIONS.map((f) => ({ label: f.name, value: f.name }))}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Contrast}
                        title="Texto de alto contraste"
                        description="Aumenta el contraste de etiquetas y bordes"
                        action={
                            <SettingsSwitch
                                checked={store.highContrast}
                                onCheckedChange={store.setHighContrast}
                            />
                        }
                    />
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-[var(--icon-radius,0.85rem)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <Type className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Tamaño de fuente
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Escala global: {store.fontScale}%
                                    </p>
                                </div>
                            </div>
                            {store.fontScale !== 100 && (
                                <button
                                    type="button"
                                    onClick={() => store.setFontScale(100)}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    Restablecer
                                </button>
                            )}
                        </div>
                        <div className="px-2">
                            <Slider
                                min={90}
                                max={115}
                                step={5}
                                value={[store.fontScale]}
                                onValueChange={([val]) => store.setFontScale(val)}
                            />
                        </div>
                    </div>
                </SettingsGroupCard>
            </SettingsSection>
        </div>
    )
}

// ============================================================================
// 3. TRANSACCIONES
// ============================================================================
export function TransactionsSettingsSection() {
    const router = useRouter()
    const store = useSettingsStore()

    return (
        <div className="space-y-6">
            <SettingsSection title="Diseño">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={ListFilter}
                        title="Lista de transacciones y diseño"
                        description="Densidad al listar movimientos diarios"
                        action={
                            <SettingsSelect
                                value={store.txListDensity}
                                onValueChange={(v: any) => store.setTxListDensity(v)}
                                options={[
                                    { label: "Cómoda", value: "comfortable" },
                                    { label: "Compacta", value: "compact" },
                                ]}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Añadir nuevas transacciones">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={Paperclip}
                        title="Botón Agregar archivos adjuntos"
                        description="Mostrar debajo de la sección de notas al registrar"
                        action={
                            <SettingsSwitch
                                checked={store.showAttachmentsButton}
                                onCheckedChange={store.setShowAttachmentsButton}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Sparkles}
                        title="Escáner de comprobantes con IA"
                        description="Extrae datos de boletas y facturas automáticamente"
                        action={
                            <SettingsSwitch
                                checked={store.enableAIReceiptScanning}
                                onCheckedChange={store.setEnableAIReceiptScanning}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Tags}
                        title="Agregar títulos y sugerencias automáticamente"
                        description="Autocompleta descripciones y predice categoría al escribir"
                        action={
                            <SettingsSwitch
                                checked={store.autoSuggestTitles}
                                onCheckedChange={store.setAutoSuggestTitles}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={PenTool}
                        title="Indicaciones iniciales de entrada"
                        description="Qué pantalla se abre primero al registrar una transacción"
                        action={
                            <SettingsSelect
                                value={store.newTxInitialEntry}
                                onValueChange={(v: any) => store.setNewTxInitialEntry(v)}
                                options={[
                                    { label: "Flujo rápido · Título", value: "express_title" },
                                    { label: "Flujo rápido · Monto", value: "express_amount" },
                                    { label: "Flujo rápido · Categoría", value: "express_category" },
                                    { label: "Formulario completo", value: "full_form" },
                                ]}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Transacciones programadas y suscripciones">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={RefreshCw}
                        title="Auto-registrar suscripciones por defecto"
                        description="Las nuevas suscripciones nacen con ejecución automática activada"
                        action={
                            <SettingsSwitch
                                checked={store.defaultAutoPayRecurring}
                                onCheckedChange={store.setDefaultAutoPayRecurring}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Calendar}
                        title="Fecha de pago"
                        description="Cuando una transacción programada se marca manualmente como pagada"
                        action={
                            <SettingsSelect
                                value={store.manualPayDateMode}
                                onValueChange={(v: any) => store.setManualPayDateMode(v)}
                                options={[
                                    { label: "Fecha de Transacción", value: "scheduled" },
                                    { label: "Fecha de Hoy", value: "today" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Calculator}
                        title="Confirmar importe"
                        description="Pedir confirmación de monto al registrar un pago programado"
                        action={
                            <SettingsSelect
                                value={store.confirmAmountMode}
                                onValueChange={(v: any) => store.setConfirmAmountMode(v)}
                                options={[
                                    { label: "Siempre", value: "always" },
                                    { label: "Si el importe es 0", value: "if_zero" },
                                    { label: "Nunca", value: "never" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Bell}
                        title="Gestionar suscripciones y alertas"
                        description="Revisa tus reglas recurrentes y vencimientos activos"
                        onClick={() => router.push("/dashboard/planning")}
                    />
                </SettingsGroupCard>
            </SettingsSection>
        </div>
    )
}

// ============================================================================
// 4. LOCALIZACIÓN Y FORMATO (COHERENCIA PAÍS / MONEDA / ZONA HORARIA)
// ============================================================================
export function LocalizationSettingsSection() {
    const router = useRouter()
    const store = useSettingsStore()
    const { formatMoney } = useFormat()
    const { mutateProfile } = useUser()

    const handleCountryChange = async (code: string) => {
        const region = getRegionByCountry(code)
        store.setCountryCode(region.code)
        store.setCurrencyCode(region.currencyCode)
        store.setTimezone(region.timezone)
        store.setNumberFormat(region.numberFormat)

        await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                country_code: region.code,
                base_currency: region.currencyCode,
                timezone: region.timezone,
            }),
        }).catch(() => null)
        await mutateProfile()

        toast.success(`Región actualizada a ${region.name}`, {
            description: `Moneda ${region.currencyCode} y zona horaria ${region.timezone} sincronizadas.`,
        })
    }

    return (
        <div className="space-y-6">
            <SettingsSection title="País, Moneda y Zona Horaria">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={Globe}
                        title="País / Región"
                        description="Sincroniza automáticamente tu moneda y zona horaria local"
                        action={
                            <SettingsSelect
                                value={store.countryCode}
                                onValueChange={handleCountryChange}
                                options={REGIONS.map((r) => ({
                                    label: `${r.name} (${r.currencyCode})`,
                                    value: r.code,
                                }))}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={DollarSign}
                        title="Moneda principal"
                        description={`Vista previa: ${formatMoney(1234.56, store.currencyCode)}`}
                        action={
                            <SettingsSelect
                                value={store.currencyCode}
                                onValueChange={async (v) => {
                                    store.setCurrencyCode(v)
                                    toast.success(`Moneda cambiada a ${getCurrencyName(v)}`)
                                    await fetch("/api/user/preferences", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ base_currency: v }),
                                    }).catch(() => null)
                                    await mutateProfile()
                                }}
                                options={CURRENCIES.map((c) => ({
                                    label: `${c.symbol} ${c.name}`,
                                    value: c.code,
                                }))}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={History}
                        title="Zona horaria"
                        description={`Hora local actual: ${formatTimeNowInTimezone(store.timezone)} · Usada en presupuestos y cortes mensuales`}
                        action={
                            <SettingsSelect
                                value={store.timezone}
                                onValueChange={async (tz) => {
                                    store.setTimezone(tz)
                                    toast.success(`Zona horaria: ${tz}`)
                                    await fetch("/api/user/preferences", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ timezone: tz }),
                                    }).catch(() => null)
                                    await mutateProfile()
                                }}
                                options={COMMON_TIMEZONES}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Coins}
                        title="Tipos de cambio"
                        description="Sincroniza o fija tasas personalizadas para cuentas multimoneda"
                        onClick={() => router.push("/dashboard/settings/exchange-rates")}
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Formato y Visualización">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={PenTool}
                        title="Formato de números"
                        description="Separadores de miles y decimales"
                        action={
                            <SettingsSelect
                                value={
                                    store.numberFormat.includes("1.234,56")
                                        ? "1.234,56"
                                        : "1,234.56"
                                }
                                onValueChange={(v) => {
                                    store.setNumberFormat(v)
                                    toast.success("Formato numérico actualizado")
                                }}
                                options={[
                                    { label: "1,234.56", value: "1,234.56" },
                                    { label: "1.234,56", value: "1.234,56" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={PieChart}
                        title="Cifra principal en Presupuestos"
                        description="Qué dato se resalta en tus tarjetas de presupuesto"
                        action={
                            <SettingsSelect
                                value={store.budgetTotalType}
                                onValueChange={(v: any) => store.setBudgetTotalType(v)}
                                options={[
                                    { label: "Saldo disponible", value: "remaining" },
                                    { label: "Monto gastado", value: "spent" },
                                    { label: "Porcentaje", value: "percentage" },
                                ]}
                            />
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={PiggyBank}
                        title="Cifra principal en Metas"
                        description="Qué cifra destaca en tus objetivos de ahorro"
                        action={
                            <SettingsSelect
                                value={store.goalTotalType}
                                onValueChange={(v: any) => store.setGoalTotalType(v)}
                                options={[
                                    { label: "Por ahorrar", value: "remaining" },
                                    { label: "Total ahorrado", value: "saved" },
                                    { label: "Porcentaje", value: "percentage" },
                                ]}
                            />
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>
        </div>
    )
}

// ============================================================================
// 5. IMPORTAR Y EXPORTAR DATOS (CSV / EXCEL / PDF / JSON / GOOGLE DRIVE)
// ============================================================================
export function DataSettingsSection() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const store = useSettingsStore()

    const csvInputRef = useRef<HTMLInputElement>(null)
    const jsonInputRef = useRef<HTMLInputElement>(null)

    const [driveStatus, setDriveStatus] = useState<{ connected: boolean; oauthConfigured: boolean }>({
        connected: false,
        oauthConfigured: false,
    })
    const [backingUpDrive, setBackingUpDrive] = useState(false)
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
    const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([])
    const [csvModalOpen, setCsvModalOpen] = useState(false)
    const [importingCsv, setImportingCsv] = useState(false)

    useEffect(() => {
        fetch("/api/google-drive/status")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setDriveStatus(d))
            .catch(() => null)
    }, [])

    const downloadFromApi = async (url: string, filename: string) => {
        const toastId = toast.loading("Preparando descarga...")
        try {
            const res = await fetch(url)
            if (res.status === 403) {
                showAppToast.premium({
                    id: toastId,
                    title: "Función disponible en Plan Premium",
                    description: "Actualiza a Premium para descargar reportes en Excel y copias completas de seguridad.",
                    actionLabel: "Ver planes",
                    onAction: () => router.push("/dashboard/billing"),
                })
                return
            }
            if (!res.ok) throw new Error("No se pudo descargar el archivo")
            const blob = await res.blob()
            const href = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = href
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(href)
            toast.success("Archivo descargado", { id: toastId })
        } catch (err: any) {
            toast.error(err?.message || "Error en descarga", { id: toastId })
        }
    }

    const handleDownloadCsvTemplate = () => {
        const sample = [
            "Fecha,Tipo,Descripcion,Monto,Moneda,Categoria,Cuenta,Etiquetas,Notas",
            `${new Date().toISOString().slice(0, 10)},EXPENSE,Almuerzo de trabajo,28.50,${store.currencyCode},Comida y bebidas,,Trabajo,"Ejemplo"`,
            `${new Date().toISOString().slice(0, 10)},INCOME,Ingreso freelance,450.00,${store.currencyCode},Salario,,,`,
        ].join("\r\n")
        const blob = new Blob(["\uFEFF" + sample], { type: "text/csv;charset=utf-8;" })
        const href = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = href
        a.download = "Lumio-Plantilla-Importacion.csv"
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(href)
        toast.success("Plantilla CSV descargada (compatible con Google Sheets)")
    }

    const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        const text = await file.text()
        const lines = text
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)

        if (lines.length < 2) {
            toast.error("El CSV debe incluir cabecera y al menos una fila de datos")
            return
        }

        const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ","
        const splitLine = (line: string) =>
            line.split(sep).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"))

        const headers = splitLine(lines[0]).map((h) => h.toLowerCase())
        const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)))

        const dateIdx = idx(["fecha", "date"])
        const typeIdx = idx(["tipo", "type"])
        const descIdx = idx(["descrip", "title", "concepto", "titulo"])
        const amtIdx = idx(["monto", "amount", "importe"])
        const curIdx = idx(["moneda", "currency"])
        const catIdx = idx(["categ", "category"])
        const accIdx = idx(["cuenta", "account"])
        const tagIdx = idx(["etiqueta", "tag"])

        const parsedRows = lines.slice(1).map((line) => {
            const cols = splitLine(line)
            const rawType = (cols[typeIdx] || "EXPENSE").toUpperCase()
            const mappedType =
                rawType.includes("INGR") || rawType === "INCOME"
                    ? "INCOME"
                    : rawType.includes("TRAN")
                      ? "TRANSFER"
                      : "EXPENSE"
            const rawAmt = Math.abs(parseFloat((cols[amtIdx] || "0").replace(",", "."))) || 0
            return {
                date: cols[dateIdx] || new Date().toISOString().slice(0, 10),
                type: mappedType,
                description: cols[descIdx] || "Importado CSV",
                amount: rawAmt,
                currency: (cols[curIdx] || store.currencyCode).toUpperCase().slice(0, 3),
                categoryName: cols[catIdx] || undefined,
                accountName: cols[accIdx] || undefined,
                tags: cols[tagIdx] ? cols[tagIdx].split("|").map((t) => t.trim()).filter(Boolean) : [],
            }
        }).filter((r) => r.amount > 0)

        if (parsedRows.length === 0) {
            toast.error("No se encontraron filas con monto válido")
            return
        }

        setCsvPreviewRows(parsedRows)
        setCsvModalOpen(true)
    }

    const handleConfirmCsvImport = async () => {
        setImportingCsv(true)
        try {
            const res = await fetch("/api/transactions/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows: csvPreviewRows }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "No se pudo importar")
            await queryClient.invalidateQueries()
            toast.success(`Se importaron ${data.imported} movimiento(s)`)
            setCsvModalOpen(false)
            setCsvPreviewRows([])
        } catch (err: any) {
            toast.error(err?.message || "Error al importar")
        } finally {
            setImportingCsv(false)
        }
    }

    const handleJsonRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        const toastId = toast.loading("Restaurando copia de seguridad...")
        try {
            const text = await file.text()
            const parsed = JSON.parse(text)
            const res = await fetch("/api/settings/backup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Archivo inválido")
            await queryClient.invalidateQueries()
            toast.success(`Respaldo restaurado (${data.restoredCount} registros)`, { id: toastId })
        } catch (err: any) {
            toast.error(err?.message || "No se pudo restaurar el respaldo", { id: toastId })
        }
    }

    return (
        <div className="space-y-6">
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileSelected} />
            <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonRestore} />

            <SettingsSection title="Hojas de cálculo y reportes">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={FileSpreadsheet}
                        title="Exportar a archivo CSV"
                        description="Compatible con Excel y Google Sheets (UTF-8)"
                        onClick={() =>
                            downloadFromApi(
                                `/api/reports/export?format=csv&period=all&currency=${store.currencyCode}`,
                                `Lumio-Movimientos-${new Date().toISOString().slice(0, 10)}.csv`
                            )
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Download}
                        title="Exportar Excel completo (.xlsx)"
                        description="Libro multi-hoja con resumen, movimientos, cuentas y presupuestos"
                        onClick={() =>
                            downloadFromApi(
                                `/api/reports/export?format=excel&period=all&currency=${store.currencyCode}`,
                                `Lumio-Reporte-${new Date().toISOString().slice(0, 10)}.xlsx`
                            )
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Upload}
                        title="Importar archivo CSV / Google Sheets"
                        description="Carga movimientos desde una hoja de cálculo"
                        onClick={() => csvInputRef.current?.click()}
                        action={
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDownloadCsvTemplate()
                                    }}
                                    className="h-8 rounded-xl text-xs font-bold gap-1"
                                >
                                    Plantilla <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        csvInputRef.current?.click()
                                    }}
                                    className="h-8 rounded-xl text-xs font-bold"
                                >
                                    Subir
                                </Button>
                            </div>
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Copias de seguridad">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        icon={FileJson}
                        title="Exportar archivo de datos (.json)"
                        description="Respaldo íntegro de cuentas, movimientos, presupuestos y metas"
                        onClick={() =>
                            downloadFromApi(
                                "/api/settings/backup",
                                `Lumio-Backup-${new Date().toISOString().slice(0, 10)}.json`
                            )
                        }
                    />
                    <SettingsRow
                        grouped
                        icon={Upload}
                        title="Importar archivo de datos (.json)"
                        description="Restaura tu información desde un respaldo previo"
                        onClick={() => jsonInputRef.current?.click()}
                    />
                    <SettingsRow
                        grouped
                        icon={Cloud}
                        title="Google Drive"
                        description={
                            driveStatus.connected
                                ? "Cuenta conectada para guardar respaldos en tu nube"
                                : driveStatus.oauthConfigured
                                  ? "Conecta tu cuenta para guardar respaldos en Lumio/Backups"
                                  : "Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET para sincronizar"
                        }
                        action={
                            driveStatus.connected ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={backingUpDrive}
                                    onClick={async () => {
                                        setBackingUpDrive(true)
                                        try {
                                            const r = await fetch("/api/google-drive/status", { method: "POST" })
                                            if (!r.ok) throw new Error("No se pudo subir el respaldo")
                                            toast.success("Copia guardada en Google Drive")
                                        } catch (err: any) {
                                            toast.error(err?.message || "Error con Drive")
                                        } finally {
                                            setBackingUpDrive(false)
                                        }
                                    }}
                                    className="h-8 rounded-xl text-xs font-bold"
                                >
                                    {backingUpDrive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Respaldar ahora"}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        window.location.href = "/api/auth/google/connect"
                                    }}
                                    className="h-8 rounded-xl text-xs font-bold"
                                >
                                    Conectar
                                </Button>
                            )
                        }
                    />
                </SettingsGroupCard>
            </SettingsSection>

            <SettingsSection title="Zona de cuidado">
                <SettingsGroupCard>
                    <SettingsRow
                        grouped
                        variant="danger"
                        icon={Trash2}
                        title="Reiniciar todos mis datos"
                        description="Elimina cuentas, movimientos, presupuestos y metas registrados"
                        onClick={() => setResetConfirmOpen(true)}
                    />
                </SettingsGroupCard>
            </SettingsSection>

            {/* Preview CSV Dialog */}
            <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
                <DialogContent className="sm:max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Confirmar importación CSV</DialogTitle>
                        <DialogDescription className="text-xs">
                            Se detectaron {csvPreviewRows.length} movimiento(s) listos para importar en tu cuenta por defecto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/50 rounded-2xl border border-border/60">
                        {csvPreviewRows.slice(0, 15).map((r, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="min-w-0 pr-2">
                                    <p className="font-bold truncate">{r.description}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {r.date} · {r.categoryName || "Sin categoría"}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "font-black tabular-nums shrink-0",
                                        r.type === "INCOME" ? "text-emerald-600" : "text-rose-500"
                                    )}
                                >
                                    {r.type === "INCOME" ? "+" : "-"}
                                    {r.currency} {r.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCsvModalOpen(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button onClick={handleConfirmCsvImport} disabled={importingCsv} className="rounded-xl font-bold">
                            {importingCsv ? "Importando..." : `Importar ${csvPreviewRows.length} registros`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmAlertModal
                open={resetConfirmOpen}
                onOpenChange={setResetConfirmOpen}
                variant="danger"
                title="¿Reiniciar todos tus datos?"
                description="Esta acción eliminará tus cuentas, transacciones, presupuestos y metas registradas para dejar tu espacio en blanco. Tu acceso y categorías base se mantienen."
                confirmLabel="Sí, reiniciar todo"
                onConfirm={async () => {
                    const res = await resetUserData()
                    if (res.success) {
                        toast.success("Datos reiniciados con éxito")
                        window.location.href = "/dashboard"
                    } else {
                        toast.error("No se pudieron reiniciar los datos")
                    }
                }}
            />
        </div>
    )
}

// ============================================================================
// 6. ACERCA DE (ESTILO CASHEW · WILBER SAICO / ESAICO.COM)
// ============================================================================
export function AboutSettingsSection() {
    const branding = useSystemBranding()
    const { canInstall, promptInstall } = usePWA()
    const [resetOpen, setResetOpen] = useState(false)
    const [shortcutsOpen, setShortcutsOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Columna izquierda: App & Links */}
                <div className="lg:col-span-7 space-y-5">
                    <div className="flex items-center gap-4 px-1">
                        <img
                            src={branding.logoLightUrl || "/icons/icon-light.png"}
                            alt={branding.appName}
                            className="h-14 w-14 rounded-2xl object-cover shadow-md ring-1 ring-border/60 dark:hidden"
                        />
                        <img
                            src={branding.logoDarkUrl || "/icons/icon-dark.png"}
                            alt={branding.appName}
                            className="h-14 w-14 rounded-2xl object-cover shadow-md ring-1 ring-white/15 hidden dark:block"
                        />
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-foreground">
                                {branding.appName}
                            </h3>
                            <p className="text-xs font-medium text-muted-foreground">
                                v2.4.0 · Edición Web &amp; PWA
                            </p>
                        </div>
                    </div>

                    <SettingsGroupCard>
                        <SettingsRow
                            grouped
                            icon={Keyboard}
                            title="Atajos de teclado y comandos"
                            description="Usa ⌘K / Ctrl+K para buscar o registrar escribiendo"
                            onClick={() => setShortcutsOpen(true)}
                        />
                        <SettingsRow
                            grouped
                            icon={RotateCcw}
                            title="Bienvenida y asistente inicial"
                            description="Vuelve a abrir la configuración de inicio rápido"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent("lumio:open-welcome-wizard"))
                            }}
                        />
                        <SettingsRow
                            grouped
                            icon={Sparkles}
                            title="Recorrido guiado por la aplicación"
                            description="Repasa los 5 puntos clave para aprovechar el sistema"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent("lumio:start-tour"))
                            }}
                        />
                        <SettingsRow
                            grouped
                            icon={ShieldCheck}
                            title="Política de privacidad"
                            onClick={() => window.open("/privacidad", "_blank")}
                        />
                        <SettingsRow
                            grouped
                            icon={FileText}
                            title="Términos de uso"
                            onClick={() => window.open("/terminos", "_blank")}
                        />
                        {canInstall && (
                            <SettingsRow
                                grouped
                                icon={Smartphone}
                                title="Instalar aplicación en este equipo"
                                description="Acceso directo sin barra del navegador"
                                onClick={promptInstall}
                            />
                        )}
                        <SettingsRow
                            grouped
                            variant="danger"
                            icon={Trash2}
                            title="Eliminar todos los datos"
                            onClick={() => setResetOpen(true)}
                        />
                    </SettingsGroupCard>
                </div>

                {/* Columna derecha: Equipo de desarrollo */}
                <div className="lg:col-span-5 space-y-4">
                    <h4 className="text-sm font-black text-center text-foreground">
                        Equipo de desarrollo
                    </h4>

                    <div className="rounded-3xl bg-card border border-border/60 p-6 text-center space-y-2 shadow-xs">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Desarrollador principal
                        </p>
                        <p className="text-2xl font-black text-primary tracking-tight">
                            Wilber Saico
                        </p>
                        <a
                            href="https://esaico.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors pt-1"
                        >
                            <span>esaico.com</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>

                    <div className="rounded-2xl bg-card border border-border/60 p-4 text-center space-y-1">
                        <p className="text-xs font-bold text-foreground">
                            Sitio web oficial
                        </p>
                        <a
                            href="https://esaico.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline font-semibold"
                        >
                            https://esaico.com
                        </a>
                    </div>

                    <div className="rounded-2xl bg-card border border-border/60 p-4 text-center space-y-1">
                        <p className="text-xs font-bold text-foreground">
                            Aislamiento y seguridad
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Cuentas independientes protegidas por usuario, autenticación cifrada y políticas de acceso por fila.
                        </p>
                    </div>
                </div>
            </div>

            <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Atajos rápidos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-xs">
                        {[
                            { keys: "Ctrl + K / ⌘K", desc: "Buscador inteligente y entrada rápida por texto" },
                            { keys: "N", desc: "Abrir Nuevo Registro desde el panel" },
                            { keys: "Esc", desc: "Cerrar modal o cuadro activo" },
                        ].map((s) => (
                            <div key={s.keys} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                                <span className="text-foreground font-medium">{s.desc}</span>
                                <kbd className="px-2 py-1 rounded-lg bg-card border border-border font-mono font-bold text-[11px]">
                                    {s.keys}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmAlertModal
                open={resetOpen}
                onOpenChange={setResetOpen}
                variant="danger"
                title="¿Eliminar todos tus datos financieros?"
                description="Se borrarán todas tus cuentas, transacciones, presupuestos, metas y préstamos registrados. Tu usuario y categorías base se mantienen."
                confirmLabel="Sí, eliminar datos"
                onConfirm={async () => {
                    const res = await resetUserData()
                    if (res.success) {
                        toast.success("Datos eliminados")
                        window.location.href = "/dashboard"
                    } else {
                        toast.error("No se pudieron eliminar los datos")
                    }
                }}
            />
        </div>
    )
}
