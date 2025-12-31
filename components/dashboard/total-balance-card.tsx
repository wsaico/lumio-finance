"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { TrendingUp, TrendingDown, Wallet, Eye, EyeOff, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

export function TotalBalanceCard() {
    const { accounts, isLoading, totalBalanceConverted, balancesByCurrency } = useAccounts()
    const { formatMoney, formatCompactMoney } = useFormat()
    const { currencyCode: baseCurrency } = useSettingsStore()
    const [displayBalance, setDisplayBalance] = useState(0)
    const [isBalanceVisible, setIsBalanceVisible] = useState(true)
    const [viewMode, setViewMode] = useState<'consolidated' | 'separated'>('consolidated')
    const [monthlyData, setMonthlyData] = useState<any>(null)
    const [previousMonthData, setPreviousMonthData] = useState<any>(null)

    // Use converted balance for consolidated view
    const totalBalance = viewMode === 'consolidated' ? totalBalanceConverted : 0

    // Animate balance counting
    useEffect(() => {
        if (isLoading) return

        const duration = 1000 // 1 second
        const steps = 60
        const increment = totalBalance / steps
        let current = 0
        let step = 0

        const timer = setInterval(() => {
            step++
            current += increment
            if (step >= steps) {
                setDisplayBalance(totalBalance)
                clearInterval(timer)
            } else {
                setDisplayBalance(current)
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [totalBalance, isLoading])

    // Fetch monthly income/expense data
    useEffect(() => {
        async function fetchMonthlyData() {
            try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                // Current month
                const res = await fetch(`/api/analytics/monthly-summary?month=${month}&year=${year}`)
                if (res.ok) {
                    const data = await res.json()
                    setMonthlyData(data)
                }

                // Previous month for trend calculation
                const prevMonth = month === 1 ? 12 : month - 1
                const prevYear = month === 1 ? year - 1 : year
                const prevRes = await fetch(`/api/analytics/monthly-summary?month=${prevMonth}&year=${prevYear}`)
                if (prevRes.ok) {
                    const prevData = await prevRes.json()
                    setPreviousMonthData(prevData)
                }
            } catch (err) {
                console.error('Error fetching monthly data:', err)
            }
        }
        fetchMonthlyData()
    }, [])

    // Calculate real trend based on balance change
    const currentBalance = monthlyData ? (monthlyData.totalIncome - monthlyData.totalExpense) : 0
    const previousBalance = previousMonthData ? (previousMonthData.totalIncome - previousMonthData.totalExpense) : 0
    const trend = previousBalance !== 0 ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 : 0

    if (isLoading) {
        return (
            <Card className="relative overflow-hidden border-none shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
                <div className="relative">
                    <CardHeader className="pb-3">
                        <div className="h-4 w-32 bg-white/10 rounded-lg animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-16 w-64 bg-white/10 rounded-lg animate-pulse" />
                    </CardContent>
                </div>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="relative overflow-hidden border-none shadow-2xl hover:shadow-[0_20px_70px_-15px_rgba(139,92,246,0.5)] transition-all duration-500 group">
                {/* Sophisticated Multi-Layer Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />

                {/* Animated Mesh Gradient Overlay */}
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        background: `
                            radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(217, 70, 239, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)
                        `
                    }}
                />

                {/* Animated Gradient Border Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-[1px] rounded-[inherit] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
                </div>

                {/* Floating Particles */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400/30 rounded-full blur-sm"
                        animate={{
                            y: [0, -20, 0],
                            x: [0, 10, 0],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute top-1/2 right-1/3 w-3 h-3 bg-fuchsia-400/20 rounded-full blur-sm"
                        animate={{
                            y: [0, 15, 0],
                            x: [0, -15, 0],
                            opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />
                    <motion.div
                        className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-blue-400/25 rounded-full blur-sm"
                        animate={{
                            y: [0, -10, 0],
                            x: [0, 20, 0],
                            opacity: [0.25, 0.5, 0.25]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    />
                </div>

                {/* Glass Morphism Overlay */}
                <div className="absolute inset-0 backdrop-blur-[1px]" />

                <div className="relative">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
                        <div className="flex items-center gap-2">
                            <motion.div
                                className="p-2 rounded-xl bg-white/10 backdrop-blur-sm"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                <Sparkles className="h-4 w-4 text-purple-300" />
                            </motion.div>
                            <CardTitle className="text-sm font-semibold text-white/90 tracking-wide uppercase">
                                Balance Total
                            </CardTitle>
                        </div>

                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={() => setViewMode(viewMode === 'consolidated' ? 'separated' : 'consolidated')}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-colors text-xs font-medium text-white/70 hover:text-white/90"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {viewMode === 'consolidated' ? 'Por Moneda' : 'Consolidado'}
                            </motion.button>
                            <motion.button
                                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isBalanceVisible ? (
                                    <Eye className="h-4 w-4 text-white/70" />
                                ) : (
                                    <EyeOff className="h-4 w-4 text-white/70" />
                                )}
                            </motion.button>
                        </div>
                    </CardHeader>

                    <CardContent className="px-6 pb-6 space-y-4">
                        {/* Main Balance with Privacy Toggle */}
                        <AnimatePresence mode="wait">
                            {isBalanceVisible ? (
                                <motion.div
                                    key={`balance-${viewMode}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-1"
                                >
                                    {viewMode === 'consolidated' ? (
                                        <>
                                            <motion.div
                                                className="text-5xl md:text-6xl font-bold tracking-tight text-white"
                                                initial={{ scale: 0.5 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                            >
                                                {formatMoney(displayBalance, baseCurrency)}
                                            </motion.div>
                                            <div className="flex items-center gap-2 text-xs text-white/50">
                                                <Wallet className="h-3 w-3" />
                                                <span>Consolidado en {baseCurrency}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            {Object.entries(balancesByCurrency || {}).map(([currency, amount]) => (
                                                <div key={currency} className="flex items-baseline justify-between gap-4">
                                                    <span className="text-sm text-white/60 font-medium">{currency}</span>
                                                    <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                                                        {formatMoney(amount, currency)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="text-xs text-white/50 pt-1 border-t border-white/10">
                                                {Object.keys(balancesByCurrency || {}).length} moneda(s)
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="hidden"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-1"
                                >
                                    <div className="text-5xl md:text-6xl font-bold tracking-tight text-white">
                                        ••••••
                                    </div>
                                    <div className="text-xs text-white/50">
                                        Balance oculto
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Trend Indicator with Premium Design */}
                        <div className="flex items-center gap-3">
                            <motion.div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md ${trend > 0
                                    ? 'bg-emerald-500/20 border border-emerald-400/30'
                                    : 'bg-rose-500/20 border border-rose-400/30'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                {trend > 0 ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-rose-300" />
                                )}
                                <span className={`font-bold text-sm ${trend > 0 ? 'text-emerald-200' : 'text-rose-200'
                                    }`}>
                                    {trend > 0 ? '+' : ''}{trend}%
                                </span>
                            </motion.div>
                            <span className="text-xs text-white/60 font-medium">vs mes anterior</span>
                        </div>

                        {/* Subtle Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                                <div className="text-xs text-white/60 mb-1">Ingresos</div>
                                <div className="text-lg font-bold text-emerald-300">
                                    {monthlyData ? `+${formatCompactMoney(monthlyData.totalIncome)}` : '...'}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                                <div className="text-xs text-white/60 mb-1">Gastos</div>
                                <div className="text-lg font-bold text-rose-300">
                                    {monthlyData ? `-${formatCompactMoney(monthlyData.totalExpense)}` : '...'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </motion.div>
    )
}
