"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
    Trash2,
    Calendar,
    ChevronDown,
    Target,
    MoreHorizontal,
    AlertCircle,
    PlayCircle,
    CheckCircle2,
    Plus,
    RefreshCw,
    Sparkles,
    ArrowUpRight,
    Wallet,
    Edit,
    PieChart,
    ShieldCheck,
    Flame,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IncomeWizard } from "@/components/zbb/income-wizard"
import { MoneyPoolDisplay } from "@/components/zbb/money-pool-display"
import { ZBBCoach } from "@/components/planning/zbb-coach"
import { AllocationWizard } from "@/components/zbb/allocation-wizard"
import { ReallocationModal } from "@/components/zbb/reallocation-modal"
import { EditableMoneyCell } from "@/components/zbb/editable-money-cell"
import { CategoryIcon } from "@/components/icons/category-icon"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const fetcher = async (url: string) => {
    const res = await fetch(url)
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Error al cargar la planificación")
    }
    return res.json()
}

const PRIORITY_META: Record<
    number,
    { label: string; dot: string; badge: string }
> = {
    1: {
        label: "Esencial",
        dot: "bg-rose-500",
        badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    2: {
        label: "Importante",
        dot: "bg-amber-500",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    3: {
        label: "Deseable",
        dot: "bg-primary",
        badge: "bg-primary/10 text-primary border-primary/20",
    },
    4: {
        label: "Opcional",
        dot: "bg-slate-400",
        badge: "bg-muted text-muted-foreground border-border/60",
    },
}

type AllocationFilter = "ALL" | "EXPENSE" | "SAVINGS" | "EXCEEDED"

function RuleHealthCard({
    ruleBreakdown,
}: {
    ruleBreakdown?: {
        pen: {
            totalIncome: number
            essentials: number
            lifestyle: number
            savings: number
            essentialsPct: number
            lifestylePct: number
            savingsPct: number
        }
        usd: {
            totalIncome: number
            essentials: number
            lifestyle: number
            savings: number
            essentialsPct: number
            lifestylePct: number
            savingsPct: number
        }
    }
}) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    if (!ruleBreakdown) return null
    const currency: "PEN" | "USD" = ruleBreakdown.pen.totalIncome > 0 ? "PEN" : "USD"
    const b = currency === "PEN" ? ruleBreakdown.pen : ruleBreakdown.usd
    if (b.totalIncome <= 0) return null

    const money = (v: number) => (isBalanceVisible ? formatMoney(v, currency) : "••••")

    const pillars = [
        {
            label: "Esenciales (P1)",
            target: "Meta ≤ 50%",
            pct: b.essentialsPct,
            amount: b.essentials,
            barColor: b.essentialsPct > 55 ? "bg-rose-500" : "bg-indigo-500",
            status: b.essentialsPct <= 55 ? "En rango" : "Alto",
            good: b.essentialsPct <= 55,
        },
        {
            label: "Estilo de Vida (P2–P4)",
            target: "Meta ≤ 30%",
            pct: b.lifestylePct,
            amount: b.lifestyle,
            barColor: b.lifestylePct > 35 ? "bg-amber-500" : "bg-violet-500",
            status: b.lifestylePct <= 35 ? "En rango" : "Alto",
            good: b.lifestylePct <= 35,
        },
        {
            label: "Ahorro y Metas",
            target: "Meta ≥ 20%",
            pct: b.savingsPct,
            amount: b.savings,
            barColor: b.savingsPct >= 20 ? "bg-emerald-500" : "bg-amber-400",
            status: b.savingsPct >= 20 ? "Saludable" : "Mejorable",
            good: b.savingsPct >= 20,
        },
    ]

    return (
        <div className="card-modern p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <PieChart className="h-4 w-4" />
                    </span>
                    <div>
                        <h3 className="text-sm font-extrabold text-foreground">
                            Equilibrio del Plan (Regla 50 / 30 / 20)
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                            Distribución saludable de tus ingresos en {currency}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {pillars.map((p) => (
                    <div
                        key={p.label}
                        className="rounded-2xl bg-muted/40 border border-border/60 p-3.5 space-y-2"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-foreground truncate">
                                {p.label}
                            </span>
                            <span
                                className={cn(
                                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0",
                                    p.good
                                        ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                                        : "bg-amber-500/12 text-amber-600 dark:text-amber-400"
                                )}
                            >
                                {p.status}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xl font-black tabular-nums text-foreground">
                                {Math.round(p.pct)}%
                            </span>
                            <span className="text-xs font-bold text-muted-foreground tabular-nums">
                                {money(p.amount)}
                            </span>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", p.barColor)}
                                style={{ width: `${Math.min(100, Math.max(0, p.pct))}%` }}
                            />
                        </div>

                        <p className="text-[10px] font-semibold text-muted-foreground">{p.target}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function PlanningStepper({
    hasIncome,
    isBalanced,
    isActive,
}: {
    hasIncome: boolean
    isBalanced: boolean
    isActive: boolean
}) {
    const steps = [
        { num: 1, label: "Ingresos del mes", done: hasIncome },
        { num: 2, label: "Asignar hasta Base Cero", done: isBalanced },
        { num: 3, label: "Sincronizar Presupuestos", done: isActive },
    ]

    return (
        <div className="card-modern px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            {steps.map((s, idx) => (
                <div key={s.num} className="flex items-center gap-2.5 flex-1 min-w-[160px]">
                    <div
                        className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                            s.done
                                ? "bg-emerald-500 text-white"
                                : "bg-primary/12 text-primary border border-primary/25"
                        )}
                    >
                        {s.done ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.num}
                    </div>
                    <div className="min-w-0">
                        <p
                            className={cn(
                                "text-xs font-extrabold truncate",
                                s.done ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            {s.label}
                        </p>
                    </div>
                    {idx < steps.length - 1 && (
                        <div className="hidden md:block flex-1 h-px bg-border/70 ml-2" />
                    )}
                </div>
            ))}
        </div>
    )
}

function AllocationsSection({
    allocations,
    cycleId,
    totalIncomePen,
    totalIncomeUsd,
    unassignedPool,
    onRefresh,
}: {
    allocations: any[]
    cycleId: string
    totalIncomePen: number
    totalIncomeUsd: number
    unassignedPool: { pen: number; usd: number }
    onRefresh: () => void
}) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()
    const [filter, setFilter] = useState<AllocationFilter>("ALL")

    const isSavingsItem = (a: any) =>
        Boolean(a.goal_id) ||
        a.category?.budget_rule === "SAVINGS" ||
        /ahorr|inversi|fondo/i.test(a.category?.name || "")

    const isExceededItem = (a: any) => {
        const planned = Math.max(Number(a.allocated_amount_pen || 0), Number(a.allocated_amount_usd || 0))
        const spent = Number(a.actual_spent || 0)
        return !isSavingsItem(a) && planned > 0 && spent > planned
    }

    const counts = useMemo(() => {
        const list = allocations || []
        return {
            all: list.length,
            expense: list.filter((a) => !isSavingsItem(a)).length,
            savings: list.filter((a) => isSavingsItem(a)).length,
            exceeded: list.filter((a) => isExceededItem(a)).length,
        }
    }, [allocations])

    const filteredList = useMemo(() => {
        const list = allocations || []
        if (filter === "EXPENSE") return list.filter((a) => !isSavingsItem(a))
        if (filter === "SAVINGS") return list.filter((a) => isSavingsItem(a))
        if (filter === "EXCEEDED") return list.filter((a) => isExceededItem(a))
        return list
    }, [allocations, filter])

    const grouped = useMemo(() => {
        return [1, 2, 3, 4].map((prio) => {
            const items = filteredList.filter((a: any) => (a.priority || 4) === prio)
            const totalPEN = items.reduce(
                (s: number, i: any) => s + Number(i.allocated_amount_pen || 0),
                0
            )
            const totalUSD = items.reduce(
                (s: number, i: any) => s + Number(i.allocated_amount_usd || 0),
                0
            )
            return { prio, items, totalPEN, totalUSD }
        })
    }, [filteredList])

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/zbb/allocations?id=${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Asignación eliminada")
            onRefresh()
        } catch {
            toast.error("No se pudo eliminar la asignación")
        }
    }

    const handleQuickUpdate = async (
        id: string,
        amount: number,
        currency: "PEN" | "USD"
    ) => {
        try {
            const res = await fetch("/api/zbb/allocations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, amount, currency }),
            })
            if (!res.ok) throw new Error()
            toast.success("Monto actualizado")
            onRefresh()
        } catch (err) {
            toast.error("No se pudo actualizar el monto")
            throw err
        }
    }

    const filterTabs: { id: AllocationFilter; label: string; count: number }[] = [
        { id: "ALL", label: "Todas", count: counts.all },
        { id: "EXPENSE", label: "Gastos", count: counts.expense },
        { id: "SAVINGS", label: "Ahorro y Metas", count: counts.savings },
        ...(counts.exceeded > 0
            ? [{ id: "EXCEEDED" as AllocationFilter, label: "Excedidas", count: counts.exceeded }]
            : []),
    ]

    return (
        <div className="card-modern overflow-hidden">
            {/* Section Header */}
            <div className="px-5 py-4 border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-extrabold text-foreground">
                        Planificado vs. Ejecutado Real
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Toca cualquier monto para ajustarlo en vivo · seguimiento automático contra tus transacciones
                    </p>
                </div>
                <AllocationWizard
                    cycleId={cycleId}
                    unassignedPool={unassignedPool}
                    onSuccess={onRefresh}
                    trigger={
                        <Button
                            size="sm"
                            className="rounded-full h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
                        >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            Agregar partida
                        </Button>
                    }
                />
            </div>

            {/* Filter Pills */}
            {counts.all > 0 && (
                <div className="px-5 py-2.5 border-b border-border/40 bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {filterTabs.map((t) => {
                        const active = filter === t.id
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setFilter(t.id)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all shrink-0",
                                    active
                                        ? t.id === "EXCEEDED"
                                            ? "bg-rose-500 text-white border-rose-500"
                                            : "bg-primary text-primary-foreground border-primary"
                                        : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
                                )}
                            >
                                <span>{t.label}</span>
                                <span
                                    className={cn(
                                        "text-[10px] font-black px-1.5 rounded-full",
                                        active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {t.count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Empty State */}
            {!allocations || allocations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-5 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Target className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-extrabold text-foreground">Tu plan está vacío</h4>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-5">
                        Asigna tus gastos esenciales, variables y metas de ahorro para dar destino al 100% de tu dinero.
                    </p>
                    <AllocationWizard
                        cycleId={cycleId}
                        unassignedPool={unassignedPool}
                        onSuccess={onRefresh}
                        trigger={
                            <Button className="rounded-full px-5 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-1.5">
                                <Plus className="w-4 h-4" />
                                Agregar primera partida
                            </Button>
                        }
                    />
                </div>
            ) : filteredList.length === 0 ? (
                <div className="py-10 px-5 text-center text-sm text-muted-foreground">
                    No hay partidas en este filtro.
                </div>
            ) : (
                <div className="divide-y divide-border/60">
                    {grouped.map(({ prio, items, totalPEN, totalUSD }) => {
                        if (items.length === 0) return null
                        const meta = PRIORITY_META[prio]

                        return (
                            <div key={prio}>
                                {/* Priority Group Header */}
                                <div className="px-5 py-2.5 bg-muted/40 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                                        <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                            Prioridad {prio} · {meta.label}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 rounded-full bg-card text-muted-foreground border border-border/60">
                                            {items.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-extrabold tabular-nums text-foreground">
                                        {totalPEN > 0 && (
                                            <span>
                                                {isBalanceVisible ? formatMoney(totalPEN, "PEN") : "••••"}
                                            </span>
                                        )}
                                        {totalUSD > 0 && (
                                            <span className="text-muted-foreground">
                                                {isBalanceVisible ? formatMoney(totalUSD, "USD") : "••••"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-border/40">
                                    {items.map((item: any) => {
                                        const isUSD = Number(item.allocated_amount_usd || 0) > 0
                                        const currency: "PEN" | "USD" = isUSD ? "USD" : "PEN"
                                        const amount = isUSD
                                            ? Number(item.allocated_amount_usd || 0)
                                            : Number(item.allocated_amount_pen || 0)
                                        const actualSpent = Number(item.actual_spent || 0)
                                        const execPct = amount > 0 ? (actualSpent / amount) * 100 : 0
                                        const totalIncForCur = isUSD ? totalIncomeUsd : totalIncomePen
                                        const shareOfIncome =
                                            totalIncForCur > 0 ? (amount / totalIncForCur) * 100 : 0
                                        const isSav = isSavingsItem(item)
                                        const isOver = !isSav && execPct > 100

                                        const title = item.goal
                                            ? item.goal.name
                                            : item.subcategory?.name ||
                                              item.category?.name ||
                                              "Partida"
                                        const subtitle = item.goal
                                            ? "Meta de ahorro"
                                            : item.subcategory
                                              ? item.category?.name
                                              : item.justification || null

                                        return (
                                            <div
                                                key={item.id}
                                                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/25 transition-colors"
                                            >
                                                {/* Left: Icon + Title + Execution Bar */}
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div
                                                        className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border border-border/60 bg-muted/60 text-foreground mt-0.5"
                                                        style={
                                                            item.category?.color
                                                                ? {
                                                                      backgroundColor: `${item.category.color}18`,
                                                                      color: item.category.color,
                                                                      borderColor: `${item.category.color}30`,
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {item.goal ? (
                                                            <Target className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <CategoryIcon
                                                                name={item.category?.icon || "tag"}
                                                                className="w-4 h-4"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-foreground truncate">
                                                                {title}
                                                            </p>
                                                            {shareOfIncome >= 1 && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
                                                                    {Math.round(shareOfIncome)}% ingreso
                                                                </span>
                                                            )}
                                                            {isOver && (
                                                                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-500/12 text-rose-600 dark:text-rose-400">
                                                                    <Flame className="h-2.5 w-2.5" />
                                                                    Excedido
                                                                </span>
                                                            )}
                                                        </div>
                                                        {subtitle && (
                                                            <p className="text-[11px] text-muted-foreground truncate">
                                                                {subtitle}
                                                            </p>
                                                        )}

                                                        {/* Live Execution Mini-Bar */}
                                                        <div className="max-w-xs space-y-1 pt-0.5">
                                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full transition-all duration-500",
                                                                        isOver
                                                                            ? "bg-rose-500"
                                                                            : isSav
                                                                              ? "bg-emerald-500"
                                                                              : execPct >= 80
                                                                                ? "bg-amber-500"
                                                                                : "bg-primary"
                                                                    )}
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, execPct))}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground tabular-nums">
                                                                <span>
                                                                    {isSav ? "Aportado: " : "Real: "}
                                                                    <strong
                                                                        className={cn(
                                                                            isOver
                                                                                ? "text-rose-600 dark:text-rose-400"
                                                                                : "text-foreground"
                                                                        )}
                                                                    >
                                                                        {isBalanceVisible
                                                                            ? formatMoney(actualSpent, currency)
                                                                            : "••••"}
                                                                    </strong>
                                                                </span>
                                                                <span>{Math.round(execPct)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Inline Editable Amount + Actions */}
                                                <div className="flex items-center justify-end gap-2 shrink-0">
                                                    <div className="text-right">
                                                        {isBalanceVisible ? (
                                                            <EditableMoneyCell
                                                                amount={amount}
                                                                currency={currency}
                                                                onSave={(val: number) =>
                                                                    handleQuickUpdate(item.id, val, currency)
                                                                }
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-black tabular-nums text-muted-foreground px-2">
                                                                ••••••
                                                            </span>
                                                        )}
                                                    </div>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label="Opciones de partida"
                                                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="rounded-2xl p-1.5 w-44"
                                                        >
                                                            <AllocationWizard
                                                                cycleId={cycleId}
                                                                initialData={item}
                                                                unassignedPool={unassignedPool}
                                                                onSuccess={onRefresh}
                                                                trigger={
                                                                    <DropdownMenuItem
                                                                        onSelect={(e) => e.preventDefault()}
                                                                        className="rounded-xl text-xs font-semibold cursor-pointer"
                                                                    >
                                                                        <Edit className="h-3.5 w-3.5 mr-2" />
                                                                        Editar partida
                                                                    </DropdownMenuItem>
                                                                }
                                                            />
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(item.id)}
                                                                className="rounded-xl text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export function MonthlyPlanner() {
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [showResetDialog, setShowResetDialog] = useState(false)
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const queryUrl = selectedMonth
        ? `/api/zbb/planning-cycle?month=${selectedMonth}`
        : "/api/zbb/planning-cycle"

    const { data, error, isLoading, mutate } = useSWR(queryUrl, fetcher)
    const { data: historyData } = useSWR("/api/zbb/planning-cycle?history=true", fetcher)
    const history = historyData?.history || []

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-56 rounded-2xl" />
                    <Skeleton className="h-10 w-44 rounded-full" />
                </div>
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-48 rounded-[1.75rem]" />
                <Skeleton className="h-64 rounded-3xl" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="card-modern p-10 text-center space-y-3 max-w-md mx-auto">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base text-foreground">Error al cargar el plan</h3>
                <p className="text-xs text-muted-foreground">{error.message}</p>
                <Button variant="outline" className="rounded-full" onClick={() => mutate()}>
                    Reintentar
                </Button>
            </div>
        )
    }

    const cycle = data?.cycle
    const moneyPool = data?.moneyPool
    const suggestions = data?.suggestions

    // Rich Onboarding CTA when no cycle exists yet
    if (!cycle) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
                <div className="card-modern p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-5">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                        <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="space-y-2 max-w-lg">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                            Planificación Mensual Base Cero
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Asigna el 100% de tus ingresos esperados a gastos esenciales, estilo de vida y ahorro antes de empezar a gastar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-2 text-left">
                        <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-1">
                            <span className="text-[11px] font-black text-primary uppercase">Paso 1</span>
                            <p className="text-xs font-extrabold text-foreground">Define tus ingresos</p>
                            <p className="text-[11px] text-muted-foreground">
                                Sueldo, freelance o importa tus ingresos reales del mes pasado.
                            </p>
                        </div>
                        <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-1">
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                                Paso 2
                            </span>
                            <p className="text-xs font-extrabold text-foreground">Llega a Base Cero</p>
                            <p className="text-[11px] text-muted-foreground">
                                Distribuye con guía 50/30/20 o clona tu plan anterior en 1 clic.
                            </p>
                        </div>
                        <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-1">
                            <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                                Paso 3
                            </span>
                            <p className="text-xs font-extrabold text-foreground">Control en vivo</p>
                            <p className="text-[11px] text-muted-foreground">
                                Sincroniza con Presupuestos y mide Planificado vs. Real día a día.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <IncomeWizard suggestions={suggestions} onSuccess={() => mutate()} />
                    </div>
                </div>
            </div>
        )
    }

    const handleReset = async () => {
        try {
            const res = await fetch(`/api/zbb/planning-cycle?id=${cycle.id}`, {
                method: "DELETE",
            })
            if (!res.ok) throw new Error()
            toast.success("Borrador reiniciado")
            setShowResetDialog(false)
            mutate()
        } catch {
            toast.error("No se pudo reiniciar el borrador")
        }
    }

    const handleActivate = async () => {
        const tId = toast.loading("Sincronizando presupuestos...")
        try {
            const res = await fetch("/api/zbb/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cycleId: cycle.id }),
            })
            if (!res.ok) throw new Error("Error de sincronización")
            const result = await res.json()
            toast.success(`¡Plan sincronizado! (${result.synced_count} presupuestos)`, { id: tId })
            mutate()
        } catch (e: any) {
            toast.error(e.message || "Error al activar el plan", { id: tId })
        }
    }

    const unassignedPool = {
        pen: Number(moneyPool?.pen?.unassigned || 0),
        usd: Number(moneyPool?.usd?.unassigned || 0),
    }

    const hasIncome =
        Number(cycle.total_income_pen || 0) > 0 || Number(cycle.total_income_usd || 0) > 0
    const isBalanced =
        hasIncome &&
        Math.abs(unassignedPool.pen) < 0.01 &&
        Math.abs(unassignedPool.usd) < 0.01
    const hasSurplus = unassignedPool.pen > 0.01 || unassignedPool.usd > 0.01

    const activeHistoryLabel = selectedMonth
        ? history.find((h: any) => h.period_start?.slice(0, 7) === selectedMonth)?.cycle_name ||
          selectedMonth
        : "Plan actual"

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                            {cycle.cycle_name}
                        </h2>
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border",
                                cycle.status === "active"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border/60"
                            )}
                        >
                            {cycle.status === "active" && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {cycle.status === "active" ? "Activo" : "Borrador"}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Planificación Base Cero (ZBB)</span>
                        <span>·</span>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground font-bold transition-colors"
                                >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>{activeHistoryLabel}</span>
                                    <ChevronDown className="h-3 w-3 opacity-60" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="rounded-2xl p-1.5 w-52">
                                <DropdownMenuItem
                                    onClick={() => setSelectedMonth(null)}
                                    className={cn(
                                        "rounded-xl text-xs font-semibold cursor-pointer",
                                        !selectedMonth && "bg-primary text-primary-foreground font-bold"
                                    )}
                                >
                                    Plan actual
                                </DropdownMenuItem>
                                {history.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                            Historial de planes
                                        </DropdownMenuLabel>
                                        {history.map((h: any) => {
                                            const ym = h.period_start?.slice(0, 7)
                                            return (
                                                <DropdownMenuItem
                                                    key={h.id}
                                                    onClick={() => setSelectedMonth(ym)}
                                                    className={cn(
                                                        "rounded-xl text-xs font-semibold cursor-pointer",
                                                        selectedMonth === ym &&
                                                            "bg-primary text-primary-foreground font-bold"
                                                    )}
                                                >
                                                    {h.cycle_name}
                                                </DropdownMenuItem>
                                            )
                                        })}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* ACTION TOOLBAR */}
                <div className="flex flex-wrap items-center gap-2">
                    {cycle.status === "active" && (
                        <Link href="/dashboard/budgets">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-full px-4 text-xs font-bold gap-1.5 border-border/70 bg-card"
                            >
                                Ver Presupuestos
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    )}

                    {(cycle.allocations?.length || 0) >= 2 && (
                        <ReallocationModal
                            cycleId={cycle.id}
                            allocations={cycle.allocations}
                            onSuccess={() => mutate()}
                        />
                    )}

                    {cycle.status === "draft" && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowResetDialog(true)}
                            aria-label="Reiniciar borrador"
                            className="h-10 w-10 rounded-full border-border/70 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                size="sm"
                                className={cn(
                                    "h-10 rounded-full px-5 text-xs font-bold gap-1.5 shadow-md transition-all",
                                    cycle.status === "active"
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
                                )}
                            >
                                {cycle.status === "active" ? (
                                    <>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Sincronizar
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="h-4 w-4" />
                                        Activar Plan
                                    </>
                                )}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl bg-card">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {cycle.status === "active"
                                        ? "¿Sincronizar presupuestos?"
                                        : "¿Activar esta planificación?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {cycle.status === "active"
                                        ? "Se actualizarán tus presupuestos activos en /dashboard/budgets con los montos actuales de este plan."
                                        : "Al activar, cada partida se convertirá en un presupuesto activo para monitorear tu gasto real del mes."}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleActivate}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirmar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* 3-STEP GUIDED WORKFLOW STEPPER */}
            <PlanningStepper
                hasIncome={hasIncome}
                isBalanced={isBalanced}
                isActive={cycle.status === "active"}
            />

            {/* ACTIONABLE ZBB COACH */}
            {moneyPool && (
                <ZBBCoach
                    pool={moneyPool}
                    action={
                        hasSurplus ? (
                            <AllocationWizard
                                cycleId={cycle.id}
                                unassignedPool={unassignedPool}
                                defaultTab="savings"
                                onSuccess={() => mutate()}
                                trigger={
                                    <Button
                                        size="sm"
                                        className="rounded-full h-9 px-4 text-xs font-extrabold bg-primary text-primary-foreground shadow-sm gap-1.5"
                                    >
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Asignar excedente
                                    </Button>
                                }
                            />
                        ) : undefined
                    }
                />
            )}

            {/* MONEY POOL DISPLAY */}
            {moneyPool && <MoneyPoolDisplay pool={moneyPool} audit={data.audit} />}

            {/* 50 / 30 / 20 HEALTH DISTRIBUTION */}
            <RuleHealthCard ruleBreakdown={data.ruleBreakdown} />

            {/* INCOME SOURCES STRIP */}
            {cycle.income_breakdown && cycle.income_breakdown.length > 0 && (
                <div className="card-modern p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Wallet className="h-4 w-4" />
                            </span>
                            <div>
                                <h3 className="text-sm font-extrabold text-foreground">
                                    Fuentes de Ingreso del Ciclo
                                </h3>
                                <p className="text-[11px] text-muted-foreground">
                                    Base sobre la cual distribuyes tus partidas
                                </p>
                            </div>
                        </div>
                        <IncomeWizard
                            existingData={{
                                cycleId: cycle.id,
                                sources: cycle.income_breakdown,
                            }}
                            onSuccess={() => mutate()}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                        {(cycle.income_breakdown as any[]).map((src: any, idx: number) => (
                            <div
                                key={idx}
                                className="rounded-2xl bg-muted/50 border border-border/60 px-3.5 py-2 flex items-center gap-3"
                            >
                                <span className="text-xs font-semibold text-muted-foreground">
                                    {src.name}
                                </span>
                                <span className="text-sm font-black tabular-nums text-foreground">
                                    {isBalanceVisible
                                        ? formatMoney(parseFloat(src.amount) || 0, src.currency || "PEN")
                                        : "••••••"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ALLOCATIONS SECTION (Planificado vs Ejecutado) */}
            <AllocationsSection
                allocations={cycle.allocations}
                cycleId={cycle.id}
                totalIncomePen={Number(cycle.total_income_pen || 0)}
                totalIncomeUsd={Number(cycle.total_income_usd || 0)}
                unassignedPool={unassignedPool}
                onRefresh={() => mutate()}
            />

            {/* RESET DRAFT DIALOG */}
            <ConfirmAlertModal
                open={showResetDialog}
                onOpenChange={setShowResetDialog}
                variant="warning"
                title="¿Reiniciar borrador?"
                description={
                    <>
                        Se eliminarán las asignaciones de <strong>{cycle.cycle_name}</strong> para que puedas empezar de nuevo.
                    </>
                }
                confirmLabel="Sí, reiniciar"
                onConfirm={handleReset}
            />
        </div>
    )
}
