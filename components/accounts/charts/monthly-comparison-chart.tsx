"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3 } from "lucide-react"

interface MonthlyComparisonChartProps {
    transactions: any[]
    currencyCode: string
}

export function MonthlyComparisonChart({ transactions, currencyCode }: MonthlyComparisonChartProps) {
    // Group transactions by month
    const monthlyData = transactions.reduce((acc: any, transaction: any) => {
        const date = new Date(transaction.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })

        if (!acc[monthKey]) {
            acc[monthKey] = {
                month: monthName,
                monthKey,
                ingresos: 0,
                gastos: 0,
                date: date.getTime()
            }
        }

        const amount = Number(transaction.amount)
        if (transaction.transaction_type === 'INCOME') {
            acc[monthKey].ingresos += amount
        } else if (transaction.transaction_type === 'EXPENSE') {
            acc[monthKey].gastos += amount
        }

        return acc
    }, {})

    // Convert to array and sort by date
    const chartData = Object.values(monthlyData)
        .sort((a: any, b: any) => a.date - b.date)
        .slice(-12) // Last 12 months
        .map((item: any) => ({
            month: item.month,
            Ingresos: Number(item.ingresos.toFixed(2)),
            Gastos: Number(item.gastos.toFixed(2)),
            Neto: Number((item.ingresos - item.gastos).toFixed(2))
        }))

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Comparación Mensual
                </CardTitle>
                <CardDescription>
                    Ingresos vs Gastos por mes (últimos 12 meses)
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        No hay datos suficientes para mostrar
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="month"
                                className="text-xs"
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => `${currencyCode} ${value.toFixed(0)}`}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-4 shadow-lg">
                                                <div className="grid gap-3">
                                                    <div className="font-semibold">{label}</div>
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="h-3 w-3 rounded-full"
                                                                    style={{ backgroundColor: entry.color }}
                                                                />
                                                                <span className="text-sm text-muted-foreground">
                                                                    {entry.name}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold">
                                                                {currencyCode} {Number(entry.value).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Legend
                                wrapperStyle={{
                                    paddingTop: '20px'
                                }}
                            />
                            <Bar
                                dataKey="Ingresos"
                                fill="#10b981"
                                radius={[8, 8, 0, 0]}
                            />
                            <Bar
                                dataKey="Gastos"
                                fill="#ef4444"
                                radius={[8, 8, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {/* Summary */}
                {chartData.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                        <div>
                            <p className="text-xs text-muted-foreground">Promedio Ingresos/mes</p>
                            <p className="text-lg font-bold text-emerald-600">
                                {currencyCode} {(chartData.reduce((sum, item) => sum + item.Ingresos, 0) / chartData.length).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Promedio Gastos/mes</p>
                            <p className="text-lg font-bold text-red-600">
                                {currencyCode} {(chartData.reduce((sum, item) => sum + item.Gastos, 0) / chartData.length).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Mejor Mes</p>
                            <p className="text-lg font-bold text-violet-600">
                                {chartData.reduce((best, item) => item.Neto > best.Neto ? item : best, chartData[0]).month}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
