"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { Lightbulb, AlertTriangle, TrendingUp, Wallet, Target, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function SmartInsightsWidget() {
    const { showPettyCashIndicators } = useSettingsStore()
    const [insights, setInsights] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchInsights() {
            try {
                // In a real app, this would call /api/analytics/insights
                // For now, generate smart insights based on available data
                const newInsights = []

                // Fetch current month summary for insights
                const now = new Date()
                const res = await fetch(`/api/analytics/monthly-summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)

                if (res.ok) {
                    const data = await res.json()

                    // Savings Rate Insight
                    const savingsRate = data.totalIncome > 0 ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100 : 0
                    if (savingsRate >= 15) {
                        newInsights.push({
                            type: 'success',
                            icon: TrendingUp,
                            title: 'Excelente Ahorro',
                            message: `Estás ahorrando el ${savingsRate.toFixed(1)}% de tus ingresos. ¡Sigue así!`
                        })
                    } else if (savingsRate < 10 && savingsRate > 0) {
                        newInsights.push({
                            type: 'warning',
                            icon: AlertTriangle,
                            title: 'Bajo Nivel de Ahorro',
                            message: `Solo estás ahorrando el ${savingsRate.toFixed(1)}%. Intenta reducir gastos no esenciales.`
                        })
                    }

                    // Spending Trend
                    if (data.totalExpense > data.totalIncome) {
                        newInsights.push({
                            type: 'warning',
                            icon: AlertTriangle,
                            title: 'Gastos Exceden Ingresos',
                            message: 'Tus gastos superan tus ingresos este mes. Revisa tus presupuestos.'
                        })
                    }
                }

                // Budget Goal Insight
                newInsights.push({
                    type: 'info',
                    icon: Target,
                    title: 'Metas Financieras',
                    message: 'Revisa tus objetivos de ahorro para mantener el rumbo.'
                })

                // Petty Cash Insight (if enabled)
                if (showPettyCashIndicators) {
                    newInsights.push({
                        type: 'info',
                        icon: Wallet,
                        title: 'Caja Chica',
                        message: 'Recuerda rendir tus gastos de caja chica pendientes.'
                    })
                }

                setInsights(newInsights.slice(0, 3)) // Show max 3 insights
            } catch (err) {
                console.error('Error generating insights:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchInsights()
    }, [showPettyCashIndicators])

    if (loading) return null

    if (!insights.length) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="h-full"
        >
            <Card className="h-full border-none shadow-premium-md glass">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>Insights Inteligentes</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {insights.map((insight, idx) => (
                        <motion.div
                            key={idx}
                            className="flex gap-3 items-start p-3 rounded-xl bg-card/40 hover:bg-card/60 transition-all duration-200 border border-transparent hover:border-border/30"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + (idx * 0.1) }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className={`mt-0.5 p-2 rounded-full shrink-0 ${insight.type === 'warning' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                insight.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                    'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}>
                                <insight.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold mb-0.5">{insight.title}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {insight.message}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    )
}
