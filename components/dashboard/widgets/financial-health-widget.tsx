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
    const { accounts, totalBalanceConverted } = useAccounts()
    const { formatCompactMoney } = useFormat()
    const [healthData, setHealthData] = useState<HealthData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function calculateHealth() {
            try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                const ruleRes = await fetch(`/api/analytics/budget-rule?month=${month}&year=${year}`)
                const ruleData = await ruleRes.json()

                const liquidAssets = accounts
                    ?.filter((a: any) => ['BANK', 'CASH', 'DIGITAL', 'SAVINGS'].includes(a.accountType) && Number(a.balance) > 0)
                    .reduce((sum: number, a: any) => sum + Number(a.balance || 0), 0) || 0

                const liabilities = accounts
                    ?.filter((a: any) => a.accountType === 'CREDIT_CARD')
                    .reduce((sum: number, a: any) => sum + Number(a.usedBalance || 0), 0) || 0

                let liquidityScore = 100
                if (liabilities > 0) {
                    const ratio = liquidAssets / liabilities
                    if (ratio >= 3) liquidityScore = 100
                    else if (ratio >= 1) liquidityScore = 50 + ((ratio - 1) / 2) * 50
                    else liquidityScore = Math.max(10, ratio * 50)
                }

                const debtRatio = totalBalanceConverted > 0 ? (liabilities / totalBalanceConverted) * 100 : 0
                const debtScore = Math.max(0, 100 - debtRatio * 2)

                if (!ruleData || !ruleData.needs || !ruleData.wants || !ruleData.savings) {
                    setHealthData({
                        score: 50,
                        metrics: [
                            { subject: 'Necesidades', A: 50, fullMark: 100 },
                            { subject: 'Deseos', A: 50, fullMark: 100 },
                            { subject: 'Ahorro', A: 50, fullMark: 100 },
                            { subject: 'Liquidez', A: liquidityScore, fullMark: 100 },
                            { subject: 'Deuda', A: debtScore, fullMark: 100 },
                        ],
                        compliance: { needs: 0, wants: 0, savings: 0 },
                        liquidity: { ratio: liabilities > 0 ? liquidAssets / liabilities : 999, liquidAssets, liabilities }
                    })
                    return
                }

                const needsPercent = ruleData.needs.percentage || 0
                const needsScore = needsPercent <= 50 ? 100 : Math.max(0, 100 - (needsPercent - 50) * 2)

                const wantsPercent = ruleData.wants.percentage || 0
                const wantsScore = wantsPercent <= 30 ? 100 : Math.max(0, 100 - (wantsPercent - 30) * 3)

                const savingsPercent = ruleData.savings.percentage || 0
                const savingsScore = Math.min(100, (savingsPercent / 20) * 100)

                const totalScore = Math.round(
                    (needsScore * 0.25) + (wantsScore * 0.20) + (savingsScore * 0.25) +
                    (liquidityScore * 0.15) + (debtScore * 0.15)
                )

                setHealthData({
                    score: totalScore,
                    metrics: [
                        { subject: 'Necesidades', A: needsScore, fullMark: 100 },
                        { subject: 'Deseos', A: wantsScore, fullMark: 100 },
                        { subject: 'Ahorro', A: savingsScore, fullMark: 100 },
                        { subject: 'Liquidez', A: liquidityScore, fullMark: 100 },
                        { subject: 'Deuda', A: debtScore, fullMark: 100 },
                    ],
                    compliance: { needs: needsPercent, wants: wantsPercent, savings: savingsPercent },
                    liquidity: { ratio: liabilities > 0 ? liquidAssets / liabilities : 999, liquidAssets, liabilities }
                })
            } catch (err) {
                console.error("Health calc error", err)
            } finally {
                setLoading(false)
            }
        }
        calculateHealth()
    }, [accounts, totalBalanceConverted])

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
            <Card className="relative overflow-hidden border-none h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
                <div className="relative p-6 h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Activity className="h-8 w-8 text-indigo-400" />
                        </motion.div>
                        <span className="text-white/60 text-sm">Analizando salud financiera...</span>
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
            <Card className="relative overflow-hidden border-none h-full shadow-2xl">
                {/* Premium Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />

                {/* Animated Gradient Orbs */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute -bottom-20 -left-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl"
                        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />
                </div>

                <div className="relative h-full flex flex-col">
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/20">
                                <Activity className="h-4 w-4 text-indigo-400" />
                            </div>
                            <h3 className="font-bold text-sm text-white/90 uppercase tracking-wider">Pulso Financiero</h3>
                        </div>
                        <motion.div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${scoreStyle.bg} border border-white/10`}
                            whileHover={{ scale: 1.05 }}
                        >
                            <Sparkles className={`h-3 w-3 ${scoreStyle.text}`} />
                            <span className={`text-xs font-bold ${scoreStyle.text}`}>{getScoreLabel(healthData?.score ?? 0)}</span>
                        </motion.div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
                        {/* Score Circle & Chart */}
                        <div className="flex-1 relative flex items-center justify-center min-h-[180px]">
                            {/* Central Score */}
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <motion.div
                                    className={`flex flex-col items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${scoreStyle.bg} backdrop-blur-sm border border-white/10 shadow-lg ${scoreStyle.glow}`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", delay: 0.2 }}
                                >
                                    <span className={`text-2xl font-black ${scoreStyle.text}`}>{healthData?.score ?? 0}</span>
                                    <span className="text-[10px] text-white/50 font-medium">/ 100</span>
                                </motion.div>
                            </div>

                            {/* Radar Chart */}
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={healthData?.metrics}>
                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 500 }}
                                    />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Score"
                                        dataKey="A"
                                        stroke="url(#radarGradient)"
                                        strokeWidth={2}
                                        fill="url(#radarFill)"
                                        fillOpacity={0.4}
                                    />
                                    <defs>
                                        <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" />
                                            <stop offset="100%" stopColor="#c084fc" />
                                        </linearGradient>
                                        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#c084fc" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Stats Panel */}
                        <div className="lg:w-[140px] space-y-2">
                            {/* 50/30/20 Stats */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Regla 50/30/20</div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-white/60">Necesidades</span>
                                        <span className={`text-[11px] font-bold ${(healthData?.compliance?.needs ?? 0) > 55 ? "text-rose-400" : "text-emerald-400"}`}>
                                            {(healthData?.compliance?.needs ?? 0).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${(healthData?.compliance?.needs ?? 0) > 55 ? "bg-rose-500" : "bg-emerald-500"}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(healthData?.compliance?.needs ?? 0, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-white/60">Deseos</span>
                                        <span className={`text-[11px] font-bold ${(healthData?.compliance?.wants ?? 0) > 35 ? "text-rose-400" : "text-emerald-400"}`}>
                                            {(healthData?.compliance?.wants ?? 0).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${(healthData?.compliance?.wants ?? 0) > 35 ? "bg-rose-500" : "bg-emerald-500"}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(healthData?.compliance?.wants ?? 0, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.4 }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-white/60">Ahorro</span>
                                        <span className={`text-[11px] font-bold ${(healthData?.compliance?.savings ?? 0) < 15 ? "text-rose-400" : "text-emerald-400"}`}>
                                            {(healthData?.compliance?.savings ?? 0).toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${(healthData?.compliance?.savings ?? 0) < 15 ? "bg-rose-500" : "bg-emerald-500"}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(healthData?.compliance?.savings ?? 0, 100)}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Liquidity */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Wallet className="h-3 w-3 text-indigo-400" />
                                    <span className="text-[10px] text-white/40 font-semibold uppercase">Liquidez</span>
                                </div>
                                <div className={`text-lg font-black ${
                                    (healthData?.liquidity?.ratio ?? 0) < 1 ? "text-rose-400" :
                                    (healthData?.liquidity?.ratio ?? 0) < 2 ? "text-amber-400" : "text-emerald-400"
                                }`}>
                                    {healthData?.liquidity ? (healthData.liquidity.ratio >= 100 ? '∞' : `${healthData.liquidity.ratio.toFixed(1)}x`) : '-'}
                                </div>
                                {(healthData?.liquidity?.ratio ?? 999) < 1 && (
                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-rose-400">
                                        <AlertTriangle className="h-3 w-3" />
                                        <span>Riesgo alto</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}
