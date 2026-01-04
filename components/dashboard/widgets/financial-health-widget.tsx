"use client"

import { Card } from "@/components/ui/card"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { useEffect, useState } from "react"
import { Activity, ShieldCheck, AlertTriangle, Wallet, TrendingUp, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

interface HealthData {
    score: number
    metrics: Array<{ subject: string; A: number; fullMark: number }>
    compliance: {
        needs: number
        wants: number
        savings: number
    }
    liquidity: {
        ratio: number
        liquidAssets: number
        liabilities: number
    }
}

export function FinancialHealthWidget() {
    const { formatCompactMoney } = useFormat()
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

                // Map API response to widget format
                setHealthData({
                    score: kpis.healthScore,
                    metrics: [
                        { subject: 'Necesidades', A: 100 - Math.max(0, (budgetRule.needs.percent - 50) * 2), fullMark: 100 },
                        { subject: 'Deseos', A: 100 - Math.max(0, (budgetRule.wants.percent - 30) * 3), fullMark: 100 },
                        { subject: 'Ahorro', A: Math.min(100, (budgetRule.savings.percent / 20) * 100), fullMark: 100 },
                        { subject: 'Liquidez', A: Math.min(100, (kpis.runwayMonths / 6) * 100), fullMark: 100 },
                        { subject: 'Estabilidad', A: kpis.netCashFlow > 0 ? 100 : 50, fullMark: 100 },
                    ],
                    compliance: {
                        needs: budgetRule.needs.percent,
                        wants: budgetRule.wants.percent,
                        savings: budgetRule.savings.percent
                    },
                    liquidity: {
                        ratio: kpis.runwayMonths,
                        liquidAssets: kpis.totalLiquidity,
                        liabilities: kpis.liabilities || 0
                    }
                })
            } catch (err) {
                console.error("Health fetch error", err)
            } finally {
                setLoading(false)
            }
        }
        fetchHealth()
    }, [])

    const getScoreColor = (score: number) => {
        if (score >= 80) return { text: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-600/10", glow: "shadow-emerald-500/20" }
        if (score >= 50) return { text: "text-amber-400", bg: "from-amber-500/20 to-amber-600/10", glow: "shadow-amber-500/20" }
        return { text: "text-rose-400", bg: "from-rose-500/20 to-rose-600/10", glow: "shadow-rose-500/20" }
    }

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Excelente"
        if (score >= 60) return "Bueno"
        if (score >= 40) return "Regular"
        return "Mejorar"
    }

    if (loading) {
        return (
            <Card className="widget-surface h-full">
                <div className="absolute -top-24 right-0 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl" />
                <div className="relative p-6 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Activity className="h-8 w-8 text-primary" />
                        </motion.div>
                        <span className="text-muted-foreground text-sm">Analizando salud financiera...</span>
                    </div>
                </div>
            </Card>
        )
    }

    const scoreStyle = getScoreColor(healthData?.score ?? 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
        >
            <Card className="widget-surface border-none h-full">
                <div className="absolute -top-24 right-0 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl" />
                <div className="absolute -bottom-24 left-0 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-3xl" />

                <div className="relative h-full flex flex-col z-10">
                    {/* Header */}
                    <div className="widget-header">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/15 shadow-lg shadow-primary/10">
                                <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="widget-kicker">Salud</p>
                                <h3 className="widget-title">Pulso financiero</h3>
                                <p className="widget-subtitle">Analisis de salud en tiempo real</p>
                            </div>
                        </div>
                        <motion.div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${scoreStyle.bg} border border-white/10 shadow-lg ${scoreStyle.glow}`}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Sparkles className={`h-3 w-3 ${scoreStyle.text}`} />
                            <span className={`text-[10px] font-black uppercase ${scoreStyle.text}`}>
                                {getScoreLabel(healthData?.score ?? 0)}
                            </span>
                        </motion.div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col lg:flex-row p-5 gap-6 items-center">
                        {/* Radar Chart Section (Prevention of label overlap) */}
                        <div className="relative w-full lg:w-[240px] aspect-square flex items-center justify-center">
                            <div className="w-full h-full p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="62%" data={healthData?.metrics}>
                                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <Radar
                                            name="Salud"
                                            dataKey="A"
                                            stroke="#818cf8"
                                            strokeWidth={2}
                                            fill="#818cf8"
                                            fillOpacity={0.25}
                                            animationDuration={1500}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Floating Score Display */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <motion.div
                                    className="flex flex-col items-center justify-center w-[84px] h-[84px] rounded-full bg-slate-950 border-[3px] border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.25)] relative overflow-hidden"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 15 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent" />
                                    <span className={`text-3xl font-black leading-none tracking-tighter ${scoreStyle.text}`}>
                                        {healthData?.score}
                                    </span>
                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">Score</span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Metrics Panel */}
                        <div className="flex-1 w-full space-y-3">
                            {/* Compliance Bar Section */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Regla 50/30/20</h4>
                                    <ShieldCheck className="w-3 h-3 text-emerald-400/50" />
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Necesidades', val: healthData?.compliance.needs, target: 50 },
                                        { label: 'Deseos', val: healthData?.compliance.wants, target: 30 },
                                        { label: 'Ahorro', val: healthData?.compliance.savings, target: 20 }
                                    ].map((m, i) => {
                                        const isBad = m.label === 'Ahorro' ? (m.val ?? 0) < m.target * 0.75 : (m.val ?? 0) > m.target * 1.25;
                                        return (
                                            <div key={m.label} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span className="text-white/60">{m.label}</span>
                                                    <span className={isBad ? 'text-rose-400' : 'text-emerald-400'}>
                                                        {Math.round(m.val ?? 0)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full rounded-full ${isBad ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(m.val ?? 0, 100)}%` }}
                                                        transition={{ duration: 1.5, delay: 0.5 + (i * 0.1) }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Liquidity Highlight */}
                            <div className="px-4 py-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-400/10">
                                        <Wallet className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Liquidez (Meses)</p>
                                        <p className="text-xl font-black text-white tracking-tight">
                                            {healthData?.liquidity.ratio.toFixed(1)}x
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-bold px-2 py-1 rounded-md ${(healthData?.liquidity.ratio ?? 0) < 3 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {(healthData?.liquidity.ratio ?? 0) < 3 ? 'Riesgo' : 'Sólido'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}










