"use client"

import { motion } from "framer-motion"
import { Check, AlertTriangle } from "lucide-react"

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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <UnassignedPoolCard
                currency="USD"
                symbol="$"
                data={pool.usd}
                actualIncome={audit?.actualIncomeUSD}
                color="emerald"
            />
            <UnassignedPoolCard
                currency="PEN"
                symbol="S/"
                data={pool.pen}
                actualIncome={audit?.actualIncomePEN}
                color="indigo"
            />
        </div>
    )
}

function UnassignedPoolCard({ currency, symbol, data, color, actualIncome }: { currency: string, symbol: string, data: PoolData, color: string, actualIncome?: number }) {
    const isComplete = Math.abs(data.unassigned) < 0.01
    const isOverallocated = data.unassigned < -0.01

    // Income Audit Logic
    const hasAudit = actualIncome !== undefined
    const surplus = hasAudit ? (actualIncome! - data.total) : 0
    const hasSurplus = surplus > 0.01
    const hasDeficit = surplus < -0.01

    // Determine state color
    let stateColor = `bg-${color}-50 border-${color}-200`
    let textColor = `text-${color}-600`
    let progressColor = `bg-${color}-500`;

    if (isOverallocated) {
        stateColor = "bg-rose-50 border-rose-200"
        textColor = "text-rose-600"
        progressColor = "bg-rose-500"
    } else if (isComplete && !hasSurplus) {
        stateColor = "bg-green-50 border-green-200"
        textColor = "text-green-600"
        progressColor = "bg-green-500"
    }

    // Breakdown
    const expenseShare = data.assignedToExpenses && data.total > 0 ? (data.assignedToExpenses / data.total) * 100 : 0
    const savingsShare = data.assignedToSavings && data.total > 0 ? (data.assignedToSavings / data.total) * 100 : 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-6 rounded-2xl border-2 transition-all ${stateColor}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-xs font-bold tracking-wider text-muted-foreground opacity-70">{currency} POOL</span>
                    <div className="text-2xl font-black mt-1 flex items-baseline gap-2">
                        <span>{symbol} {data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        {/* AUDIT INDICATOR */}
                        {hasAudit && (
                            <div className="flex items-center gap-1.5 ml-1">
                                {hasSurplus && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200" title={`Ingreso Real: ${symbol} ${actualIncome?.toLocaleString()}`}>
                                        +{symbol}{surplus.toLocaleString(undefined, { maximumFractionDigits: 0 })} Real
                                    </span>
                                )}
                                {hasDeficit && (
                                    <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold border border-rose-200" title={`Ingreso Real: ${symbol} ${actualIncome?.toLocaleString()}`}>
                                        {symbol}{surplus.toLocaleString(undefined, { maximumFractionDigits: 0 })} Real
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* Progress Ring Placeholder */}
                <div className="text-right">
                    <div className={`text-4xl font-bold ${textColor}`}>
                        {Math.round(data.percentage)}%
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Asignado</span>
                </div>
            </div>

            {/* THE BIG NUMBER: MONEY TO ASSIGN */}
            <div className="bg-white/80 dark:bg-black/20 backdrop-blur rounded-xl p-4 border border-black/5">
                <div className="text-xs uppercase font-bold text-muted-foreground mb-1 flex items-center gap-2">
                    {isOverallocated ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : "Por Asignar"}
                    {isOverallocated && <span className="text-rose-500">¡Sobrepasado!</span>}
                </div>
                <div className={`text-3xl font-bold tracking-tight ${textColor}`}>
                    {symbol} {Math.abs(data.unassigned).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                {/* VISUAL BREAKDOWN BAR */}
                <div className="mt-3 h-2 w-full bg-black/5 rounded-full overflow-hidden flex">
                    {expenseShare > 0 && (
                        <div style={{ width: `${expenseShare}%` }} className="h-full bg-slate-400" title={`Gastos: ${symbol}${data.assignedToExpenses?.toLocaleString()}`} />
                    )}
                    {savingsShare > 0 && (
                        <div style={{ width: `${savingsShare}%` }} className="h-full bg-emerald-400" title={`Ahorros: ${symbol}${data.assignedToSavings?.toLocaleString()}`} />
                    )}
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        Gastos
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        Ahorro
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between text-sm text-muted-foreground font-medium">
                <span>Asignado: {symbol}{data.assigned.toLocaleString()}</span>
                {isComplete && <span className="flex items-center text-green-600"><Check className="w-4 h-4 mr-1" /> Completado</span>}
            </div>

            {/* AUDIT MESSAGE */}
            {hasSurplus && (
                <div className="mt-3 text-xs text-emerald-600 font-medium bg-emerald-100/50 p-2 rounded border border-emerald-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tienes un excedente real de {symbol}{surplus.toFixed(2)}. ¡Ajusta tus ingresos!
                </div>
            )}
        </motion.div>
    )
}
