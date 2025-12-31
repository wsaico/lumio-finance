"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, AlertCircle, CalendarRange } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnnualizedCategory {
    name: string
    monthly: number
    yearly: number
    color: string
}

interface ExecutiveAnnualizedImpactProps {
    data: AnnualizedCategory[]
}

export function ExecutiveAnnualizedImpact({ data }: ExecutiveAnnualizedImpactProps) {
    if (!data || data.length === 0) return null

    return (
        <div className="space-y-4 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Impacto Anual Proyectado</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 flex-1 items-center content-center">
                {data.map((cat, i) => (
                    <Card key={i} className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5 group hover:bg-background/60 transition-all duration-500 overflow-hidden w-full">
                        <CardContent className="pt-6 relative">
                            <div
                                className="absolute top-0 right-0 w-1 h-full opacity-50 transition-all group-hover:w-2"
                                style={{ backgroundColor: cat.color }}
                            />

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase trancate">{cat.name}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-black tabular-nums">S/ {Math.round(cat.yearly).toLocaleString()}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase">/ año</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium text-muted-foreground/50 uppercase">Mensual</span>
                                        <span className="text-xs font-bold tabular-nums text-muted-foreground">S/ {Math.round(cat.monthly).toLocaleString()}</span>
                                    </div>
                                    <div className="p-1.5 bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrendingDown className="h-3 w-3 text-rose-500" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="text-[10px] text-center text-muted-foreground/40 font-medium italic mt-auto">
                * Proyección basada en el gasto real del periodo actual multiplicado por 12.
            </p>
        </div>
    )
}
