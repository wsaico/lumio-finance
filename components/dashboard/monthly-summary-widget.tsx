"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormat } from "@/hooks/useFormat"
import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function MonthlySummaryWidget() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { formatMoney, formatCompactMoney } = useFormat()

    useEffect(() => {
        const controller = new AbortController()

        async function fetchData() {
            try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                const res = await fetch(`/api/analytics/monthly-summary?month=${month}&year=${year}`, {
                    signal: controller.signal
                })
                if (!res.ok) throw new Error('Failed to fetch')

                const json = await res.json()
                setData(json)
            } catch (err: any) {
                if (err.name === 'AbortError') return
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        return () => controller.abort()
    }, [])

    if (loading) return (
        <Card className="glass h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resumen Mensual</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                </div>
            </CardContent>
        </Card>
    )

    if (!data) return null

    const balance = data.totalIncome - data.totalExpense
    const isPositive = balance >= 0

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="h-full"
        >
            <Card className="glass h-full border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Resumen Mensual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Income */}
                    <motion.div
                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Ingresos</p>
                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCompactMoney(data.totalIncome)}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Expenses */}
                    <motion.div
                        className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-rose-500/10">
                                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Gastos</p>
                                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                    {formatCompactMoney(data.totalExpense)}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Balance */}
                    <motion.div
                        className={`flex items-center justify-between p-3 rounded-xl ${isPositive
                            ? 'bg-blue-500/5 border border-blue-500/10'
                            : 'bg-amber-500/5 border border-amber-500/10'
                            }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isPositive ? 'bg-blue-500/10' : 'bg-amber-500/10'
                                }`}>
                                <ArrowUpDown className={`w-4 h-4 ${isPositive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                    }`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Balance</p>
                                <p className={`text-lg font-bold ${isPositive
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                    {isPositive ? '+' : ''}{formatCompactMoney(balance)}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Transaction Count */}
                    <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground text-center">
                            {data.transactionCount || 0} transacciones este mes
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
