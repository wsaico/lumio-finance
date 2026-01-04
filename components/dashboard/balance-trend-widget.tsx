"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { useFormat } from "@/hooks/use-format"

export function BalanceTrendWidget() {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [change, setChange] = useState<{ value: number, percent: number } | null>(null)
    const { currencyCode } = useSettingsStore() // Get global currency
    const { getCurrencySymbol } = useFormat() // Assume this helper exists or just map manually if not

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/analytics/balance-trend?months=6')
                if (res.ok) {
                    const result = await res.json()
                    setData(result)

                    if (result.length >= 2) {
                        const current = result[result.length - 1].balance
                        const previous = result[result.length - 2].balance
                        const diff = current - previous
                        const percent = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 0

                        setChange({ value: diff, percent })
                    }
                }
            } catch (error) {
                console.error('Error fetching balance trend:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [])

    if (isLoading) {
        return (
            <Card className="glass border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg font-semibold">Tendencia de Saldo</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <div className="animate-pulse text-muted-foreground">Cargando...</div>
                </CardContent>
            </Card>
        )
    }

    const isPositive = change && change.value >= 0

    return (
        <Card className="glass border-none shadow-premium-md">
            <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base md:text-lg font-semibold">Tendencia de Saldo</CardTitle>
                    {change && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span>{Math.abs(change.percent).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
                <div className="mt-1">
                    <span className="text-2xl font-bold">
                        {data[data.length - 1]?.balance.toLocaleString('es-PE', { style: 'currency', currency: currencyCode })}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">vs mes anterior</span>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-border/30" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            dy={10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            formatter={(value: any) => [
                                Number(value || 0).toLocaleString('es-PE', { style: 'currency', currency: currencyCode }),
                                'Saldo'
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
