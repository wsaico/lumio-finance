"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useQuery } from "@tanstack/react-query"
import { TrendingUp } from "lucide-react"

interface BalanceOverTimeChartProps {
    transactions: any[]
    currencyCode: string
    currentBalance?: number
    accountType?: string
    creditLimit?: number
}

export function BalanceOverTimeChart({
    transactions,
    currencyCode,
    currentBalance,
    accountType,
    creditLimit
}: BalanceOverTimeChartProps) {
    const isCreditCard = accountType === 'CREDIT_CARD'

    // Calculate running balance over time
    // We sort oldest to newest
    const sortedTransactions = [...(transactions || [])].sort(
        (a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    )

    // To show ABSOLUTE balance, we need to know the starting point.
    // If currentBalance is provided, it represents the balance AFTER the very last transaction in the list.
    // So: InitialBalanceForPeriod = currentBalance - SumOfAllNetChangesInList
    let runningBalance = 0

    if (currentBalance !== undefined) {
        const netChange = sortedTransactions.reduce((sum: number, t: any) => {
            const amt = Number(t.amount)
            if (t.transactionType === 'INCOME') return sum + amt
            // Treat EXPENSE and TRANSFER as outgoing
            return sum - amt
        }, 0)
        runningBalance = currentBalance - netChange
    }

    const balanceData = sortedTransactions.map((transaction: any) => {
        const amount = Number(transaction.amount)

        if (transaction.transactionType === 'INCOME') {
            runningBalance += amount
        } else {
            // EXPENSE or TRANSFER
            runningBalance -= amount
        }

        // For Credit Cards, we calculate "Available Credit" instead of raw debt
        const displayBalance = isCreditCard
            ? (Number(creditLimit || 0) + runningBalance) // runningBalance is negative debt, so Limit + (-Debt) = Available
            : runningBalance

        return {
            date: new Date(transaction.transactionDate).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short'
            }),
            balance: displayBalance,
            rawDate: transaction.transactionDate
        }
    })

    // Group by date and take last balance of each day
    const dailyBalance = balanceData.reduce((acc: any[], item: any) => {
        const existingDay = acc.find(d => d.date === item.date)
        if (existingDay) {
            existingDay.balance = item.balance
        } else {
            acc.push(item)
        }
        return acc
    }, [])

    // Take last 30 days
    const chartData = dailyBalance.slice(-30)

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {isCreditCard ? "Evolución de Crédito Disponible" : "Evolución del Saldo"}
                </CardTitle>
                <CardHeader>
                    {isCreditCard ? "Historial de disponibilidad de línea" : "Últimos 30 movimientos"}
                </CardHeader>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No hay datos suficientes para mostrar
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickFormatter={(value) => `${currencyCode} ${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}`}
                                dx={-10}
                            />
                            {/* Trigger rebuild */}
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-xl ring-1 ring-border/50">
                                                <div className="grid gap-1">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground font-medium tracking-wider">
                                                        {payload[0].payload.date}
                                                    </span>
                                                    <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                                        {isCreditCard ? "Disponible: " : ""}{currencyCode} {Number(payload[0].value).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#10b981"
                                strokeWidth={3}
                                fill="url(#colorBalance)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
