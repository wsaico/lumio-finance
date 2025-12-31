"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { PieChartIcon } from "lucide-react"

interface IncomeExpensePieChartProps {
    transactions: any[]
    currencyCode: string
}

const COLORS = {
    income: '#10b981', // emerald-500
    expense: '#ef4444', // red-500
}

export function IncomeExpensePieChart({ transactions, currencyCode }: IncomeExpensePieChartProps) {
    const totalIncome = transactions
        .filter((t: any) => t.transaction_type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const totalExpenses = transactions
        .filter((t: any) => t.transaction_type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const data = [
        { name: 'Ingresos', value: totalIncome, color: COLORS.income },
        { name: 'Gastos', value: totalExpenses, color: COLORS.expense },
    ].filter(item => item.value > 0)

    const total = totalIncome + totalExpenses
    const netBalance = totalIncome - totalExpenses

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Ingresos vs Gastos
                </CardTitle>
                <CardDescription>
                    Distribución total de movimientos
                </CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No hay transacciones para mostrar
                    </div>
                ) : (
                    <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="rounded-lg border bg-background p-3 shadow-lg">
                                                    <div className="grid gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                {payload[0].name}
                                                            </span>
                                                            <span className="font-bold" style={{ color: payload[0].payload.color }}>
                                                                {currencyCode} {Number(payload[0].value).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                                Porcentaje
                                                            </span>
                                                            <span className="font-bold">
                                                                {((Number(payload[0].value) / total) * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return null
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                                <p className="text-xs text-muted-foreground">Ingresos</p>
                                <p className="text-lg font-bold text-emerald-600">
                                    {currencyCode} {totalIncome.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Gastos</p>
                                <p className="text-lg font-bold text-red-600">
                                    {currencyCode} {totalExpenses.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Neto</p>
                                <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {currencyCode} {netBalance.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
