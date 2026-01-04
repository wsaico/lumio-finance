"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useSettingsStore } from "@/hooks/use-settings-store"

interface CashFlowAreaChartProps {
    data: { name: string, income: number, expense: number }[]
}

export function CashFlowAreaChart({ data = [] }: CashFlowAreaChartProps) {
    const { currencyCode } = useSettingsStore()
    const symbol = currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : 'S/'
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-xs font-semibold uppercase tracking-widest border border-dashed border-muted-foreground/20 rounded-2xl bg-muted/5">
                Datos insuficientes para tendencia
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    stroke="#666"
                    fontSize={10}
                    fontWeight="bold"
                    tick={{ fill: '#888' }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    stroke="#666"
                    fontSize={10}
                    fontWeight="bold"
                    tick={{ fill: '#888' }}
                    tickFormatter={(value) => `${symbol} ${value}`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        color: '#fff',
                        fontSize: '11px'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    strokeWidth={3}
                    name="Ingresos"
                    animationDuration={1500}
                />
                <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f43f5e"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                    strokeWidth={3}
                    name="Gastos"
                    animationDuration={1500}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
