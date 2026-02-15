"use client"

import { Card } from "@/components/ui/card"
import { useFormat } from "@/hooks/useFormat"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts"
import { useEffect, useState } from "react"
import { Activity, ShieldCheck, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

interface HealthData {
    score: number
    metrics: Array<{ subject: string; A: number; fullMark: number }>
}

export function FinancialHealthWidget() {
    const [healthData, setHealthData] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchHealth() {
            try {
                setLoading(true)
                const res = await fetch('/api/analytics/financial-health?period=1m')
                const data = await res.json()

                if (data.error) throw new Error(data.error)

                const { kpis, budgetRule } = data

                setHealthData({
                    score: kpis.healthScore,
                    metrics: [
                        { subject: 'Estabilidad', A: kpis.netCashFlow > 0 ? 100 : 50, fullMark: 100 },
                        { subject: 'Ahorro', A: Math.min(100, (budgetRule.savings.percent / 20) * 100), fullMark: 100 },
                        { subject: 'Presupuesto', A: 100 - Math.max(0, (budgetRule.needs.percent - 50) * 2), fullMark: 100 },
                        { subject: 'Liquidez', A: Math.min(100, (kpis.runwayMonths / 6) * 100), fullMark: 100 },
                        { subject: 'Deuda', A: 100 - Math.min(100, ((kpis.liabilities || 0) / (kpis.totalLiquidity || 1)) * 100), fullMark: 100 },
                    ],
                })
            } catch (err) {
                console.error("Health fetch error", err)
            } finally {
                setLoading(false)
            }
        }
        fetchHealth()
    }, [])

    if (loading) return null

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
                        <div className="p-3 rounded-2xl bg-[#00D1FF]/10 border border-[#00D1FF]/20">
                            <ShieldCheck className="w-5 h-5 text-[#00D1FF]" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Salud Financiera</h3>
                            <p className="text-[9px] font-bold text-[#00D1FF] opacity-80">Algoritmo v2.0 <span className="ml-2 text-zinc-500">{healthData?.score} Pts</span></p>
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={healthData?.metrics || []}>
                            <PolarGrid stroke="oklch(var(--border) / 0.1)" strokeWidth={1} />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={({ x, y, payload }) => (
                                    <text
                                        x={x}
                                        y={y}
                                        textAnchor="middle"
                                        fill="oklch(var(--muted-foreground))"
                                        fontSize={8}
                                        fontWeight={800}
                                        className="uppercase tracking-[0.1em]"
                                    >
                                        {payload.value}
                                    </text>
                                )}
                            />
                            <Radar
                                name="Health"
                                dataKey="A"
                                stroke="#00D1FF"
                                strokeWidth={2}
                                fill="#00D1FF"
                                fillOpacity={0.15}
                                animationDuration={1500}
                                isAnimationActive={true}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Estado Óptimo</span>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
