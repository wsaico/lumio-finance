"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PeriodComparisonWidgetProps {
    currentMonth?: Date
}

export function PeriodComparisonWidget({ currentMonth = new Date() }: PeriodComparisonWidgetProps) {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [comparison, setComparison] = useState<any>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const year = currentMonth.getFullYear()
                const month = currentMonth.getMonth() + 1

                // Get last 6 months of data
                const promises = []
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(year, month - 1 - i, 1)
                    const y = d.getFullYear()
                    const m = d.getMonth() + 1
                    promises.push(
                        fetch(`/api/analytics/monthly-summary?month=${m}&year=${y}`)
                            .then(res => res.ok ? res.json() : null)
                    )
                }

                const results = await Promise.all(promises)
                const chartData = results.map((result, index) => {
                    const d = new Date(year, month - 1 - (5 - index), 1)
                    return {
                        month: d.toLocaleDateString('es-PE', { month: 'short' }),
                        income: result?.totalIncome || 0,
                        expense: result?.totalExpense || 0,
                        cashFlow: (result?.totalIncome || 0) - (result?.totalExpense || 0)
                    }
                })

                setData(chartData)

                // Calculate comparison
                if (chartData.length >= 2) {
                    const current = chartData[chartData.length - 1]
                    const previous = chartData[chartData.length - 2]
                    const change = current.cashFlow - previous.cashFlow
                    const percentChange = previous.cashFlow !== 0
                        ? (change / Math.abs(previous.cashFlow)) * 100
                        : 0

                    setComparison({
                        change,
                        percentChange,
                        isPositive: change >= 0
                    })
                }
            } catch (error) {
                console.error('Error fetching period comparison:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [currentMonth])

    if (isLoading) {
        return (
            <Card className="glass border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg font-semibold">Comparación de Períodos</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-muted-foreground">Cargando...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="glass border-none shadow-premium-md">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base md:text-lg font-semibold">Comparación de Períodos</CardTitle>
                    {comparison && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${comparison.isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {comparison.isPositive ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : (
                                <TrendingDown className="h-4 w-4" />
                            )}
                            <span>{comparison.percentChange.toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
                        <XAxis
                            dataKey="month"
                            stroke="currentColor"
                            className="text-muted-foreground text-xs"
                        />
                        <YAxis
                            stroke="currentColor"
                            className="text-muted-foreground text-xs"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="income"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Ingresos"
                            dot={{ fill: '#10b981', r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="expense"
                            stroke="#ef4444"
                            strokeWidth={2}
                            name="Gastos"
                            dot={{ fill: '#ef4444', r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="cashFlow"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Flujo de Caja"
                            dot={{ fill: '#3b82f6', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
