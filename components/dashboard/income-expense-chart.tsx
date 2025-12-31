"use client"

import { useState, useEffect } from "react"
import { useFormat } from "@/hooks/use-format"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts"
import { motion } from "framer-motion"

export function IncomeExpenseChart() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const { formatCompactMoney } = useFormat()

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch last 6 months of data
                const now = new Date()
                const monthsData = []

                for (let i = 5; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
                    const month = date.getMonth() + 1
                    const year = date.getFullYear()

                    const res = await fetch(`/api/analytics/monthly-summary?month=${month}&year=${year}`)
                    if (res.ok) {
                        const json = await res.json()
                        monthsData.push({
                            name: date.toLocaleDateString('es-ES', { month: 'short' }),
                            income: json.totalIncome || 0,
                            expense: json.totalExpense || 0,
                        })
                    }
                }

                setData(monthsData)
            } catch (err) {
                console.error('Error fetching chart data:', err)
                // Show empty data instead of mock data
                setData([])
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass p-3 rounded-lg shadow-premium-md">
                    <p className="font-semibold text-sm mb-2">{payload[0].payload.name}</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full gradient-income" />
                            <span className="text-muted-foreground">Ingresos:</span>
                            <span className="font-semibold">{formatCompactMoney(payload[0].value)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-full gradient-expense" />
                            <span className="text-muted-foreground">Gastos:</span>
                            <span className="font-semibold">{formatCompactMoney(payload[1].value)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Balance:</span>
                            <span className={`font-bold ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCompactMoney(payload[0].value - payload[1].value)}
                            </span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    if (loading) {
        return (
            <div className="w-full h-[300px] flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="oklch(0.6 0.19 145)" stopOpacity={0.7} />
                        </linearGradient>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="oklch(0.68 0.22 12)" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="oklch(0.58 0.24 12)" stopOpacity={0.7} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="currentColor"
                        className="text-border/30"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="name"
                        stroke="currentColor"
                        className="text-muted-foreground"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />

                    <YAxis
                        stroke="currentColor"
                        className="text-muted-foreground"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCompactMoney(value)}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'transparent' }}
                    />

                    <Bar
                        dataKey="income"
                        fill="url(#incomeGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                    />

                    <Bar
                        dataKey="expense"
                        fill="url(#expenseGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded gradient-income" />
                    <span className="text-xs font-medium text-muted-foreground">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded gradient-expense" />
                    <span className="text-xs font-medium text-muted-foreground">Gastos</span>
                </div>
            </div>
        </motion.div>
    )
}
