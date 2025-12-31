"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react"
import { cn } from "@/lib/utils"

interface Loan {
    id: string
    person: string
    type: 'LENT' | 'BORROWED'
    amount: number
    paid: number
    remaining: number
    dueDate: string | null
}

interface DebtMonitorProps {
    loans: Loan[]
}

export function DebtMonitor({ loans = [] }: DebtMonitorProps) {
    if (!loans || loans.length === 0) {
        return (
            <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5 h-full">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
                    <div className="p-3 bg-white/5 rounded-full mb-3">
                        <HandCoins className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sin Préstamos Activos</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[180px]">
                        Tus deudas "Por Pagar" y "Por Cobrar" aparecerán aquí.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const totalToPay = loans
        .filter(l => l.type === 'BORROWED')
        .reduce((acc, curr) => acc + curr.remaining, 0)

    const totalToCollect = loans
        .filter(l => l.type === 'LENT')
        .reduce((acc, curr) => acc + curr.remaining, 0)

    return (
        <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5 h-full">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <HandCoins className="h-4 w-4 text-primary" />
                            Control de Deudas
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Por Cobrar</span>
                        </div>
                        <div className="text-lg font-black text-emerald-500 tabular-nums">
                            S/ {Math.round(totalToCollect).toLocaleString()}
                        </div>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ArrowUpRight className="h-3 w-3 text-rose-500" />
                            <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider">Por Pagar</span>
                        </div>
                        <div className="text-lg font-black text-rose-500 tabular-nums">
                            S/ {Math.round(totalToPay).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase px-1">Préstamos Críticos</p>
                    {loans.slice(0, 3).map((loan) => (
                        <div key={loan.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-[10px] font-black uppercase",
                                    loan.type === 'BORROWED' ? "text-rose-500" : "text-emerald-500"
                                )}>
                                    {loan.type === 'BORROWED' ? 'Debo a:' : 'Me debe:'}
                                </span>
                                <span className="text-xs font-bold text-foreground">{loan.person}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-black tabular-nums">S/ {Math.round(loan.remaining).toLocaleString()}</span>
                                {loan.dueDate && (
                                    <p className="text-[9px] text-muted-foreground">Vence: {new Date(loan.dueDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
