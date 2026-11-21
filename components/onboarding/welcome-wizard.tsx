"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowRight,
    Check,
    Globe,
    Landmark,
    Loader2,
    Moon,
    Palette,
    Sparkles,
    Sun,
    Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { REGIONS, detectBrowserRegion, getRegionByCountry } from "@/lib/regions"
import { CURRENCIES, getCurrencySymbol } from "@/lib/currencies"
import { ACCENT_COLORS } from "@/lib/appearance"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useUser } from "@/hooks/useUser"
import { toast } from "sonner"

type WizardStep = "REGION" | "START_MODE" | "STYLE" | "READY"
type StartChoice = "DEMO" | "CREATE_ACCOUNT" | null

export function WelcomeWizard({ shouldShow = false }: { shouldShow?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { theme, setTheme } = useTheme()
    const store = useSettingsStore()
    const { user, mutateProfile } = useUser()

    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<WizardStep>("REGION")
    const [loading, setLoading] = useState(false)

    // Step 1: Region / Currency / Timezone
    const [countryCode, setCountryCode] = useState(store.countryCode || "PE")
    const [currencyCode, setCurrencyCode] = useState(store.currencyCode || "PEN")
    const [timezone, setTimezone] = useState(store.timezone || "America/Lima")

    // Step 2: Demo or First Real Account
    const [startChoice, setStartChoice] = useState<StartChoice>("DEMO")
    const [accountName, setAccountName] = useState("Cuenta Principal")
    const [accountType, setAccountType] = useState<"BANK" | "CASH" | "DIGITAL">("BANK")
    const [initialBalance, setInitialBalance] = useState("0")

    useEffect(() => {
        if (!user?.id) return
        const localKey = `lumio_onboarding_done_${user.id}`
        const seen = typeof window !== "undefined" ? localStorage.getItem(localKey) : null
        if (shouldShow && !seen) {
            const detected = detectBrowserRegion()
            setCountryCode(store.countryCode || detected.code)
            setCurrencyCode(store.currencyCode || detected.currencyCode)
            setTimezone(store.timezone || detected.timezone)
            setOpen(true)
        }
    }, [shouldShow, user?.id])

    useEffect(() => {
        const reopen = () => {
            setStep("REGION")
            setOpen(true)
        }
        window.addEventListener("lumio:open-welcome-wizard", reopen)
        return () => window.removeEventListener("lumio:open-welcome-wizard", reopen)
    }, [])

    const handleCountryChange = (code: string) => {
        setCountryCode(code)
        const region = getRegionByCountry(code)
        setCurrencyCode(region.currencyCode)
        setTimezone(region.timezone)
        store.setCountryCode(region.code)
        store.setCurrencyCode(region.currencyCode)
        store.setTimezone(region.timezone)
        store.setNumberFormat(region.numberFormat)
    }

    const persistPreferences = async (completed = false) => {
        store.setCountryCode(countryCode)
        store.setCurrencyCode(currencyCode)
        store.setTimezone(timezone)

        await fetch("/api/user/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                country_code: countryCode,
                base_currency: currencyCode,
                timezone,
                budgeting_method: "TRADITIONAL",
                ...(completed ? { onboarding_completed: true } : {}),
            }),
        })
    }

    const handleApplyStartChoice = async () => {
        if (!startChoice) return
        setLoading(true)
        try {
            await persistPreferences(false)

            if (startChoice === "DEMO") {
                const res = await fetch("/api/demo", { method: "POST" })
                if (!res.ok) throw new Error("No se pudo preparar el modo demostración")
                toast.success("Modo demostración cargado", {
                    description: "Puedes desactivarlo en cualquier momento sin perder tus registros reales.",
                })
            } else {
                const balanceNum = Math.max(0, parseFloat(initialBalance) || 0)
                const res = await fetch("/api/accounts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: accountName.trim() || "Cuenta Principal",
                        type: accountType,
                        currency: currencyCode,
                        balance: balanceNum,
                        icon: accountType === "CASH" ? "banknote" : "landmark",
                        color: store.accentColor || "#7C3AED",
                    }),
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    // If user already has an account (e.g. re-opening wizard), proceed gracefully
                    if (err.code !== "ACCOUNT_LIMIT_REACHED") {
                        throw new Error(err.error || "No se pudo crear tu cuenta inicial")
                    }
                } else {
                    toast.success("Primera cuenta creada")
                }
            }

            await queryClient.invalidateQueries()
            setStep("STYLE")
        } catch (err: any) {
            toast.error(err?.message || "Ocurrió un error al configurar")
        } finally {
            setLoading(false)
        }
    }

    const finishOnboarding = async (launchTour: boolean) => {
        setLoading(true)
        try {
            await persistPreferences(true)
            if (user?.id && typeof window !== "undefined") {
                localStorage.setItem(`lumio_onboarding_done_${user.id}`, "true")
            }
            await mutateProfile()
            setOpen(false)
            router.refresh()
            if (launchTour) {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent("lumio:start-tour"))
                }, 250)
            }
        } finally {
            setLoading(false)
        }
    }

    const stepList: WizardStep[] = ["REGION", "START_MODE", "STYLE", "READY"]
    const stepIndex = stepList.indexOf(step)
    const symbol = getCurrencySymbol(currencyCode)

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) finishOnboarding(false)
            }}
        >
            <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden gap-0 rounded-3xl border border-border/70 shadow-2xl">
                <div className="bg-primary px-6 py-5 text-primary-foreground">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/80">
                                Configuración inicial · Paso {stepIndex + 1} de {stepList.length}
                            </span>
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-black text-primary-foreground mt-1">
                            {step === "REGION" && "País, moneda y hora local"}
                            {step === "START_MODE" && "¿Cómo quieres comenzar?"}
                            {step === "STYLE" && "Elige tu apariencia"}
                            {step === "READY" && "Todo listo para empezar"}
                        </DialogTitle>
                        <DialogDescription className="text-primary-foreground/85 text-xs sm:text-sm">
                            {step === "REGION" &&
                                "Sincronizamos tu moneda y zona horaria para que tus cierres diarios y reportes cuadren exactos."}
                            {step === "START_MODE" &&
                                "Puedes explorar todo con el modo demo o empezar directo creando tu primera cuenta real."}
                            {step === "STYLE" &&
                                "Personaliza el ambiente visual; luego encontrarás más opciones en Ajustes."}
                            {step === "READY" &&
                                "Tu cuenta ya incluye 15 días de prueba completa con todos los módulos desbloqueados."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-1.5 mt-4">
                        {stepList.map((s, idx) => (
                            <div
                                key={s}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    idx <= stepIndex ? "flex-1 bg-white" : "w-6 bg-white/30"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-background space-y-5 max-h-[65vh] overflow-y-auto">
                    {step === "REGION" && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5 text-primary" />
                                    País
                                </Label>
                                <Select value={countryCode} onValueChange={handleCountryChange}>
                                    <SelectTrigger className="h-11 rounded-2xl bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl max-h-64">
                                        {REGIONS.map((r) => (
                                            <SelectItem key={r.code} value={r.code}>
                                                {r.name} ({r.currencyCode})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                                        Moneda principal
                                    </Label>
                                    <Select value={currencyCode} onValueChange={setCurrencyCode}>
                                        <SelectTrigger className="h-11 rounded-2xl bg-card">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl max-h-64">
                                            {CURRENCIES.map((c) => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.symbol} {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">
                                        Zona horaria
                                    </Label>
                                    <div className="h-11 rounded-2xl bg-muted/50 border border-border/60 px-3 flex items-center text-xs font-semibold text-foreground truncate">
                                        {timezone}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-muted/40 border border-border/50 p-3.5 text-xs text-muted-foreground">
                                Ejemplo de montos en tu cuenta:{" "}
                                <strong className="text-foreground">
                                    {symbol} 1,250.00
                                </strong>
                            </div>
                        </div>
                    )}

                    {step === "START_MODE" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStartChoice("DEMO")}
                                    className={cn(
                                        "text-left p-4 rounded-2xl border-2 transition-all space-y-2 relative",
                                        startChoice === "DEMO"
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border/70 bg-card hover:border-primary/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="h-9 w-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
                                            <Sparkles className="h-4.5 w-4.5" />
                                        </span>
                                        {startChoice === "DEMO" && (
                                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                <Check className="h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">
                                            Probar con Modo Demo
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                            Carga cuentas, movimientos, presupuestos, metas y préstamos de ejemplo. Lo desactivas con 1 clic sin borrar tus registros reales.
                                        </p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStartChoice("CREATE_ACCOUNT")}
                                    className={cn(
                                        "text-left p-4 rounded-2xl border-2 transition-all space-y-2 relative",
                                        startChoice === "CREATE_ACCOUNT"
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border/70 bg-card hover:border-primary/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="h-9 w-9 rounded-xl bg-emerald-500/12 text-emerald-600 flex items-center justify-center">
                                            <Wallet className="h-4.5 w-4.5" />
                                        </span>
                                        {startChoice === "CREATE_ACCOUNT" && (
                                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                                <Check className="h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">
                                            Empezar desde cero
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                            Crea tu primera cuenta real ahora con tu saldo actual y registra tus movimientos reales.
                                        </p>
                                    </div>
                                </button>
                            </div>

                            {startChoice === "CREATE_ACCOUNT" && (
                                <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Nombre de cuenta</Label>
                                            <Input
                                                value={accountName}
                                                onChange={(e) => setAccountName(e.target.value)}
                                                placeholder="Ej. BCP Soles, Efectivo..."
                                                className="h-10 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Tipo</Label>
                                            <Select
                                                value={accountType}
                                                onValueChange={(v: any) => setAccountType(v)}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="BANK">Cuenta Bancaria</SelectItem>
                                                    <SelectItem value="CASH">Efectivo / Caja</SelectItem>
                                                    <SelectItem value="DIGITAL">Billetera Digital</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">
                                            Saldo actual ({symbol})
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={initialBalance}
                                            onChange={(e) => setInitialBalance(e.target.value)}
                                            className="h-10 rounded-xl font-bold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === "STYLE" && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">
                                    Tema de pantalla
                                </Label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { id: "light", label: "Claro", icon: Sun },
                                        { id: "dark", label: "Oscuro", icon: Moon },
                                        { id: "system", label: "Sistema", icon: Landmark },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setTheme(opt.id)}
                                            className={cn(
                                                "p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all",
                                                theme === opt.id
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <opt.icon className="h-4 w-4" />
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Palette className="h-3.5 w-3.5 text-primary" />
                                    Color principal
                                </Label>
                                <div className="flex flex-wrap gap-3">
                                    {ACCENT_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => store.setAccentColor(color.value)}
                                            className={cn(
                                                "h-9 w-9 rounded-2xl flex items-center justify-center transition-transform hover:scale-105",
                                                store.accentColor === color.value &&
                                                    "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                            )}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {store.accentColor === color.value && (
                                                <Check className="h-4 w-4 text-white" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === "READY" && (
                        <div className="text-center space-y-4 py-2">
                            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/12 text-emerald-600 flex items-center justify-center">
                                <Check className="h-7 w-7 stroke-[2.5]" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-black text-foreground">
                                    Tu espacio financiero quedó listo
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                    ¿Quieres dar un recorrido guiado de 30 segundos por el sistema o ir directo a tus finanzas?
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={loading}
                                    onClick={() => finishOnboarding(false)}
                                    className="h-11 rounded-2xl font-bold text-xs"
                                >
                                    Ir directo al panel
                                </Button>
                                <Button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => finishOnboarding(true)}
                                    className="h-11 rounded-2xl font-bold text-xs gap-1.5"
                                >
                                    Ver recorrido guiado
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {step !== "READY" && (
                    <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
                        {step !== "REGION" ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    if (step === "START_MODE") setStep("REGION")
                                    else if (step === "STYLE") setStep("START_MODE")
                                }}
                                disabled={loading}
                                className="rounded-xl font-semibold text-xs"
                            >
                                Atrás
                            </Button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => finishOnboarding(false)}
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                                Omitir asistente
                            </button>
                        )}

                        <Button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                                if (step === "REGION") setStep("START_MODE")
                                else if (step === "START_MODE") handleApplyStartChoice()
                                else if (step === "STYLE") setStep("READY")
                            }}
                            className="rounded-xl px-5 font-bold text-xs gap-1.5"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Preparando...
                                </>
                            ) : (
                                <>
                                    Continuar
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
