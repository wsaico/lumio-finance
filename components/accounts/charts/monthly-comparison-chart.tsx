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
        const date = new Date(transaction.transactionDate)
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
        if (transaction.transactionType === 'INCOME') {
            acc[monthKey].ingresos += amount
        } else if (transaction.transactionType === 'EXPENSE') {
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
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickFormatter={(value) => `${currencyCode} ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-xl ring-1 ring-border/50">
                                                <div className="grid gap-3">
                                                    <div className="font-semibold text-sm border-b pb-2">{label}</div>
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between gap-8">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="h-2 w-2 rounded-full"
                                                                    style={{ backgroundColor: entry.color }}
                                                                />
                                                                <span className="text-xs text-muted-foreground uppercase font-medium">
                                                                    {entry.name}
                                                                </span>
                                                            </div>
                                                            <span className="font-bold font-mono">
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
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{
                                    paddingBottom: '20px',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}
                            />
                            <Bar
                                dataKey="Ingresos"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                            <Bar
                                dataKey="Gastos"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {/* Summary */}
                {chartData.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Promedio Ingresos</p>
                            <p className="text-xl font-bold text-emerald-600">
                                {currencyCode} {(chartData.reduce((sum, item) => sum + item.Ingresos, 0) / chartData.length).toFixed(0)}
                                <span className="text-xs text-muted-foreground/60 font-medium ml-1">/mes</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Promedio Gastos</p>
                            <p className="text-xl font-bold text-red-600">
                                {currencyCode} {(chartData.reduce((sum, item) => sum + item.Gastos, 0) / chartData.length).toFixed(0)}
                                <span className="text-xs text-muted-foreground/60 font-medium ml-1">/mes</span>
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
