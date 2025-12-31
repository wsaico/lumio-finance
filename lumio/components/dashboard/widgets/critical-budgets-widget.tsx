"use client"

import { Card } from "@/components/ui/card"
import { useBudget } from "@/hooks/use-budget"
import { useFormat } from "@/hooks/use-format"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { AlertCircle, Flame, CheckCircle2, TrendingDown, Shield, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

export function CriticalBudgetsWidget() {
    const { budgets, isLoading } = useBudget()
    const { formatMoney } = useFormat()
    const { currencyCode } = useSettingsStore()

    if (isLoading) {
        return (
            <Card className="relative overflow-hidden border-none h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900" />
                <div className="relative p-6 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                            <AlertCircle className="h-8 w-8 text-amber-400" />
                        </motion.div>
                        <span className="text-white/60 text-sm">Analizando presupuestos...</span>
                    </div>
                </div>
            </Card>
        )
    }

    // Process budgets to find critical ones (high usage)
    const criticalBudgets = (budgets || [])
        .map((budget: any) => {
            const spent = budget.spent || 0
            const percentage = budget.percent || 0

            // Calculate Burn Rate
            const now = new Date()
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
            const daysElapsed = now.getDate()

            const dailyBurnRate = spent / Math.max(1, daysElapsed)
            const allowedBurnRate = budget.amount / daysInMonth
            const burnRatio = dailyBurnRate / allowedBurnRate

            return {
                ...budget,
                spent,
                percentage,
                dailyBurnRate,
                allowedBurnRate,
                burnRatio
            }
        })
        .filter(b => b.percentage > 70 || b.burnRatio > 1.2)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3)

    // Calculate today's position in month for marker
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const todayPosition = (now.getDate() / daysInMonth) * 100

    if (criticalBudgets.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                <Card className="relative overflow-hidden border-none h-full shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900" />
                    <motion.div
                        className="absolute top-10 right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    />
                    <div className="relative h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                        <motion.div
                            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20"
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            animate={{ y: [0, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            <Shield className="h-10 w-10 text-emerald-400" />
                        </motion.div>
                        <div>
                            <h3 className="font-bold text-xl text-white mb-1">Todo Bajo Control</h3>
                            <p className="text-sm text-white/50">Tus presupuestos están saludables</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            <span className="text-xs font-semibold text-emerald-400">Excelente gestión</span>
                        </div>
                    </div>
                </Card>
            </motion.div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
            <Card className="relative overflow-hidden border-none h-full shadow-2xl">
                {/* Premium Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900" />

                {/* Animated Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute -top-20 right-10 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute bottom-0 left-1/4 w-32 h-32 bg-rose-500/15 rounded-full blur-3xl"
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 6, repeat: Infinity }}
                    />
                </div>

                <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/20">
                                <AlertCircle className="h-4 w-4 text-amber-400" />
                            </div>
                            <h3 className="font-bold text-sm text-white/90 uppercase tracking-wider">Alertas</h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                {criticalBudgets.length}
                            </span>
                        </div>
                        <motion.div
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Flame className="h-3 w-3 text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-400">Atención</span>
                        </motion.div>
                    </div>

                    {/* Budgets List */}
                    <div className="flex-1 p-4 space-y-3 overflow-auto">
                        {criticalBudgets.map((budget, index) => {
                            const isOverBudget = budget.percentage > 100
                            const isCritical = budget.percentage > 90
                            const colorClass = isOverBudget ? "rose" : isCritical ? "amber" : "orange"

                            return (
                                <motion.div
                                    key={budget.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2"
                                >
                                    {/* Budget Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate" title={budget.name}>
                                                {budget.name || 'Categoría'}
                                            </div>
                                            <div className="text-xs text-white/50">
                                                {formatMoney(budget.spent, budget.currency)} de {formatMoney(budget.amount, budget.currency)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-black ${isOverBudget ? 'text-rose-400' : 'text-amber-400'}`}>
                                                {budget.percentage.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${isOverBudget
                                                    ? 'from-rose-500 to-red-500'
                                                    : isCritical
                                                        ? 'from-amber-500 to-orange-500'
                                                        : 'from-orange-400 to-amber-400'
                                                }`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
                                        />
                                        {/* Today Marker */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                                            style={{ left: `${todayPosition}%` }}
                                        />
                                    </div>

                                    {/* Burn Rate Info */}
                                    {budget.burnRatio > 1.1 && (
                                        <div className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                            <div className="flex items-center gap-1 text-rose-400">
                                                <Flame className="h-3 w-3" />
                                                <span className="font-semibold">Gasto acelerado</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-white/60">
                                                <TrendingDown className="h-3 w-3" />
                                                <span>{formatMoney(budget.dailyBurnRate, budget.currency)}/día</span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
