"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ExecutiveHealthScoreProps {
    score: number
}

export function ExecutiveHealthScore({ score }: ExecutiveHealthScoreProps) {
    const getStatus = (s: number) => {
        if (s >= 80) return { label: 'EXCEPCIONAL', color: 'text-emerald-500', icon: ShieldCheck, bg: 'bg-emerald-500/10' }
        if (s >= 60) return { label: 'ESTABLE', color: 'text-primary', icon: ShieldCheck, bg: 'bg-primary/10' }
        if (s >= 40) return { label: 'VULNERABLE', color: 'text-amber-500', icon: ShieldAlert, bg: 'bg-amber-500/10' }
        return { label: 'CRÍTICO', color: 'text-rose-500', icon: ShieldX, bg: 'bg-rose-500/10' }
    }

    const { label, color, icon: Icon, bg } = getStatus(score)

    return (
        <div className="relative group p-6 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 shadow-premium-sm overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="h-20 w-20" />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Executive Index</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                        Este score pondera tu **Tasa de Ahorro**, tu **Liquidez (Runway)** y la **Estabilidad** de tus flujos mensuales.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest">Salud Financiera</h3>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black", color, bg)}>
                        {label}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-end justify-between tabular-nums">
                        <span className={cn("text-5xl font-black tracking-tighter", color)}>{score}</span>
                        <span className="text-xl font-bold text-muted-foreground/20">/ 100</span>
                    </div>
                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={cn("absolute inset-y-0 left-0 transition-all duration-1000 ease-out",
                                score >= 60 ? "bg-primary" : score >= 40 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${score}%` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    {score >= 80
                        ? "Tu gestión financiera es de alto nivel. Tienes un colchón sólido y una retención de capital óptima."
                        : score >= 60
                            ? "Estado saludable. Mantienes el equilibrio, aunque hay margen para optimizar tus reservas de emergencia."
                            : "Atención requerida. Tu ratio de liquidez o ahorro está por debajo de los estándares de seguridad ejecutiva."
                    }
                </p>
            </div>
        </div>
    )
}
