"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Info, Lightbulb, TrendingUp, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface Insight {
    type: 'WARNING' | 'SUCCESS' | 'CAUTION' | 'INFO'
    message: string
    impact: 'ALTO' | 'MEDIO' | 'BAJO' | 'POSITIVO'
}

interface InsightsAdvisorProps {
    insights: Insight[]
}

export function InsightsAdvisor({ insights }: InsightsAdvisorProps) {
    if (!insights || insights.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/20">
                <Lightbulb className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                    Analizando tus movimientos para generar consejos...
                </p>
            </div>
        )
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'WARNING': return <AlertCircle className="h-5 w-5 text-rose-500" />
            case 'SUCCESS': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            case 'CAUTION': return <Zap className="h-5 w-5 text-amber-500" />
            default: return <Info className="h-5 w-5 text-blue-500" />
        }
    }

    const getImpactStyle = (impact: string) => {
        switch (impact) {
            case 'ALTO': return "bg-rose-500/10 text-rose-600 border-rose-200"
            case 'POSITIVO': return "bg-emerald-500/10 text-emerald-600 border-emerald-200"
            case 'MEDIO': return "bg-amber-500/10 text-amber-600 border-amber-200"
            default: return "bg-blue-500/10 text-blue-600 border-blue-200"
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Consejos del Asesor</h3>
            </div>

            <div className="grid gap-3">
                {insights.map((insight, index) => (
                    <Card key={index} className="overflow-hidden border-none bg-background/40 backdrop-blur-md shadow-sm group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-4 flex items-start gap-4">
                            <div className="mt-1 flex-shrink-0 group-hover:scale-110 transition-transform">
                                {getIcon(insight.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-semibold leading-relaxed">
                                    {insight.message}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-tighter",
                                        getImpactStyle(insight.impact)
                                    )}>
                                        Impacto {insight.impact}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
