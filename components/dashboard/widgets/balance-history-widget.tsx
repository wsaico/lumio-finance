"use client"

import {
    AreaChart,
    Area,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'
import { useDashboardData } from "@/hooks/useDashboardData"
import { ChartWidgetWrapper } from "./chart-widget-wrapper"
import { useFormat } from "@/hooks/useFormat"
import { Loader2 } from "lucide-react"

export function BalanceHistoryWidget() {
    const { data, isLoading } = useDashboardData()
    const { formatMoney } = useFormat()
    const history = data?.history || []

    if (isLoading) {
        return (
            <ChartWidgetWrapper title="Balance Mensual" subtitle="Cargando datos...">
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </ChartWidgetWrapper>
        )
    }

    return (
        <ChartWidgetWrapper title="Balance Mensual" subtitle="Historico de flujo neto (6 meses)">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.1)" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        dy={10}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '10px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [formatMoney(value), 'Balance']}
                    />
                    <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        strokeWidth={2}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartWidgetWrapper>
    )
}
