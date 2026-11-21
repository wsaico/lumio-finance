"use client"

import Link from "next/link"
import {
    Target,
    Calendar,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    ChevronRight,
    Plus,
    Plane,
    Car,
    Home,
    GraduationCap,
    Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"

interface GoalCardProps {
    goal: any
    onQuickContribute?: (goal: any) => void
}

const GOAL_ICON_MAP: Record<string, any> = {
    emergency: Target,
    travel: Plane,
    car: Car,
    house: Home,
    education: GraduationCap,
    custom: Heart,
}

export function GoalCard({ goal, onQuickContribute }: GoalCardProps) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible, goalTotalType } = useSettingsStore()

    const currentAmount = Number(goal.current_amount || 0)
    const targetAmount = Number(goal.target_amount || 0)
    const remainingAmount = Math.max(0, targetAmount - currentAmount)
    const progress = Math.min(100, Math.max(0, Number(goal.progress ?? (targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0))))
    const isCompleted = goal.status === "COMPLETED" || progress >= 100
    const isOnTrack = goal.isOnTrack !== false
    const currency = goal.currency || "PEN"
    const accentColor = goal.color || "#7c3aed"
    const IconComp = GOAL_ICON_MAP[goal.icon] || Target

    const hasTargetDate = Boolean(goal.target_date)
    const daysRemaining = typeof goal.daysRemaining === "number" ? goal.daysRemaining : null

    const priorityLabel =
        goal.priority === "HIGH" ? "Alta" : goal.priority === "MEDIUM" ? "Media" : "Baja"

    return (
        <div
            className={cn(
                "card-modern p-4 sm:p-5 relative overflow-hidden group transition-all duration-200 hover:shadow-lg flex flex-col justify-between gap-4",
                isCompleted && "border-emerald-500/35 bg-emerald-500/[0.03]"
            )}
        >
            {/* Subtle top accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: isCompleted ? "#10b981" : accentColor }}
            />

            {/* Clickable body */}
            <Link href={`/dashboard/savings-goals/${goal.id}`} className="block space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border"
                            style={{
                                backgroundColor: `${isCompleted ? "#10b981" : accentColor}18`,
                                borderColor: `${isCompleted ? "#10b981" : accentColor}30`,
                                color: isCompleted ? "#10b981" : accentColor,
                            }}
                        >
                            {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                            ) : (
                                <IconComp className="h-5 w-5" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-base text-foreground truncate leading-snug group-hover:text-primary transition-colors">
                                {goal.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1",
                                        isCompleted
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : isOnTrack
                                              ? "text-primary"
                                              : "text-amber-600 dark:text-amber-400"
                                    )}
                                >
                                    {isCompleted ? (
                                        <>
                                            <CheckCircle2 className="h-3 w-3" />
                                            Completada
                                        </>
                                    ) : isOnTrack ? (
                                        <>
                                            <TrendingUp className="h-3 w-3" />
                                            En camino
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-3 w-3" />
                                            Retrasada
                                        </>
                                    )}
                                </span>
                                <span className="opacity-40">·</span>
                                <span>Prioridad {priorityLabel}</span>
                            </div>
                        </div>
                    </div>

                    <span
                        className="px-2.5 py-1 rounded-full text-xs font-black tabular-nums shrink-0"
                        style={{
                            backgroundColor: `${isCompleted ? "#10b981" : accentColor}15`,
                            color: isCompleted ? "#10b981" : accentColor,
                        }}
                    >
                        {progress.toFixed(0)}%
                    </span>
                </div>

                {/* Amounts + Sleek Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-foreground">
                            {!isBalanceVisible
                                ? "••••••"
                                : goalTotalType === "percentage"
                                  ? `${progress.toFixed(0)}%`
                                  : goalTotalType === "remaining" && !isCompleted
                                    ? formatMoney(remainingAmount, currency)
                                    : formatMoney(currentAmount, currency)}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                            {goalTotalType === "remaining" && !isCompleted
                                ? `por ahorrar · meta ${isBalanceVisible ? formatMoney(targetAmount, currency) : "••••"}`
                                : `de ${isBalanceVisible ? formatMoney(targetAmount, currency) : "••••"}`}
                        </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-muted/80 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                                backgroundColor: isCompleted ? "#10b981" : accentColor,
                            }}
                        />
                    </div>
                </div>

                {/* Compact Meta Footer */}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium truncate">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-75" />
                        {isCompleted && goal.completed_date
                            ? `Lograda el ${new Date(goal.completed_date).toLocaleDateString("es-PE")}`
                            : !hasTargetDate
                              ? "Sin fecha límite"
                              : daysRemaining !== null && daysRemaining > 0
                                ? `Faltan ${daysRemaining} días`
                                : daysRemaining === 0
                                  ? "Vence hoy"
                                  : "Fecha vencida"}
                    </span>
                    {!isCompleted && Number(goal.monthlyNeeded || 0) > 0 && (
                        <span className="font-bold text-foreground/85 tabular-nums shrink-0">
                            {isBalanceVisible
                                ? `${formatMoney(Number(goal.monthlyNeeded), currency)}/mes`
                                : "•••/mes"}
                        </span>
                    )}
                </div>
            </Link>

            {/* Quick Action Row */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                {!isCompleted && onQuickContribute && (
                    <button
                        type="button"
                        onClick={() => onQuickContribute(goal)}
                        className="flex-1 h-9 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        Aportar
                    </button>
                )}
                <Link
                    href={`/dashboard/savings-goals/${goal.id}`}
                    className={cn(
                        "h-9 px-3 rounded-xl bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground text-xs font-bold flex items-center justify-center gap-1 transition-colors",
                        (isCompleted || !onQuickContribute) && "flex-1"
                    )}
                >
                    <span>Detalles</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    )
}
