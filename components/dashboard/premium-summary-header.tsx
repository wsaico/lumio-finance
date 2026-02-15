"use client"

import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import {
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    PiggyBank,
    Activity,
    Eye,
    EyeOff
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PremiumSummaryHeader() {
    const { totalBalanceConverted, isLoading } = useAccounts()
    const { formatMoney } = useFormat()
    const { currencyCode: baseCurrency, isBalanceVisible, setIsBalanceVisible } = useSettingsStore()
    const [monthlyData, setMonthlyData] = useState<any>(null)

    useEffect(() => {
        async function fetchSummary() {
            try {
                const now = new Date()
                const res = await fetch(`/api/analytics/monthly-summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
                if (res.ok) {
                    const data = await res.json()
                    setMonthlyData(data)
                }
            } catch (err) {
                console.error("Error fetching summary:", err)
            }
        }
        fetchSummary()
    }, [])

    const stats = [
        {
            id: 'available',
            label: 'DINERO DISPONIBLE',
            value: isBalanceVisible ? formatValue(totalBalanceConverted) : '******',
            icon: Wallet,
            theme: 'bg-[#00D1FF] dark:bg-[#00D1FF] text-white shadow-[#00D1FF]/20',
            currency: 'S/.'
        },
        {
            id: 'income',
            label: 'INGRESOS',
            value: isBalanceVisible ? formatValue(monthlyData?.totalIncome || 0) : '******',
            icon: ArrowUpRight,
            theme: 'bg-[#00E5E5] dark:bg-[#00E5E5] text-white shadow-[#00E5E5]/20',
            trend: '+ 100%',
            currency: 'S/.'
        },
        {
            id: 'expense',
            label: 'GASTOS',
            value: isBalanceVisible ? formatValue(monthlyData?.totalExpense || 0) : '******',
            icon: ArrowDownRight,
            theme: 'bg-[#FF007A] dark:bg-[#FF007A] text-white shadow-[#FF007A]/20',
            trend: '+ 100%',
            currency: 'S/.'
        },
        {
            id: 'net',
            label: 'FLUJO NETO',
            value: isBalanceVisible ? formatValue((monthlyData?.totalIncome || 0) - (monthlyData?.totalExpense || 0)) : '******',
            icon: Zap,
            theme: 'bg-[#1A1A1A] dark:bg-[#1A1A1A] text-white shadow-xl border border-white/5',
            currency: 'S/.'
        },
        {
            id: 'savings',
            label: 'AHORRO',
            value: isBalanceVisible ? '0.00' : '******',
            icon: PiggyBank,
            theme: 'bg-[#2A2A2A] dark:bg-[#2A2A2A] text-white shadow-xl border border-white/5',
            currency: 'S/.'
        },
        {
            id: 'movements',
            label: 'MOVIMIENTOS',
            value: monthlyData?.transactionCount || 0,
            icon: Activity,
            theme: 'bg-[#1A1A1A] dark:bg-[#1A1A1A] text-white shadow-xl border border-white/5',
        },
    ]

    function formatValue(val: number) {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val)
    }

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500/50">Resumen Financiero</h2>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05, duration: 0.4 }}
                        className={cn(
                            "relative overflow-hidden p-4 rounded-[2.5rem] flex flex-col justify-between min-h-[120px] shadow-2xl transition-all hover:scale-[1.02]",
                            stat.theme
                        )}
                    >
                        {/* Status Icon */}
                        <div className="flex items-start justify-between">
                            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/10">
                                <stat.icon className="w-4 h-4 text-white" />
                            </div>
                            {stat.trend && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 text-[9px] font-bold">
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                    {stat.trend}
                                </div>
                            )}
                        </div>

                        {/* Label */}
                        <div className="mt-4">
                            <p className="text-[10px] font-black tracking-widest opacity-80 uppercase">
                                {stat.label}
                            </p>
                        </div>

                        {/* Value Row */}
                        <div className="flex items-baseline gap-1 mt-1">
                            {stat.currency && (
                                <span className="text-[12px] font-bold opacity-60">{stat.currency}</span>
                            )}
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter tabular-nums truncate">
                                {isLoading ? "..." : stat.value}
                            </h3>
                            {stat.currency && (
                                <span className="text-[10px] font-bold opacity-40 ml-1">PEN</span>
                            )}
                        </div>

                        {/* Subtle background glow/decal */}
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <stat.icon className="w-16 h-16 -mr-4 -mt-4 rotate-12" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
