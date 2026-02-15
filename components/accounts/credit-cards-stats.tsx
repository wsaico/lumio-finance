"use client"

import { useMemo } from "react"
import { useAccounts } from "@/hooks/useAccounts"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useFormat } from "@/hooks/useFormat"
import { TrendingUp, CreditCard, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function CreditCardsStats() {
    const { accounts } = useAccounts()
    const { convert } = useExchangeRates()
    const { currencyCode: baseCurrency } = useSettingsStore()
    const { formatMoney } = useFormat()

    const stats = useMemo(() => {
        const creditCards = accounts?.filter(a => a.accountType === 'CREDIT_CARD') || []

        let totalLimitConverted = 0
        let totalUsedConverted = 0
        let activeCards = 0
        const totalCards = creditCards.length

        creditCards.forEach(card => {
            const limit = Number(card.creditLimit) || 0
            const used = Number(card.usedBalance) || 0
            const currency = card.currencyCode || 'USD'

            // Convert to base currency
            totalLimitConverted += convert(limit, currency, baseCurrency)
            totalUsedConverted += convert(used, currency, baseCurrency)

            if (card.isActive) activeCards++
        })

        const totalAvailable = totalLimitConverted - totalUsedConverted
        const usagePercent = totalLimitConverted > 0 ? (totalUsedConverted / totalLimitConverted) * 100 : 0
        const availablePercent = totalLimitConverted > 0 ? (totalAvailable / totalLimitConverted) * 100 : 0

        const avgAvailable = activeCards > 0 ? totalAvailable / activeCards : 0
        const activePercentage = totalCards > 0 ? (activeCards / totalCards) * 100 : 0

        return {
            totalAvailable,
            activeCards,
            totalCards,
            avgAvailable,
            usagePercent,
            availablePercent,
            activePercentage
        }
    }, [accounts, convert, baseCurrency])

    const statCards = [
        {
            icon: DollarSign,
            label: "Balance Total",
            value: formatMoney(stats.totalAvailable, baseCurrency),
            change: null,
            changePositive: true,
            progress: stats.availablePercent,
            progressLabel: `${Math.round(stats.availablePercent)}%`,
            progressDescription: "Línea Libre"
        },
        {
            icon: CreditCard,
            label: "Tarjetas Activas",
            value: `${stats.activeCards}/${stats.totalCards}`,
            change: null,
            changePositive: stats.activeCards === stats.totalCards && stats.totalCards > 0,
            progress: stats.activePercentage,
            progressLabel: `${Math.round(stats.activePercentage)}%`,
            progressDescription: "Disponibilidad"
        },
        {
            icon: TrendingUp,
            label: "Promedio Disponible",
            value: formatMoney(stats.avgAvailable, baseCurrency),
            change: null,
            changePositive: true,
            progress: stats.availablePercent,
            progressLabel: `${Math.round(stats.availablePercent)}%`,
            progressDescription: "Salud Financiera"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                    >
                        <Card className="relative overflow-hidden p-6 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/50 hover:border-primary/50 transition-all duration-500 group h-full flex flex-col justify-between shadow-sm hover:shadow-2xl hover:-translate-y-1">
                            {/* Animated Background Glow */}
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 rounded-full blur-[60px] group-hover:bg-primary/20 transition-all duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 block mb-0.5">
                                                Resumen
                                            </span>
                                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                                                {stat.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <h4 className="text-3xl font-black tracking-tighter text-neutral-900 dark:text-white tabular-nums whitespace-nowrap">
                                            {stat.value}
                                        </h4>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{stat.progressDescription}</span>
                                    <span className="text-[10px] text-neutral-500 font-bold">{stat.progressLabel}</span>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800/50 rounded-full overflow-hidden shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stat.progress}%` }}
                                        transition={{ duration: 1.5, delay: 0.5 + (index * 0.1) }}
                                        className={cn(
                                            "h-full rounded-full bg-gradient-to-r",
                                            stat.changePositive
                                                ? "from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                : "from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                        )}
                                    />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )
            })}
        </div>
    )
}
