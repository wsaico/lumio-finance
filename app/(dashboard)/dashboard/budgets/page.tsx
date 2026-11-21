"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import {
    Plus,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Wallet,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    Sparkles,
    Pause,
    PieChart,
} from "lucide-react"
import { BudgetWizardAdvanced } from "@/components/budgets/budget-wizard-advanced"
import {
    BudgetCardPremium,
    getBudgetStatus,
} from "@/components/budgets/budget-card-premium"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useBudgetRefresh } from "@/hooks/useBudgetRefresh"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { DEFAULT_CURRENCY } from "@/lib/currencies"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"
import { toast } from "sonner"

type BudgetFilter = "ALL" | "EXPENSE" | "SAVINGS" | "AT_RISK" | "PAUSED"

export default function BudgetsPage() {
    const { currencyCode, isBalanceVisible } = useSettingsStore()
    const baseCurrency = currencyCode || DEFAULT_CURRENCY
    const { formatMoney } = useFormat()
    const { convert } = useExchangeRates()

    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [editingBudget, setEditingBudget] = useState<any>(null)
    const [budgets, setBudgets] = useState<any[]>([])
    const [activeFilter, setActiveFilter] = useState<BudgetFilter>("ALL")
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const alertsShownRef = useRef<Set<string>>(new Set())

    const money = useCallback(
        (val: number) => (isBalanceVisible ? formatMoney(val, currencyCode) : "••••••"),
        [isBalanceVisible, formatMoney, currencyCode]
    )

    // Calendar pace metrics for the current month
    const { currentDay, daysInMonth, daysRemainingInMonth, monthProgressPct } = useMemo(() => {
        const now = new Date()
        const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const day = now.getDate()
        return {
            currentDay: day,
            daysInMonth: total,
            daysRemainingInMonth: Math.max(1, total - day + 1),
            monthProgressPct: (day / total) * 100,
        }
    }, [])

    const fetchBudgets = useCallback(async () => {
        try {
            const res = await fetch("/api/budgets")
            if (res.ok) {
                const data = await res.json()
                setBudgets(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Failed to fetch budgets:", error)
        }
    }, [])

    useBudgetRefresh(fetchBudgets, true)

    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await fetchBudgets()
            setIsLoading(false)
        }
        init()
    }, [fetchBudgets])

    // Centralized non-spammy alerts for critical/exceeded budgets
    useEffect(() => {
        if (isLoading || budgets.length === 0) return

        budgets.forEach((budget) => {
            if (!budget.isActive) return
            const percentage = budget.stats?.percentage || 0
            const remaining = budget.stats?.remaining || 0
            const status = getBudgetStatus(percentage, budget.type === "SAVINGS" ? "SAVINGS" : "EXPENSE")
            const alertKey = `${budget.id}-${status}`
            if (alertsShownRef.current.has(alertKey)) return

            if (budget.type !== "SAVINGS" && status === "exceeded") {
                toast.error(`Presupuesto excedido: ${budget.name}`, {
                    id: alertKey,
                    description: `Superaste el límite por ${formatMoney(Math.abs(remaining), budget.currencyCode || currencyCode)}`,
                    duration: 7000,
                })
                alertsShownRef.current.add(alertKey)
            } else if (budget.type === "SAVINGS" && status === "goal-achieved") {
                toast.success(`¡Meta alcanzada: ${budget.name}!`, {
                    id: alertKey,
                    duration: 6000,
                })
                alertsShownRef.current.add(alertKey)
            }
        })
    }, [budgets, isLoading, currencyCode, formatMoney])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchBudgets()
        setTimeout(() => setIsRefreshing(false), 400)
    }

    const handleCreate = () => {
        setEditingBudget(null)
        setIsWizardOpen(true)
    }

    const handleEdit = (budget: any) => {
        setEditingBudget(budget)
        setIsWizardOpen(true)
    }

    const handleDuplicate = async (budget: any) => {
        try {
            const duplicateData = {
                name: `${budget.name} (Copia)`,
                amount: Number(budget.amount || 0),
                type: budget.type || "EXPENSE",
                period: "MONTHLY",
                color: budget.color,
                currencyCode: budget.currencyCode || baseCurrency,
                budgetYear: budget.budgetYear,
                budgetMonth: budget.budgetMonth,
                budgetScope: budget.budgetScope || "GLOBAL",
                accountIds: budget.budgetScope === "ACCOUNT" ? budget.accountIds || [] : [],
                includeCategories: budget.includeCategories || [],
                excludeCategories: budget.excludeCategories || [],
                includeTags: budget.includeTags || [],
                transactionFilterMode: budget.transactionFilterMode || "DEFAULT",
                includeLoaned: Boolean(budget.includeLoaned),
                includeGoalTransactions: Boolean(budget.includeGoalTransactions),
                includeBalanceCorrections: Boolean(budget.includeBalanceCorrections),
                includeFromOtherBudgets: Boolean(budget.includeFromOtherBudgets),
                excludedBudgetIds: budget.excludedBudgetIds || [],
                isActive: true,
            }
            const res = await fetch("/api/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(duplicateData),
            })
            if (!res.ok) throw new Error("Error al duplicar")
            toast.success("Presupuesto duplicado")
            await fetchBudgets()
        } catch {
            toast.error("No se pudo duplicar el presupuesto")
        }
    }

    // SINGLE API CALL — optimistic update with clean rollback
    const handleDelete = async (id: string) => {
        const previous = [...budgets]
        setBudgets((prev) => prev.filter((b) => b.id !== id))
        try {
            const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error()
            toast.success("Presupuesto eliminado")
        } catch {
            setBudgets(previous)
            toast.error("No se pudo eliminar el presupuesto")
        }
    }

    // SINGLE API CALL — sends camelCase `isActive` matching PATCH /api/budgets/[id]
    const handleToggleActive = async (id: string, nextActive: boolean) => {
        const previous = [...budgets]
        setBudgets((prev) =>
            prev.map((b) => (b.id === id ? { ...b, isActive: nextActive } : b))
        )
        try {
            const res = await fetch(`/api/budgets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextActive }),
            })
            if (!res.ok) throw new Error()
            toast.success(nextActive ? "Presupuesto reanudado" : "Presupuesto pausado")
        } catch {
            setBudgets(previous)
            toast.error("No se pudo cambiar el estado")
        }
    }

    const handleWizardClose = (open: boolean) => {
        setIsWizardOpen(open)
        if (!open) setEditingBudget(null)
    }

    // Real financial aggregates across active expense budgets (currency-normalized)
    const summary = useMemo(() => {
        const activeExpenses = budgets.filter((b) => b.isActive && b.type !== "SAVINGS")
        const activeSavings = budgets.filter((b) => b.isActive && b.type === "SAVINGS")

        const totalLimit = activeExpenses.reduce((sum, b) => {
            const raw = Number(b.amount || 0)
            const cur = b.currencyCode || baseCurrency
            return sum + convert(raw, cur, baseCurrency)
        }, 0)

        const totalSpent = activeExpenses.reduce((sum, b) => {
            const raw = Number(b.stats?.spent ?? b.spent ?? 0)
            const cur = b.currencyCode || baseCurrency
            return sum + convert(raw, cur, baseCurrency)
        }, 0)

        const totalRemaining = totalLimit - totalSpent
        const globalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
        const safeDailyGlobal =
            totalRemaining > 0 ? totalRemaining / daysRemainingInMonth : 0

        const exceededCount = activeExpenses.filter(
            (b) => (b.stats?.percentage || 0) > 100
        ).length
        const warningOnlyCount = activeExpenses.filter((b) => {
            const pct = b.stats?.percentage || 0
            return pct >= 80 && pct <= 100
        }).length
        const atRiskCount = exceededCount + warningOnlyCount
        const healthyCount = Math.max(0, activeExpenses.length - atRiskCount)

        return {
            totalLimit,
            totalSpent,
            totalRemaining,
            globalPct,
            safeDailyGlobal,
            atRiskCount,
            warningOnlyCount,
            exceededCount,
            healthyCount,
            activeCount: budgets.filter((b) => b.isActive).length,
            pausedCount: budgets.filter((b) => !b.isActive).length,
            expenseCount: activeExpenses.length,
            savingsCount: activeSavings.length,
        }
    }, [budgets, daysRemainingInMonth, baseCurrency, convert])

    const filteredBudgets = useMemo(() => {
        return budgets.filter((b) => {
            if (activeFilter === "EXPENSE") return b.type !== "SAVINGS" && b.isActive
            if (activeFilter === "SAVINGS") return b.type === "SAVINGS" && b.isActive
            if (activeFilter === "AT_RISK")
                return b.isActive && b.type !== "SAVINGS" && (b.stats?.percentage || 0) >= 80
            if (activeFilter === "PAUSED") return !b.isActive
            return true
        })
    }, [budgets, activeFilter])

    const filterTabs: { id: BudgetFilter; label: string; count: number; icon: any }[] = [
        { id: "ALL", label: "Todos", count: budgets.length, icon: Wallet },
        { id: "EXPENSE", label: "Gastos", count: summary.expenseCount, icon: TrendingDown },
        { id: "SAVINGS", label: "Ahorros", count: summary.savingsCount, icon: TrendingUp },
        { id: "AT_RISK", label: "En riesgo", count: summary.atRiskCount, icon: AlertTriangle },
        { id: "PAUSED", label: "Pausados", count: summary.pausedCount, icon: Pause },
    ]

    return (
        <PremiumPreviewGate moduleName="Presupuestos">
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                        Presupuestos
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Día {currentDay} de {daysInMonth} ({Math.round(monthProgressPct)}% del mes) ·{" "}
                        {daysRemainingInMonth} {daysRemainingInMonth === 1 ? "día restante" : "días restantes"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        aria-label="Actualizar presupuestos"
                        className="h-10 w-10 rounded-full border-border/70 bg-card"
                    >
                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    </Button>
                    <Link href="/dashboard/planning">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 rounded-full px-4 text-xs font-bold gap-1.5 border-border/70 bg-card"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Planificar Mes
                        </Button>
                    </Link>
                    <Button
                        size="sm"
                        onClick={handleCreate}
                        className="h-10 rounded-full px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                        Nuevo
                    </Button>
                </div>
            </div>

            {/* EXECUTIVE BUDGET SUMMARY (4 KPI CARDS) */}
            {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-3xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    {/* 1. Presupuestado Total (Violet Hero) */}
                    <div className="col-span-2 lg:col-span-1 rounded-[1.75rem] bg-gradient-to-br from-[#7C5CFC] via-[#6D4DF6] to-[#5B3CE6] text-white p-5 shadow-xl shadow-primary/25 flex flex-col justify-between min-h-[124px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                                Presupuestado
                            </span>
                            <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full tabular-nums">
                                {Math.round(summary.globalPct)}%
                            </span>
                        </div>
                        <div className="mt-2 space-y-2">
                            <p className="text-2xl font-black tracking-tight tabular-nums leading-none">
                                {money(summary.totalLimit)}
                            </p>
                            <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-white transition-all duration-700"
                                    style={{ width: `${Math.min(100, summary.globalPct)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Total Gastado */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[124px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Gastado del Mes
                        </span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums leading-none">
                                {money(summary.totalSpent)}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1.5">
                                Avance calendario: {Math.round(monthProgressPct)}%
                            </p>
                        </div>
                    </div>

                    {/* 3. Disponible & Ritmo Diario Seguro */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[124px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {summary.totalRemaining >= 0 ? "Disponible" : "Excedido"}
                        </span>
                        <div className="mt-2">
                            <p
                                className={cn(
                                    "text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none",
                                    summary.totalRemaining >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                )}
                            >
                                {money(Math.abs(summary.totalRemaining))}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1.5 tabular-nums">
                                {summary.totalRemaining > 0
                                    ? `Seguro: ${money(summary.safeDailyGlobal)}/día`
                                    : "Ajusta tus límites o gastos"}
                            </p>
                        </div>
                    </div>

                    {/* 4. Salud de Presupuestos */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[124px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Estado
                            </span>
                            {summary.exceededCount > 0 ? (
                                <ShieldAlert className="h-4 w-4 text-rose-500" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                        </div>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums leading-none">
                                {summary.healthyCount}
                                <span className="text-xs font-semibold text-muted-foreground ml-1.5">
                                    en control
                                </span>
                            </p>
                            <p className="text-[11px] font-semibold mt-1.5">
                                {summary.exceededCount > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400">
                                        {summary.exceededCount}{" "}
                                        {summary.exceededCount === 1 ? "excedido" : "excedidos"}
                                        {summary.warningOnlyCount > 0
                                            ? ` · ${summary.warningOnlyCount} en alerta`
                                            : ""}
                                    </span>
                                ) : summary.warningOnlyCount > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        {summary.warningOnlyCount}{" "}
                                        {summary.warningOnlyCount === 1
                                            ? "próximo al límite"
                                            : "próximos al límite"}
                                    </span>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        Todos bajo control
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTER PILLS */}
            {budgets.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {filterTabs.map((tab) => {
                        const Icon = tab.icon
                        const active = activeFilter === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveFilter(tab.id)}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all shrink-0 active:scale-95",
                                    active
                                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                        : "bg-card text-muted-foreground border-border/70 hover:text-foreground hover:border-primary/40"
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{tab.label}</span>
                                <span
                                    className={cn(
                                        "px-1.5 rounded-full text-[10px] font-black",
                                        active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* BUDGETS GRID */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-52 rounded-3xl" />
                    ))}
                </div>
            ) : budgets.length === 0 ? (
                <div className="card-modern p-12 flex flex-col items-center justify-center text-center border-dashed">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <PieChart className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-extrabold text-foreground">
                        Aún no tienes presupuestos
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                        Define límites mensuales por categoría y controla tu ritmo de gasto día a día.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <Button
                            onClick={handleCreate}
                            className="rounded-full px-5 font-bold bg-primary text-primary-foreground shadow-md shadow-primary/25 gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Crear presupuesto
                        </Button>
                        <Link href="/dashboard/planning">
                            <Button variant="outline" className="rounded-full px-5 font-bold gap-1.5">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Ir al Planificador
                            </Button>
                        </Link>
                    </div>
                </div>
            ) : filteredBudgets.length === 0 ? (
                <div className="card-modern p-10 text-center text-sm text-muted-foreground">
                    No hay presupuestos que coincidan con este filtro.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBudgets.map((budget) => (
                        <BudgetCardPremium
                            key={budget.id}
                            budget={budget}
                            monthProgressPct={monthProgressPct}
                            daysRemainingInMonth={daysRemainingInMonth}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                            onToggleActive={handleToggleActive}
                        />
                    ))}
                </div>
            )}

            {/* WIZARD (Create & Edit) */}
            <BudgetWizardAdvanced
                open={isWizardOpen}
                onOpenChange={handleWizardClose}
                onComplete={fetchBudgets}
                editingBudget={editingBudget}
            />
        </div>
        </PremiumPreviewGate>
    )
}
