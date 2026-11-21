"use client"

import { useState } from "react"
import {
    MoreHorizontal,
    Edit2,
    Trash2,
    Copy,
    Pause,
    Play,
    AlertTriangle,
    CheckCircle2,
    ShieldAlert,
    TrendingUp,
    Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"

export type BudgetStatus =
    | "healthy"
    | "warning"
    | "danger"
    | "critical"
    | "exceeded"
    | "goal-achieved"

export function getBudgetStatus(percentage: number, type: "EXPENSE" | "SAVINGS"): BudgetStatus {
    if (type === "SAVINGS") {
        if (percentage >= 100) return "goal-achieved"
        if (percentage >= 65) return "warning"
        return "healthy"
    }
    if (percentage > 100) return "exceeded"
    if (percentage >= 90) return "critical"
    if (percentage >= 80) return "danger"
    if (percentage >= 65) return "warning"
    return "healthy"
}

interface BudgetCardPremiumProps {
    budget: any
    monthProgressPct?: number
    daysRemainingInMonth?: number
    onEdit?: (budget: any) => void
    onDelete?: (id: string) => Promise<void> | void
    onDuplicate?: (budget: any) => Promise<void> | void
    onToggleActive?: (id: string, isActive: boolean) => Promise<void> | void
}

export function BudgetCardPremium({
    budget,
    monthProgressPct = 50,
    daysRemainingInMonth = 1,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleActive,
}: BudgetCardPremiumProps) {
    const { formatMoney } = useFormat()
    const { currencyCode, isBalanceVisible, budgetTotalType } = useSettingsStore()
    const showSpentPrimary = budgetTotalType === "spent"
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const budgetCurrency = budget.currencyCode || currencyCode || "PEN"
    const money = (val: number) =>
        isBalanceVisible ? formatMoney(val, budgetCurrency) : "••••••"

    const stats = budget.stats || {}
    const limit = Math.max(0, Number(budget.amount || 0))
    const spent = Math.max(0, Number(stats.spent ?? budget.spent ?? 0))
    const percentage =
        typeof stats.percentage === "number"
            ? stats.percentage
            : limit > 0
              ? (spent / limit) * 100
              : 0
    const remaining =
        typeof stats.remaining === "number" ? stats.remaining : limit - spent

    const isExpense = budget.type !== "SAVINGS"
    const status = getBudgetStatus(percentage, isExpense ? "EXPENSE" : "SAVINGS")

    // Safe daily allowance for active expense budgets
    const safeDaily =
        isExpense && remaining > 0 && daysRemainingInMonth > 0
            ? remaining / daysRemainingInMonth
            : 0

    // Pace check: spending faster than calendar progress?
    const isAheadOfPace =
        isExpense && budget.isActive && percentage > monthProgressPct + 12 && percentage <= 100

    const statusMeta = !budget.isActive
        ? {
              label: "Pausado",
              badge: "bg-muted text-muted-foreground border-border/60",
              barColor: "#94a3b8",
              icon: Pause,
          }
        : status === "exceeded"
          ? {
                label: "Excedido",
                badge: "bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/25",
                barColor: "#f43f5e",
                icon: ShieldAlert,
            }
          : status === "critical"
            ? {
                  label: "Crítico",
                  badge: "bg-orange-500/12 text-orange-600 dark:text-orange-400 border-orange-500/25",
                  barColor: "#f97316",
                  icon: AlertTriangle,
              }
            : status === "danger"
              ? {
                    label: "En riesgo",
                    badge: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
                    barColor: "#f59e0b",
                    icon: AlertTriangle,
                }
              : status === "warning" && isExpense
                ? {
                      label: "Atención",
                      badge: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
                      barColor: "#eab308",
                      icon: AlertTriangle,
                  }
                : status === "goal-achieved"
                ? {
                      label: "Meta lograda",
                      badge: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                      barColor: "#10b981",
                      icon: CheckCircle2,
                  }
                : {
                      label: isExpense ? "En control" : "En progreso",
                      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                      barColor: budget.color || "#7C5CFC",
                      icon: isExpense ? CheckCircle2 : TrendingUp,
                  }

    const StatusIcon = statusMeta.icon

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            await onDelete?.(budget.id)
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    return (
        <>
            <div
                className={cn(
                    "card-modern p-5 flex flex-col justify-between gap-4 relative overflow-hidden transition-all duration-300",
                    !budget.isActive && "opacity-65 saturate-50"
                )}
            >
                {/* Top subtle accent stripe */}
                <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: statusMeta.barColor }}
                />

                {/* HEADER */}
                <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: budget.color || "#7c5cfc" }}
                            />
                            <h3 className="text-base font-extrabold text-foreground tracking-tight truncate">
                                {budget.name}
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <span
                                className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                    statusMeta.badge
                                )}
                            >
                                <StatusIcon className="h-3 w-3" />
                                {statusMeta.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                                {budget.period === "MONTHLY" ? "Mensual" : "Personalizado"}
                            </span>
                            {isAheadOfPace && (
                                <span
                                    title="Tu ritmo de gasto va por encima del avance del mes"
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold"
                                >
                                    <Flame className="h-3 w-3" />
                                    Ritmo alto
                                </span>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Opciones del presupuesto"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl p-1.5 w-44">
                            <DropdownMenuItem
                                className="rounded-xl text-xs font-semibold cursor-pointer"
                                onClick={() => onEdit?.(budget)}
                            >
                                <Edit2 className="h-3.5 w-3.5 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="rounded-xl text-xs font-semibold cursor-pointer"
                                onClick={() => onDuplicate?.(budget)}
                            >
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="rounded-xl text-xs font-semibold cursor-pointer"
                                onClick={() => onToggleActive?.(budget.id, !budget.isActive)}
                            >
                                {budget.isActive ? (
                                    <>
                                        <Pause className="h-3.5 w-3.5 mr-2" />
                                        Pausar
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3.5 w-3.5 mr-2" />
                                        Reanudar
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="rounded-xl text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* MAIN METRIC: REMAINING OR EXCEEDED */}
                <div className="flex items-end justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {isExpense
                                ? showSpentPrimary
                                    ? "Gastado"
                                    : remaining >= 0
                                      ? "Disponible"
                                      : "Excedido por"
                                : "Acumulado"}
                        </p>
                        <p
                            className={cn(
                                "text-2xl font-black tracking-tight tabular-nums leading-tight mt-0.5",
                                isExpense && remaining < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-foreground"
                            )}
                        >
                            {money(
                                isExpense
                                    ? showSpentPrimary
                                        ? spent
                                        : Math.abs(remaining)
                                    : spent
                            )}
                        </p>
                    </div>

                    <div className="text-right">
                        <span
                            className={cn(
                                "text-sm font-black tabular-nums",
                                status === "exceeded"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : status === "critical"
                                      ? "text-orange-600 dark:text-orange-400"
                                      : "text-primary"
                            )}
                        >
                            {Math.round(percentage)}%
                        </span>
                        <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                            de {money(limit)}
                        </p>
                    </div>
                </div>

                {/* PROGRESS BAR WITH "TODAY" PACE MARKER */}
                <div className="space-y-2">
                    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-visible">
                        <div className="h-full w-full rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                                    backgroundColor: statusMeta.barColor,
                                }}
                            />
                        </div>
                        {/* Calendar Pace Tick ("Hoy") for monthly active expense budgets */}
                        {isExpense && budget.isActive && budget.period === "MONTHLY" && (
                            <div
                                title={`Avance del mes: ${Math.round(monthProgressPct)}%`}
                                className="absolute top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-foreground/60 shadow-xs pointer-events-none"
                                style={{ left: `${Math.min(98, Math.max(2, monthProgressPct))}%` }}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground tabular-nums">
                        <span>
                            {isExpense ? (showSpentPrimary ? "Disponible: " : "Gastado: ") : "Meta: "}
                            <strong className="text-foreground">
                                {money(
                                    isExpense
                                        ? showSpentPrimary
                                            ? Math.max(0, remaining)
                                            : spent
                                        : limit
                                )}
                            </strong>
                        </span>
                        {isExpense && budget.isActive && remaining > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {money(safeDaily)}/día
                            </span>
                        )}
                        {isExpense && remaining < 0 && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                                Límite superado
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmAlertModal
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                variant="danger"
                title="¿Eliminar presupuesto?"
                description={
                    <>
                        Esta acción no se puede deshacer. Se eliminará &ldquo;{budget.name}&rdquo;. Tus transacciones no serán afectadas.
                    </>
                }
                confirmLabel="Eliminar"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
            />
        </>
    )
}
