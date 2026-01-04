
"use client"

import { Card } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { useFormat } from "@/hooks/use-format"
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts"
import { Loader2, Activity, TrendingUp, TrendingDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function DailyVolatilityWidget() {
    const { formatMoney } = useFormat()

    const { data, isLoading } = useQuery({
        queryKey: ['daily-volatility'],
        queryFn: async () => {
            const res = await fetch('/api/analytics/daily-volatility')
            if (!res.ok) throw new Error('Failed')
            return res.json()
        }
    })

    if (isLoading) {
        return (
            <Card className="widget-surface h-full flex items-center justify-center p-5">
                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
            </Card>
        )
    }

    const { history, avg, todayData, lastActive, yesterdayData } = data || {
        history: [],
        avg: 0,
        todayData: { amount: 0 },
        lastActive: 0,
        yesterdayData: { amount: 0 }
    }

    const displayAmount = todayData?.amount > 0 ? todayData.amount : lastActive
    const diff = displayAmount - avg

    // The original `isHighVolatility` logic is removed by the edit,
    // and the icon color is now fixed.

    // The chart data needs to be mapped to 'amount' if it's not already.
    // Assuming history items have an 'amount' property.
    const chartData = history.map((item: any) => ({
        ...item,
        amount: item.amount // Ensure the data key is 'amount'
    }))

    return (
        <Card className="widget-surface h-full overflow-hidden relative group p-5">
            <div className="flex flex-col md:flex-row gap-4 h-full items-center">
                {/* Information Column */}
                <div className="flex-1 w-full md:w-[40%] flex flex-col justify-center z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Activity className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Volatilidad Diaria</h3>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-3xl md:text-4xl font-black tracking-tighter">
                                {formatMoney(displayAmount)}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 shrink-0">
                                {todayData?.amount > 0 ? 'Hoy' : 'Reciente'}
                            </span>
                        </div>

                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold w-fit",
                            diff > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                        )}>
                            <TrendingUp className={cn("w-3 h-3", diff <= 0 && "rotate-180")} />
                            <span className="whitespace-nowrap">{formatMoney(Math.abs(diff))} {diff > 0 ? "sobre" : "bajo"} promedio</span>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="flex-[1.5] w-full md:w-[60%] h-[120px] md:h-full relative">
                    <ResponsiveContainer width="99%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            {/* Tooltip was removed by the edit */}
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVol)"
                                animationDuration={2000}
                            // strokeLinecap="round" was removed by the edit
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Overlay button refinement */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
        </Card>
    )
}

