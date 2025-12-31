"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, PieChart } from "lucide-react"
import { cn } from "@/lib/utils"

interface Budget {
    id: string
    name: string
    amount: number
    spent: number
    percent: number
    color: string
}

interface BudgetPulseProps {
    budgets: Budget[]
}

export function BudgetPulse({ budgets = [] }: BudgetPulseProps) {
    if (!budgets || budgets.length === 0) {
        return (
            <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5 h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                    <div className="p-3 bg-white/5 rounded-full mb-3">
                        <PieChart className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sin Presupuestos Activos</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[180px]">
                        Crea presupuestos para monitorear tus gastos en tiempo real aquí.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5 h-full">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-primary" />
                            Control Presupuestario
                        </h3>
                    </div>
                    <div className="text-[10px] font-bold px-2 py-1 bg-white/5 rounded-lg text-muted-foreground">
                        {budgets.length} Activos
                    </div>
                </div>

                <div className="space-y-5">
                    {budgets.slice(0, 4).map((budget) => {
                        const isOver = budget.percent >= 100
                        const isHigh = budget.percent >= 80

                        return (
                            <div key={budget.id} className="space-y-2 group">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: budget.color }}
                                        />
                                        <span className="font-bold text-muted-foreground uppercase truncate" title={budget.name}>
                                            {budget.name}
                                        </span>
                                        {isOver && (
                                            <AlertTriangle className="h-3 w-3 text-rose-500 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1 font-black tabular-nums">
                                        <span className={cn(
                                            isOver ? "text-rose-500" : "text-foreground"
                                        )}>
                                            S/ {Math.round(budget.spent).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/40 font-bold">
                                            / {Math.round(budget.amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                                    {/* Tick marks for 50% and 80% */}
                                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/20 z-10" />
                                    <div className="absolute left-[80%] top-0 bottom-0 w-[1px] bg-black/20 z-10" />

                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000",
                                            isOver ? "bg-rose-500" : isHigh ? "bg-amber-500" : "bg-primary"
                                        )}
                                        style={{ width: `${Math.min(100, budget.percent)}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
