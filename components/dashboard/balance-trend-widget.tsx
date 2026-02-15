"use client"

import { Card } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Info } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useFormat } from "@/hooks/useFormat"

export function BalanceTrendWidget() {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { currencyCode, isBalanceVisible } = useSettingsStore()
    const { formatMoney } = useFormat()

    useEffect(() => {
        async function fetchData() {
            try {
                // Simulate daily data for the current month to match target image's granularity
                const res = await fetch('/api/analytics/balance-trend?months=1&granularity=daily')
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (error) {
                console.error('Error fetching balance trend:', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    if (isLoading) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
        >
            <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col overflow-hidden relative shadow-2xl">
                {/* Header Section */}
                <div className="flex items-start justify-between p-6 pb-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#FF007A]/10 border border-[#FF007A]/20">
                            <TrendingUp className="w-5 h-5 text-[#FF007A]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Tendencia Mensual</h3>
                            <p className="text-[9px] font-bold text-zinc-500 opacity-60">Acumulado (Mes Actual)</p>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 px-2 pt-4 relative">
                    <ResponsiveContainer width="100%" height="100%" minHeight={220}>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPinkTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#FF007A" stopOpacity={0.3} />
                                    <stop offset="60%" stopColor="#FF007A" stopOpacity={0.1} />
                                    <stop offset="100%" stopColor="#FF007A" stopOpacity={0} />
                                </linearGradient>
                                <filter id="glowTrend">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="0" vertical={false} stroke="oklch(var(--border) / 0.1)" strokeWidth={0.5} />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 8, fill: 'oklch(var(--muted-foreground))', fontWeight: 600 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 8, fill: 'oklch(var(--muted-foreground))', fontWeight: 600 }}
                                tickFormatter={(val) => isBalanceVisible ? `${(val / 1000).toFixed(2)}k` : '***'}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(0,0,0,0.9)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    fontSize: '9px',
                                    fontWeight: 'bold',
                                    padding: '10px 14px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ stroke: 'rgba(255,0,122,0.3)', strokeWidth: 1.5 }}
                                formatter={(value: any) => [isBalanceVisible ? formatMoney(value, currencyCode) : '******', 'Balance']}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#FF007A"
                                strokeWidth={3}
                                strokeLinecap="round"
                                fill="url(#colorPinkTrend)"
                                animationDuration={1500}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#FF007A', filter: 'url(#glowTrend)' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </motion.div>
    )
}
