"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Target, TrendingUp, Trophy, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSavingsGoals, useSavingsGoalsAnalytics } from "@/hooks/useSavingsGoals"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { GoalCard } from "@/components/savings-goals/goal-card"
import { ContributeModal } from "@/components/savings-goals/contribute-modal"
import { PremiumPreviewGate } from "@/components/billing/premium-preview-gate"
import { cn } from "@/lib/utils"

const STATUS_TABS = [
    { id: "ACTIVE", label: "Activas" },
    { id: "COMPLETED", label: "Completadas" },
    { id: "", label: "Todas" },
] as const

export default function SavingsGoalsPage() {
    const [statusFilter, setStatusFilter] = useState<string>("ACTIVE")
    const [quickContributeGoal, setQuickContributeGoal] = useState<any | null>(null)

    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const { data: goalsData, isLoading: loadingGoals } = useSavingsGoals(statusFilter)
    const { data: analytics, isLoading: loadingAnalytics } = useSavingsGoalsAnalytics()

    const goals = goalsData || []
    const totalSaved = Number(analytics?.totalSaved || 0)
    const avgProgress = Math.min(100, Math.max(0, Number(analytics?.avgProgress || 0)))
    const avgMonthly = Number(analytics?.avgMonthlyContribution || 0)
    const activeCount = Number(analytics?.activeGoals || 0)
    const completedCount = Number(analytics?.completedGoals || 0)

    return (
        <PremiumPreviewGate moduleName="Metas de Ahorro">
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            {/* EXECUTIVE HERO BANNER */}
            {loadingAnalytics ? (
                <Skeleton className="h-44 sm:h-48 w-full rounded-[1.75rem]" />
            ) : (
                <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-violet-700 p-5 sm:p-7 text-white shadow-xl shadow-emerald-900/15">
                    <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-black/15 blur-3xl" />

                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                                <Sparkles className="h-3.5 w-3.5" />
                                Fondo de Metas
                            </div>
                            <p className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                                {isBalanceVisible ? formatMoney(totalSaved) : "••••••"}
                            </p>
                            <p className="text-xs sm:text-sm text-white/80 font-medium">
                                {activeCount} {activeCount === 1 ? "meta activa" : "metas activas"} ·{" "}
                                {completedCount} {completedCount === 1 ? "completada" : "completadas"}
                            </p>
                        </div>

                        <Button
                            asChild
                            className="h-11 px-5 rounded-full bg-white text-emerald-700 hover:bg-white/95 font-extrabold text-sm shadow-lg shadow-black/15 gap-2 self-start sm:self-auto"
                        >
                            <Link href="/dashboard/savings-goals/new">
                                <Plus className="h-4 w-4 stroke-[2.75]" />
                                Nueva Meta
                            </Link>
                        </Button>
                    </div>

                    {/* Bottom KPI Strip inside Hero */}
                    <div className="relative mt-5 pt-4 border-t border-white/15 grid grid-cols-3 gap-3">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Avance prom.
                            </span>
                            <p className="text-base sm:text-lg font-black tabular-nums mt-0.5">
                                {avgProgress.toFixed(0)}%
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                Aporte / mes
                            </span>
                            <p className="text-base sm:text-lg font-black tabular-nums mt-0.5 truncate">
                                {isBalanceVisible ? formatMoney(avgMonthly) : "••••"}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Logradas
                            </span>
                            <p className="text-base sm:text-lg font-black tabular-nums mt-0.5">
                                {completedCount}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SEGMENTED FILTER PILLS */}
            <div className="flex items-center justify-between gap-3">
                <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-2xl bg-muted/50 border border-border/60 w-full sm:w-auto gap-1">
                    {STATUS_TABS.map((tab) => {
                        const active = statusFilter === tab.id
                        return (
                            <button
                                key={tab.id || "ALL"}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-extrabold transition-all",
                                    active
                                        ? "bg-card text-foreground shadow-sm border border-border/60"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* GOALS GRID */}
            {loadingGoals ? (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-52 rounded-3xl" />
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <div className="card-modern p-10 sm:p-14 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
                    <div className="h-16 w-16 rounded-3xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                        <Target className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                        No hay metas{" "}
                        {statusFilter === "ACTIVE"
                            ? "activas"
                            : statusFilter === "COMPLETED"
                              ? "completadas"
                              : "registradas"}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 mb-6 max-w-sm">
                        Crea tu primera meta de ahorro y da seguimiento real a tus objetivos financieros.
                    </p>
                    <Button
                        asChild
                        className="rounded-full h-11 px-6 font-extrabold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 gap-2"
                    >
                        <Link href="/dashboard/savings-goals/new">
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                            Crear Primera Meta
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal: any) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onQuickContribute={(g) => setQuickContributeGoal(g)}
                        />
                    ))}
                </div>
            )}

            {/* QUICK CONTRIBUTE MODAL */}
            <ContributeModal
                goal={quickContributeGoal}
                open={Boolean(quickContributeGoal)}
                onOpenChange={(open) => {
                    if (!open) setQuickContributeGoal(null)
                }}
            />
        </div>
        </PremiumPreviewGate>
    )
}
