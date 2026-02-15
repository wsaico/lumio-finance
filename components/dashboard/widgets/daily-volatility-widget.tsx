
"use client"

import { Card } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { useFormat } from "@/hooks/useFormat"
import { Activity, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/hooks/useSettingsStore"

export function DailyVolatilityWidget() {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const { data, isLoading } = useQuery({
        queryKey: ['daily-volatility-v2'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/daily-volatility')
            if (!res.ok) throw new Error('Failed')
            return res.json()
        }
    })

    if (isLoading) return null;

    const { avg, todayData, lastActive } = data || { avg: 0, todayData: { amount: 0 }, lastActive: 0 }
    const displayAmount = todayData?.amount > 0 ? todayData.amount : lastActive
    const diff = displayAmount - avg

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col sm:flex-row overflow-hidden relative shadow-2xl p-6">
                {/* Information Column */}
                <div className="flex-1 flex flex-col justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20">
                            <Activity className="w-5 h-5 text-[#00D1FF]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Volatilidad Diaria</h3>
                            <p className="text-[9px] font-bold text-zinc-500 opacity-60">Rango de saldos (Min/Max)</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight tabular-nums text-zinc-900 dark:text-white">
                                {isBalanceVisible ? formatMoney(displayAmount) : '******'}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase opacity-40">
                                Reciente
                            </span>
                        </div>

                        <div className={cn(
                            "mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold",
                            diff > 0 ? "bg-[#FF4D00]/10 text-[#FF4D00]" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                            <TrendingUp className={cn("w-3 h-3", diff <= 0 && "rotate-180")} />
                            <span>{isBalanceVisible ? formatMoney(Math.abs(diff)) : '***'} sobre promedio</span>
                        </div>
                    </div>
                </div>

                {/* Pulse Visual (Candle Style) */}
                <div className="w-full sm:w-[120px] h-32 sm:h-full flex items-center justify-center relative mt-6 sm:mt-0">
                    {/* Background grid lines similar to target image */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-10">
                        {[...Array(6)].map((_, i) => <div key={i} className="h-px w-full bg-zinc-200 dark:bg-white" />)}
                    </div>

                    {/* The Pulse Bar */}
                    <div className="relative h-[80%] w-px bg-[#00D1FF]/30">
                        <motion.div
                            className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[#00D1FF]"
                            initial={{ height: 0, bottom: '20%' }}
                            animate={{ height: '40%', bottom: '30%' }}
                            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        />
                        <motion.div
                            className="absolute left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[#00D1FF]"
                            initial={{ opacity: 0, bottom: '50%' }}
                            animate={{ opacity: 1, bottom: '50%' }}
                            style={{ boxShadow: '0 0 10px #00D1FF' }}
                        />
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}

