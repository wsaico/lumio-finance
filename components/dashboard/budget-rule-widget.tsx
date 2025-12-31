"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormat } from "@/hooks/use-format"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"

export function BudgetRuleWidget() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { formatMoney, formatPercentage } = useFormat()

    // Fetch Data
    useEffect(() => {
        async function fetchData() {
            try {
                const now = new Date()
                const month = now.getMonth() + 1
                const year = now.getFullYear()

                const res = await fetch(`/api/analytics/budget-rule?month=${month}&year=${year}`)
                if (!res.ok) throw new Error('Failed to fetch')

                const json = await res.json()
                setData(json.analysis)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return (
        <Card className="glass h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Regla 50/30/20</CardTitle>
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

    // If method is NOT 50_30_20, show message to enable it
    if (data.budgetingMethod !== '50_30_20') {
        return (
            <Card className="glass h-full border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Regla 50/30/20</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-sm text-muted-foreground mb-2">
                        La regla 50/30/20 no está activa
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Activa este método en Configuración para ver el análisis detallado
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Prepare chart data
    const chartData = [
        {
            name: 'Necesidades',
            value: data.needs.percent,
            amount: data.needs.amount,
            ideal: 50,
            color: '#3b82f6' // Blue
        },
        {
            name: 'Deseos',
            value: data.wants.percent,
            amount: data.wants.amount,
            ideal: 30,
            color: '#a855f7' // Purple
        },
        {
            name: 'Ahorros',
            value: data.savings.percent,
            amount: data.savings.amount,
            ideal: 20,
            color: '#10b981' // Emerald
        },
    ]

    const COLORS = chartData.map(d => d.color)

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="glass p-3 rounded-lg shadow-premium-md">
                    <p className="font-semibold text-sm mb-1">{data.name}</p>
                    <p className="text-xs text-muted-foreground">
                        Gastado: {formatMoney(data.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Porcentaje: {formatPercentage(data.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Ideal: {formatPercentage(data.ideal)}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="h-full"
        >
            <Card className="glass h-full border-none shadow-premium-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span>Regla 50/30/20</span>
                        <span className="text-xs text-muted-foreground font-normal">(Mensual)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Donut Chart */}
                    <div className="relative">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-2xl font-bold">
                                    {formatMoney(data.totalIncome)}
                                </div>
                                <div className="text-xs text-muted-foreground">Ingresos</div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="space-y-3">
                        {/* NEEDS */}
                        <motion.div
                            className="space-y-1.5"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartData[0].color }} />
                                    <span className="font-medium">Necesidades (50%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={data.needs.status === 'WARNING' ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                        {formatPercentage(data.needs.percent)}
                                    </span>
                                    {data.needs.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                    {data.needs.status === 'OK' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: chartData[0].color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(data.needs.percent, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{formatMoney(data.needs.amount)}</p>
                        </motion.div>

                        {/* WANTS */}
                        <motion.div
                            className="space-y-1.5"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartData[1].color }} />
                                    <span className="font-medium">Deseos (30%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={data.wants.status === 'WARNING' ? "text-amber-500 font-bold" : "text-muted-foreground"}>
                                        {formatPercentage(data.wants.percent)}
                                    </span>
                                    {data.wants.status === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                    {data.wants.status === 'OK' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: chartData[1].color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(data.wants.percent, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{formatMoney(data.wants.amount)}</p>
                        </motion.div>

                        {/* SAVINGS */}
                        <motion.div
                            className="space-y-1.5"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartData[2].color }} />
                                    <span className="font-medium">Ahorros (20%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={data.savings.percent >= 20 ? "text-emerald-500 font-bold" : "text-muted-foreground"}>
                                        {formatPercentage(data.savings.percent)}
                                    </span>
                                    {data.savings.percent >= 20 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    {data.savings.percent < 20 && <Info className="w-3.5 h-3.5 text-muted-foreground" />}
                                </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: chartData[2].color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(data.savings.percent, 100)}%` }}
                                    transition={{ duration: 1, delay: 0.7 }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{formatMoney(data.savings.amount)}</p>
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
