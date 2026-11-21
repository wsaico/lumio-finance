"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
    CalendarClock,
    Clock,
    Repeat,
    Search,
    Plus,
    Check,
    SkipForward,
    Trash2,
    Loader2,
    Bell,
    Sparkles,
    AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CategoryIcon } from "@/components/icons/category-icon"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"
import { showAppToast } from "@/components/ui/app-alert-toast"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { cn } from "@/lib/utils"

type SummaryCycle = "MONTHLY" | "ANNUAL" | "TOTAL"
type FilterTab = "ALL" | "SUBSCRIPTION" | "UPCOMING" | "RECURRING" | "OVERDUE"

function diffDaysFromToday(dateStr: string): number {
    const clean = String(dateStr || "").split("T")[0]
    const [y, m, d] = clean.split("-").map(Number)
    if (!y || !m || !d) return 0
    const target = new Date(y, m - 1, d)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDueGroupHeader(dateStr: string, days: number): {
    primary: string
    secondary: string
    isOverdue: boolean
} {
    const clean = String(dateStr || "").split("T")[0]
    const [y, m, d] = clean.split("-").map(Number)
    const dateLabel =
        y && m && d
            ? new Date(y, m - 1, d).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "short",
              })
            : clean

    if (days < 0) {
        const abs = Math.abs(days)
        return {
            primary: "Vencido",
            secondary: `hace ${abs} ${abs === 1 ? "día" : "días"} (${dateLabel})`,
            isOverdue: true,
        }
    }
    if (days === 0) {
        return { primary: "Hoy", secondary: "0 días", isOverdue: false }
    }
    if (days === 1) {
        return { primary: "Mañana", secondary: `1 día (${dateLabel})`, isOverdue: false }
    }
    return {
        primary: dateLabel,
        secondary: `en ${days} días`,
        isOverdue: false,
    }
}

function formatRecurrenceBadge(frequency: string, interval = 1): string {
    const step = Math.max(1, Number(interval || 1))
    const f = (frequency || "MONTHLY").toUpperCase()
    if (f === "ONCE") return "1 vez"
    if (f === "DAILY") return step === 1 ? "1 día" : `${step} días`
    if (f === "WEEKLY") return step === 1 ? "1 semana" : `${step} semanas`
    if (f === "BIWEEKLY") return "15 días"
    if (f === "YEARLY") return step === 1 ? "1 año" : `${step} años`
    return step === 1 ? "1 mes" : `${step} meses`
}

export default function SubscriptionsAndScheduledPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { formatMoney } = useFormat()
    const { currencyCode, isBalanceVisible } = useSettingsStore()
    const { convert } = useExchangeRates()
    const baseCurrency = currencyCode || "PEN"

    const [summaryCycle, setSummaryCycle] = useState<SummaryCycle>("MONTHLY")
    const [filterTab, setFilterTab] = useState<FilterTab>("ALL")
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ["subscriptions-and-scheduled"],
        queryFn: async () => {
            const res = await fetch("/api/subscriptions")
            if (!res.ok) throw new Error("No se pudieron cargar los programados")
            return res.json()
        },
    })

    const rawItems: any[] = data?.items || []

    const enrichedItems = useMemo(() => {
        return rawItems.map((item) => {
            const days = diffDaysFromToday(item.dueDate)
            const convertedAmount = convert(
                Number(item.amount || 0),
                item.currencyCode || baseCurrency,
                baseCurrency
            )
            const convertedMonthly = convert(
                Number(item.monthlyEquivalent || item.amount || 0),
                item.currencyCode || baseCurrency,
                baseCurrency
            )
            return {
                ...item,
                days,
                isOverdue: days < 0,
                convertedAmount,
                convertedMonthly,
            }
        })
    }, [rawItems, convert, baseCurrency])

    const filteredItems = useMemo(() => {
        return enrichedItems.filter((item) => {
            if (filterTab === "SUBSCRIPTION" && item.mode !== "SUBSCRIPTION") return false
            if (filterTab === "UPCOMING" && item.mode !== "UPCOMING") return false
            if (filterTab === "RECURRING" && item.mode !== "RECURRING") return false
            if (filterTab === "OVERDUE" && !item.isOverdue) return false

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchTitle = String(item.title || "")
                    .toLowerCase()
                    .includes(q)
                const matchCat = String(item.categoryName || "")
                    .toLowerCase()
                    .includes(q)
                const matchAcc = String(item.accountName || "")
                    .toLowerCase()
                    .includes(q)
                if (!matchTitle && !matchCat && !matchAcc) return false
            }
            return true
        })
    }, [enrichedItems, filterTab, searchQuery])

    // Group filtered items by dueDate (Cashew style: "Hoy • 0 días")
    const groupedByDate = useMemo(() => {
        const map = new Map<string, { dateStr: string; days: number; items: any[] }>()
        for (const item of filteredItems) {
            const key = String(item.dueDate || "").split("T")[0]
            if (!map.has(key)) {
                map.set(key, { dateStr: key, days: item.days, items: [] })
            }
            map.get(key)!.items.push(item)
        }
        return Array.from(map.values())
    }, [filteredItems])

    // Hero Summary Value (Mensual / Anual / Total)
    const heroStats = useMemo(() => {
        let netMonthly = 0
        let netTotal = 0
        for (const item of filteredItems) {
            const sign = item.transactionType === "INCOME" ? 1 : -1
            netMonthly += sign * item.convertedMonthly
            netTotal += sign * item.convertedAmount
        }
        if (summaryCycle === "MONTHLY") {
            return {
                value: netMonthly,
                subtitle: "Promedio mensual estimado",
            }
        }
        if (summaryCycle === "ANNUAL") {
            return {
                value: netMonthly * 12,
                subtitle: "Proyección anual estimada (×12)",
            }
        }
        return {
            value: netTotal,
            subtitle: "Total de cobros en la vista actual",
        }
    }, [filteredItems, summaryCycle])

    const handlePayNow = async (item: any) => {
        if (processingId) return
        setProcessingId(item.id)
        try {
            const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "pay",
                    id: item.id,
                    source: item.source,
                }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(json?.error || "No se pudo confirmar el pago")
            }

            await queryClient.invalidateQueries({ queryKey: ["subscriptions-and-scheduled"] })
            await queryClient.invalidateQueries({ queryKey: ["transactions"] })
            await queryClient.invalidateQueries({ queryKey: ["accounts"] })

            showAppToast.success({
                title:
                    item.transactionType === "INCOME"
                        ? `Depósito registrado: ${item.title}`
                        : `Pago confirmado: ${item.title}`,
                description: json?.nextDueDate
                    ? `Saldo actualizado. Próximo vencimiento programado para el ${json.nextDueDate}.`
                    : "Se aplicó el movimiento en tu cuenta correctamente.",
            })
        } catch (err: any) {
            showAppToast.error({
                title: "No se pudo procesar el pago",
                description: err?.message || "Verifica el saldo de tu cuenta.",
            })
        } finally {
            setProcessingId(null)
        }
    }

    const handleSkipCycle = async (item: any) => {
        if (processingId || item.source !== "RULE") return
        setProcessingId(item.id)
        try {
            const res = await fetch("/api/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "skip", id: item.id }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error || "No se pudo saltar el ciclo")

            await queryClient.invalidateQueries({ queryKey: ["subscriptions-and-scheduled"] })
            showAppToast.info({
                title: `Ciclo saltado: ${item.title}`,
                description: `El próximo cobro pasó al ${json.nextDueDate}.`,
            })
        } catch (err: any) {
            showAppToast.error({
                title: "Error al saltar ciclo",
                description: err?.message,
            })
        } finally {
            setProcessingId(null)
        }
    }

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return
        const res = await fetch("/api/subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "delete",
                id: deleteTarget.id,
                source: deleteTarget.source,
            }),
        })
        if (!res.ok) throw new Error("No se pudo eliminar")
        await queryClient.invalidateQueries({ queryKey: ["subscriptions-and-scheduled"] })
        showAppToast.success({
            title: "Programación eliminada",
            description: `Se eliminó "${deleteTarget.title}" de tus programados.`,
        })
        setDeleteTarget(null)
    }

    return (
        <PremiumPreviewGate moduleName="Suscripciones y Programados">
            <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
                {/* 1. CASHEW-STYLE CENTERED HERO SUMMARY (Screenshot 4) */}
                <div className="card-modern p-6 sm:p-8 text-center space-y-4 border border-border/60 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Control de Vencimientos
                        </span>
                        <Link href="/dashboard/transactions/new">
                            <Button
                                size="sm"
                                className="rounded-full h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                Nuevo Programado
                            </Button>
                        </Link>
                    </div>

                    <div className="space-y-1 pt-1">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            Programado y Suscripciones
                        </h1>
                        <div className="pt-2">
                            <p
                                className={cn(
                                    "text-3xl sm:text-4xl font-black tracking-tight tabular-nums",
                                    heroStats.value > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-foreground"
                                )}
                            >
                                {isBalanceVisible
                                    ? `${heroStats.value < 0 ? "-" : heroStats.value > 0 ? "+" : ""}${formatMoney(Math.abs(heroStats.value), baseCurrency)}`
                                    : "••••••"}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                                {heroStats.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Mensual / Anual / Total Pills (Cashew Screenshot 4) */}
                    <div className="inline-flex items-center gap-1.5 pt-1">
                        {(
                            [
                                { id: "MONTHLY", label: "Mensual" },
                                { id: "ANNUAL", label: "Anual" },
                                { id: "TOTAL", label: "Total" },
                            ] as const
                        ).map((pill) => (
                            <button
                                key={pill.id}
                                type="button"
                                onClick={() => setSummaryCycle(pill.id)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer",
                                    summaryCycle === pill.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter Tabs + Search Button (Cashew Screenshot 4) */}
                    <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-2xl mx-auto">
                        <div className="flex-1 grid grid-cols-5 bg-muted/60 p-1 rounded-2xl border border-border/50 gap-1">
                            {(
                                [
                                    { id: "ALL", label: "Todo" },
                                    { id: "SUBSCRIPTION", label: "Suscripciones" },
                                    { id: "UPCOMING", label: "Próximamente" },
                                    { id: "RECURRING", label: "Repetitivo" },
                                    { id: "OVERDUE", label: "Vencido" },
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterTab(tab.id)}
                                    className={cn(
                                        "py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all truncate cursor-pointer",
                                        filterTab === tab.id
                                            ? "bg-card text-foreground shadow-xs border border-border/60"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setSearchOpen(!searchOpen)}
                            title="Buscar suscripción o programado"
                            className={cn(
                                "h-10 w-10 rounded-2xl flex items-center justify-center border transition-colors shrink-0 self-end sm:self-auto cursor-pointer",
                                searchOpen
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-primary/12 text-primary border-primary/20 hover:bg-primary/20"
                            )}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                    </div>

                    {searchOpen && (
                        <div className="max-w-md mx-auto pt-1 animate-in fade-in duration-150">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre, categoría o cuenta..."
                                className="h-10 rounded-2xl bg-muted/40 text-xs"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* 2. GROUPED DUE-DATE TIMELINE LIST (Cashew Screenshot 4) */}
                {isLoading ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-3xl bg-muted/40" />
                        ))}
                    </div>
                ) : groupedByDate.length === 0 ? (
                    <div className="card-modern p-10 text-center space-y-3 border border-border/60">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-base font-extrabold text-foreground">
                            No hay cobros programados en esta vista
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            Registra tus suscripciones (Netflix, Spotify, Internet, Gimnasio) o pagos próximos para recibir avisos antes de su vencimiento y confirmarlos con 1 toque.
                        </p>
                        <Button
                            onClick={() => router.push("/dashboard/transactions/new")}
                            className="rounded-full font-bold text-xs h-10 px-5 gap-1.5 cursor-pointer"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar suscripción o programado
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groupedByDate.map((group) => {
                            const hdr = formatDueGroupHeader(group.dateStr, group.days)
                            return (
                                <div
                                    key={group.dateStr}
                                    className="card-modern overflow-hidden border border-border/60 divide-y divide-border/50"
                                >
                                    {/* Date Group Header ("Hoy • 0 días") */}
                                    <div className="px-5 py-3 bg-muted/25 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <span
                                                className={cn(
                                                    "font-black",
                                                    hdr.isOverdue
                                                        ? "text-rose-500"
                                                        : "text-foreground"
                                                )}
                                            >
                                                {hdr.primary}
                                            </span>
                                            <span className="text-muted-foreground font-bold">•</span>
                                            <span
                                                className={cn(
                                                    "text-xs font-bold",
                                                    hdr.isOverdue
                                                        ? "text-rose-500"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {hdr.secondary}
                                            </span>
                                        </div>
                                        {hdr.isOverdue && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/12 text-rose-500">
                                                <AlertTriangle className="h-3 w-3" />
                                                Pendiente de confirmación
                                            </span>
                                        )}
                                    </div>

                                    {/* Items in this Due Date */}
                                    {group.items.map((item) => {
                                        const isIncome = item.transactionType === "INCOME"
                                        const isBusy = processingId === item.id
                                        const ModeIcon =
                                            item.mode === "UPCOMING"
                                                ? Clock
                                                : item.mode === "RECURRING"
                                                  ? Repeat
                                                  : CalendarClock

                                        return (
                                            <div
                                                key={`${item.source}-${item.id}`}
                                                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-muted/20 transition-colors"
                                            >
                                                {/* Left: Category Medallion + Mode Badge + Title + Account Pill */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="relative flex items-center gap-1.5 shrink-0">
                                                        <div
                                                            className="h-11 w-11 rounded-full flex items-center justify-center text-white shadow-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    item.categoryColor || "#7C3AED",
                                                            }}
                                                        >
                                                            <CategoryIcon
                                                                name={item.categoryIcon || "sparkles"}
                                                                className="h-5 w-5"
                                                            />
                                                        </div>
                                                        <div
                                                            className="h-8 w-8 rounded-full bg-primary/12 text-primary flex items-center justify-center border border-primary/20"
                                                            title={
                                                                item.mode === "SUBSCRIPTION"
                                                                    ? "Suscripción"
                                                                    : item.mode === "UPCOMING"
                                                                      ? "Próximamente"
                                                                      : "Repetitivo"
                                                            }
                                                        >
                                                            <ModeIcon className="h-4 w-4" />
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-black text-foreground truncate">
                                                                {item.title}
                                                            </p>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                                                                {item.mode === "SUBSCRIPTION"
                                                                    ? "Suscripción"
                                                                    : item.mode === "UPCOMING"
                                                                      ? "Próximamente"
                                                                      : "Repetitivo"}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span
                                                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white"
                                                                style={{
                                                                    backgroundColor:
                                                                        item.accountColor || "#6366F1",
                                                                }}
                                                            >
                                                                {item.accountName}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                                                <Bell className="h-2.5 w-2.5 text-primary" />
                                                                {item.reminderDays === 0
                                                                    ? "Aviso el mismo día"
                                                                    : `Aviso ${item.reminderDays}d antes`}
                                                            </span>
                                                            {item.executionMethod === "AUTO" && (
                                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                                    Auto-pago
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Recurrence Info + "¿Pagar?" Button + Amount + Actions */}
                                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                    {item.mode !== "UPCOMING" && (
                                                        <div className="text-right hidden md:block">
                                                            <p className="text-[11px] font-bold text-primary flex items-center justify-end gap-1">
                                                                <Repeat className="h-3 w-3" />
                                                                {formatRecurrenceBadge(
                                                                    item.frequency,
                                                                    item.interval
                                                                )}
                                                            </p>
                                                            <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                                                                {isIncome ? "+" : "-"}
                                                                {formatMoney(
                                                                    item.monthlyEquivalent,
                                                                    item.currencyCode
                                                                )}{" "}
                                                                / mes
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Cashew "¿Pagar?" / "¿Depositar?" Interactive Pill */}
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => handlePayNow(item)}
                                                        className="px-3.5 py-1.5 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-extrabold text-foreground border border-border/70 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        {isBusy ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                                        )}
                                                        <span>
                                                            {isIncome ? "¿Depositar?" : "¿Pagar?"}
                                                        </span>
                                                    </button>

                                                    <span
                                                        className={cn(
                                                            "text-base sm:text-lg font-black tabular-nums min-w-[90px] text-right",
                                                            isIncome
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : "text-foreground"
                                                        )}
                                                    >
                                                        {isBalanceVisible
                                                            ? `${isIncome ? "+" : "-"}${formatMoney(item.amount, item.currencyCode)}`
                                                            : "••••"}
                                                    </span>

                                                    <div className="flex items-center gap-1">
                                                        {item.source === "RULE" &&
                                                            item.mode !== "UPCOMING" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => handleSkipCycle(item)}
                                                                    title="Saltar este cobro al siguiente ciclo"
                                                                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
                                                                >
                                                                    <SkipForward className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => setDeleteTarget(item)}
                                                            title="Eliminar programación"
                                                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                )}

                <ConfirmAlertModal
                    open={Boolean(deleteTarget)}
                    onOpenChange={(o) => !o && setDeleteTarget(null)}
                    variant="danger"
                    title="¿Eliminar suscripción o programado?"
                    description={`Se eliminará la programación de "${deleteTarget?.title || ""}". Los pagos que ya hayas confirmado anteriormente se conservarán en tus movimientos.`}
                    confirmLabel="Eliminar"
                    onConfirm={handleDeleteConfirmed}
                />
            </div>
        </PremiumPreviewGate>
    )
}
