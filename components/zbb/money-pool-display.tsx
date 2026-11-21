"use client"

import { motion } from "framer-motion"
import { CheckCircle2, AlertTriangle, Sparkles, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"

interface PoolData {
    total: number
    assigned: number
    assignedToExpenses?: number
    assignedToSavings?: number
    unassigned: number
    percentage: number
}

interface MoneyPool {
    usd: PoolData
    pen: PoolData
}

interface MoneyPoolDisplayProps {
    pool: MoneyPool
    audit?: {
        actualIncomeUSD: number
        actualIncomePEN: number
    }
}

export function MoneyPoolDisplay({ pool, audit }: MoneyPoolDisplayProps) {
    const { currencyCode } = useSettingsStore()

    const hasPen = pool.pen.total > 0 || pool.pen.assigned > 0
    const hasUsd = pool.usd.total > 0 || pool.usd.assigned > 0

    // Show only active currency pools (or primary currency if both are empty)
    const activePools: { currency: "PEN" | "USD"; data: PoolData; actual?: number }[] = []
    if (hasPen) activePools.push({ currency: "PEN", data: pool.pen, actual: audit?.actualIncomePEN })
    if (hasUsd) activePools.push({ currency: "USD", data: pool.usd, actual: audit?.actualIncomeUSD })

    if (activePools.length === 0) {
        const fallback = currencyCode === "USD" ? "USD" : "PEN"
        activePools.push({
            currency: fallback,
            data: fallback === "USD" ? pool.usd : pool.pen,
            actual: fallback === "USD" ? audit?.actualIncomeUSD : audit?.actualIncomePEN,
        })
    }

    return (
        <div
            className={cn(
                "grid gap-4",
                activePools.length > 1 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
            )}
        >
            {activePools.map((item) => (
                <UnassignedPoolCard
                    key={item.currency}
                    currency={item.currency}
                    data={item.data}
                    actualIncome={item.actual}
                />
            ))}
        </div>
    )
}

function UnassignedPoolCard({
    currency,
    data,
    actualIncome,
}: {
    currency: "PEN" | "USD"
    data: PoolData
    actualIncome?: number
}) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const money = (val: number) => (isBalanceVisible ? formatMoney(val, currency) : "••••••")

    const isComplete = Math.abs(data.unassigned) < 0.01 && data.total > 0
    const isOverallocated = data.unassigned < -0.01

    const hasAudit = actualIncome !== undefined && data.total > 0
    const surplus = hasAudit ? actualIncome! - data.total : 0
    const hasSurplus = surplus > 0.01
    const hasDeficit = surplus < -0.01

    const expenseShare =
        data.assignedToExpenses && data.total > 0
            ? Math.min(100, (data.assignedToExpenses / data.total) * 100)
            : 0
    const savingsShare =
        data.assignedToSavings && data.total > 0
            ? Math.min(100 - expenseShare, (data.assignedToSavings / data.total) * 100)
            : 0

    const heroClass = isOverallocated
        ? "bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white shadow-rose-500/20"
        : isComplete
          ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
          : "bg-gradient-to-br from-[#7C5CFC] via-[#6D4DF6] to-[#5B3CE6] text-white shadow-primary/25"

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative rounded-[1.75rem] p-5 sm:p-6 shadow-xl overflow-hidden flex flex-col justify-between gap-4",
                heroClass
            )}
        >
            <div className="pointer-events-none absolute -top-14 -right-14 h-44 w-44 rounded-full bg-white/15 blur-2xl" />

            {/* TOP ROW */}
            <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                        Pool {currency} · Ingreso Planificado
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 mt-1">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                            {money(data.total)}
                        </span>
                        {hasSurplus && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
                                <TrendingUp className="h-3 w-3" />+{money(surplus)} real
                            </span>
                        )}
                        {hasDeficit && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[11px] font-bold">
                                <TrendingDown className="h-3 w-3" />-{money(Math.abs(surplus))} brecha
                            </span>
                        )}
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none">
                        {Math.round(data.percentage)}%
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 mt-1">
                        Asignado
                    </p>
                </div>
            </div>

            {/* INNER GLASS BOX: POR ASIGNAR */}
            <div className="relative z-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/85 flex items-center gap-1.5">
                        {isOverallocated ? (
                            <>
                                <AlertTriangle className="h-4 w-4 text-amber-200" />
                                Sobrepasado por
                            </>
                        ) : isComplete ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                                Presupuesto Base Cero Completo
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-3.5 w-3.5 text-white/80" />
                                Disponible por asignar
                            </>
                        )}
                    </span>
                    <span className="text-xs font-bold text-white/80 tabular-nums">
                        Asignado: {money(data.assigned)}
                    </span>
                </div>

                <p className="text-3xl font-black tracking-tight tabular-nums leading-none">
                    {money(Math.abs(data.unassigned))}
                </p>

                {/* VISUAL BREAKDOWN BAR */}
                <div className="space-y-1.5">
                    <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden flex">
                        {expenseShare > 0 && (
                            <div
                                style={{ width: `${expenseShare}%` }}
                                className="h-full bg-white/90 transition-all duration-500"
                            />
                        )}
                        {savingsShare > 0 && (
                            <div
                                style={{ width: `${savingsShare}%` }}
                                className="h-full bg-emerald-300 transition-all duration-500"
                            />
                        )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/80">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-white/90" />
                            Gastos ({Math.round(expenseShare)}%)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-300" />
                            Ahorro ({Math.round(savingsShare)}%)
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
