"use client"

import { Card } from "@/components/ui/card"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useFormat } from "@/hooks/useFormat"
import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Activity, Eye, EyeOff } from "lucide-react"
import { useSettingsStore } from "@/hooks/useSettingsStore"

export function FinancialTrendWidget() {
    const { data, isLoading } = useDashboardData()
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    // Aggregates for the current month
    const currentMonth = data?.history?.[data.history.length - 1] || { income: 0, expense: 0 }
    const totalIncome = currentMonth.income
    const totalExpense = currentMonth.expense

    if (isLoading) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col overflow-hidden relative shadow-2xl">
                {/* Header Section */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20">
                            <Activity className="w-5 h-5 text-[#00D1FF]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Flujo de Caja</h3>
                            <p className="text-[9px] font-bold text-zinc-500 opacity-60">Tendencia semestral</p>
                        </div>
                    </div>
                </div>

                {/* Content - Symmetric Split */}
                <div className="flex-1 flex flex-col justify-center px-6 gap-6">
                    {/* Income Row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1 group">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00D1FF]" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ingresos</span>
                                <ArrowUpRight className="w-3 h-3 text-[#00D1FF] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight tabular-nums text-zinc-900 dark:text-white">
                                {isBalanceVisible ? formatMoney(totalIncome) : '******'}
                            </h4>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-[#00D1FF] bg-[#00D1FF]/10 px-2 py-0.5 rounded-full">+12%</span>
                        </div>
                    </div>

                    {/* Divider Line */}
                    <div className="h-px w-full bg-zinc-100 dark:bg-white/5 relative">
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-1 overflow-hidden w-full flex gap-1">
                            <div className="h-full bg-[#00D1FF]/40" style={{ width: `${(totalIncome / (totalIncome + totalExpense)) * 100}%` }} />
                            <div className="h-full bg-[#FF007A]/40 flex-1" />
                        </div>
                    </div>

                    {/* Expense Row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1 group">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FF007A]" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Egresos</span>
                                <ArrowDownRight className="w-3 h-3 text-[#FF007A] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight tabular-nums text-zinc-900 dark:text-white/90">
                                {isBalanceVisible ? formatMoney(totalExpense) : '******'}
                            </h4>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-[#FF007A] bg-[#FF007A]/10 px-2 py-0.5 rounded-full">-5%</span>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
