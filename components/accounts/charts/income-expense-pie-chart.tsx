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
        .filter((t: any) => t.transactionType === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const totalExpenses = transactions
        .filter((t: any) => t.transactionType === 'EXPENSE')
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
                        <div className="relative h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={5}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-3 shadow-xl ring-1 ring-border/50">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full" style={{ background: payload[0].payload.color }} />
                                                                <span className="text-xs font-medium text-muted-foreground uppercase">
                                                                    {payload[0].name}
                                                                </span>
                                                            </div>
                                                            <span className="text-lg font-bold">
                                                                {currencyCode} {Number(payload[0].value).toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {((Number(payload[0].value) / total) * 100).toFixed(1)}% del total
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Central Text */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Flujo</span>
                                    <div className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {netBalance >= 0 ? '+' : ''}{currencyCode} {Math.abs(netBalance).toFixed(0)}
                                    </div>
                                </div>
                            </div>
                        </div>

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
