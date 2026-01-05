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
        const controller = new AbortController()

        async function fetchMonthlyData() {
            try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                // Current month with timeout
                const timeoutId = setTimeout(() => controller.abort(), 15000)

                const res = await fetch(`/api/analytics/monthly-summary?month=${month}&year=${year}`, {
                    signal: controller.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    setMonthlyData(data)
                }

                // Previous month for trend calculation
                const prevMonth = month === 1 ? 12 : month - 1
                const prevYear = month === 1 ? year - 1 : year
                const prevRes = await fetch(`/api/analytics/monthly-summary?month=${prevMonth}&year=${prevYear}`, {
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                if (prevRes.ok) {
                    const prevData = await prevRes.json()
                    setPreviousMonthData(prevData)
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return
                console.error('Error fetching monthly data:', err)
            }
        }
        fetchMonthlyData()

        return () => controller.abort()
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
            <Card className="widget-surface border-none h-full">
                <div className="absolute -top-24 right-0 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
                <div className="absolute -bottom-24 left-0 h-32 w-32 rounded-full bg-indigo-400/15 blur-3xl" />

                <div className="relative">
                    <CardHeader className="widget-header">
                        <div className="flex items-center gap-2">
                            <motion.div
                                className="p-2 rounded-xl bg-white/5 border border-white/10"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                <Sparkles className="h-4 w-4 text-primary" />
                            </motion.div>
                            <CardTitle className="text-xs font-bold text-muted-foreground tracking-[0.25em] uppercase">
                                Balance Total
                            </CardTitle>
                        </div>

                        <div className="flex items-center gap-2">
                            <motion.button
                                onClick={() => setViewMode(viewMode === 'consolidated' ? 'separated' : 'consolidated')}
                                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {viewMode === 'consolidated' ? 'Por Moneda' : 'Consolidado'}
                            </motion.button>
                            <motion.button
                                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                                className="p-2 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isBalanceVisible ? (
                                    <Eye className="h-4 w-4" />
                                ) : (
                                    <EyeOff className="h-4 w-4" />
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
                                                className="text-4xl md:text-5xl font-bold tracking-tight text-foreground"
                                                initial={{ scale: 0.5 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                            >
                                                {formatMoney(displayBalance, baseCurrency)}
                                            </motion.div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Wallet className="h-3 w-3" />
                                                <span>Consolidado en {baseCurrency}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            {Object.entries(balancesByCurrency || {}).map(([currency, amount]) => (
                                                <div key={currency} className="flex items-baseline justify-between gap-4">
                                                    <span className="text-sm text-muted-foreground font-bold">{currency}</span>
                                                    <span className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
                                                        {formatMoney(amount as number, currency)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest pt-2 border-t border-border">
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
                                    <div className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">******</div>
                                    <div className="text-xs text-muted-foreground">
                                        Balance oculto
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Trend Indicator with Premium Design */}
                        <div className="flex items-center gap-3">
                            <motion.div
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${trend > 0
                                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                                    : 'bg-rose-500/10 border border-rose-500/20'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                {trend > 0 ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                                )}
                                <span className={`font-black text-sm ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                                </span>
                            </motion.div>
                            <span className="text-xs text-muted-foreground font-bold italic">vs mes anterior</span>
                        </div>

                        {/* Subtle Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ingresos</div>
                                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                    {monthlyData ? `+${formatCompactMoney(monthlyData.totalIncome)}` : '...'}
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Gastos</div>
                                <div className="text-lg font-black text-rose-600 dark:text-rose-400">
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


