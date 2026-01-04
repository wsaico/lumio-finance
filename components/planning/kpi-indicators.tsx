"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Zap, CalendarClock, Activity } from "lucide-react"
import { useFormat } from "@/hooks/use-format"
import { cn } from "@/lib/utils"

interface KPIIndicatorsProps {
    indicators: {
        dailySafeSpend: number
        ratios: {
            needs: number
            wants: number
            savings: number
        }
    }
}

export function KPIIndicators({ indicators }: KPIIndicatorsProps) {
    const { formatMoney } = useFormat()

    const { dailySafeSpend, ratios } = indicators

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 1. Daily Power */}
            <Card className="glass border-emerald-500/20 shadow-premium-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Poder Diario</p>
                        <div className="text-2xl font-black text-foreground">
                            {formatMoney(dailySafeSpend)}
                        </div>
                        <p className="text-[10px] text-emerald-500/80 font-medium mt-0.5">
                            Seguro para gastar hoy
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Needs Ratio (50%) */}
            <Card className={cn(
                "glass shadow-premium-sm relative overflow-hidden",
                ratios.needs > 50 ? "border-rose-500/30 bg-rose-500/5" : "border-blue-500/20"
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            Needs (Fijos)
                        </p>
                        <span className={cn(
                            "text-xs font-black",
                            ratios.needs > 50 ? "text-rose-500" : "text-blue-500"
                        )}>{ratios.needs}% / 50%</span>
                    </div>
                    <Progress value={Math.min(100, (ratios.needs / 50) * 100)} className="h-1.5 bg-neutral-200 dark:bg-neutral-800" indicatorClassName={ratios.needs > 50 ? "bg-rose-500" : "bg-blue-500"} />
                </CardContent>
            </Card>

            {/* 3. Wants Ratio (30%) */}
            <Card className={cn(
                "glass shadow-premium-sm relative overflow-hidden",
                ratios.wants > 30 ? "border-rose-500/30 bg-rose-500/5" : "border-violet-500/20"
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            Wants (Variables)
                        </p>
                        <span className={cn(
                            "text-xs font-black",
                            ratios.wants > 30 ? "text-rose-500" : "text-violet-500"
                        )}>{ratios.wants}% / 30%</span>
                    </div>
                    <Progress value={Math.min(100, (ratios.wants / 30) * 100)} className="h-1.5 bg-neutral-200 dark:bg-neutral-800" indicatorClassName={ratios.wants > 30 ? "bg-rose-500" : "bg-violet-500"} />
                </CardContent>
            </Card>

            {/* 4. Savings Ratio (20%) */}
            <Card className={cn(
                "glass shadow-premium-sm relative overflow-hidden",
                ratios.savings < 20 ? "border-amber-500/30" : "border-amber-500/20"
            )}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            Savings (Ahorro)
                        </p>
                        <span className={cn(
                            "text-xs font-black",
                            ratios.savings < 20 ? "text-amber-600" : "text-amber-500"
                        )}>{ratios.savings}% / 20%</span>
                    </div>
                    <Progress value={Math.min(100, (ratios.savings / 20) * 100)} className="h-1.5 bg-neutral-200 dark:bg-neutral-800" indicatorClassName="bg-amber-500" />
                </CardContent>
            </Card>
        </div>
    )
}
