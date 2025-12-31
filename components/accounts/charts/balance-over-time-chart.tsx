"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useQuery } from "@tanstack/react-query"
import { TrendingUp } from "lucide-react"

interface BalanceOverTimeChartProps {
    accountId: string
    currencyCode: string
}

export function BalanceOverTimeChart({ accountId, currencyCode }: BalanceOverTimeChartProps) {
    const { data: transactions } = useQuery({
        queryKey: ['transactions', accountId],
        queryFn: async () => {
            const res = await fetch(`/api/transactions?accountId=${accountId}`)
            if (!res.ok) throw new Error('Error fetching transactions')
            return res.json()
        },
    })

    // Calculate running balance over time
    const balanceData = transactions
        ?.sort((a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
        .reduce((acc: any[], transaction: any, index: number) => {
            const previousBalance = index === 0 ? 0 : acc[index - 1].balance
            const amount = Number(transaction.amount)

            let newBalance = previousBalance
            if (transaction.transaction_type === 'INCOME') {
                newBalance += amount
            } else if (transaction.transaction_type === 'EXPENSE') {
                newBalance -= amount
            }

            return [
                ...acc,
                {
                    date: new Date(transaction.transaction_date).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short'
                    }),
                    balance: newBalance,
                    rawDate: transaction.transaction_date
                }
            ]
        }, []) || []

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
                    Evolución del Saldo
                </CardTitle>
                <CardDescription>
                    Últimos 30 movimientos
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No hay datos suficientes para mostrar
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                className="text-xs"
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis
                                className="text-xs"
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(value) => `${currencyCode} ${value.toFixed(0)}`}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                                                <div className="grid gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Fecha
                                                        </span>
                                                        <span className="font-bold">
                                                            {payload[0].payload.date}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                            Saldo
                                                        </span>
                                                        <span className="font-bold text-violet-600">
                                                            {currencyCode} {Number(payload[0].value).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
