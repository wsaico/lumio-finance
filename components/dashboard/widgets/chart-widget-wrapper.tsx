"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChartWidgetWrapperProps {
    title: string
    subtitle?: string
    children: React.ReactNode
    className?: string
}

export function ChartWidgetWrapper({ title, subtitle, children, className }: ChartWidgetWrapperProps) {
    return (
        <Card className={cn(
            "relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-white/70 p-4 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/60 transition-all hover:shadow-md",
            className
        )}>
            <div className="absolute -top-24 left-0 h-32 w-32 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-3 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Tendencias</p>
                    <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
                    {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
                </div>
                <div className="flex-1 min-h-0 w-full">
                    {children}
                </div>
            </div>
        </Card>
    )
}
