"use client"

import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useFormat } from "@/hooks/use-format"
import { cn } from "@/lib/utils"

interface AuditThermometerProps {
    planning: {
        projectedIncome: number
        commitments: {
            savings: number
            fixed: number
            total: number
        }
        disposableIncome: number
        plannedVariable: number
        gap: number
        isDeficit: boolean
    }
}

export function AuditThermometer({ planning }: AuditThermometerProps) {
    const { formatMoney } = useFormat()

    // Base is Income. If expenses > income, base expands to fit expenses for visualization.
    const totalExpenses = planning.commitments.total + planning.plannedVariable
    const base = Math.max(planning.projectedIncome, totalExpenses)

    const savingsWidth = (planning.commitments.savings / base) * 100
    const fixedWidth = (planning.commitments.fixed / base) * 100
    const variableWidth = (planning.plannedVariable / base) * 100
    const remainingWidth = (planning.gap / base) * 100

    // Overflow handling
    const isOverflow = planning.isDeficit
    const overflowWidth = isOverflow ? (Math.abs(planning.gap) / base) * 100 : 0

    return (
        <Card className="glass border-none shadow-premium-md p-6 mb-6">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Auditoría de Liquidez
                    </h3>
                    <p className="text-sm text-muted-foreground">Tu mapa de flujo de dinero mensual</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Resultado Neto</p>
                    <div className={cn(
                        "text-3xl font-black tracking-tighter",
                        planning.isDeficit ? "text-rose-500" : "text-emerald-500"
                    )}>
                        {planning.isDeficit ? '-' : '+'}{formatMoney(Math.abs(planning.gap))}
                    </div>
                </div>
            </div>

            {/* Visual Bar */}
            <div className="h-12 bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden flex relative w-full border border-neutral-200 dark:border-neutral-800">
                {/* 1. Savings (First Priority) */}
                {savingsWidth > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${savingsWidth}%` }}
                        className="h-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white relative group"
                    >
                        <span className="truncate px-2">Ahorro</span>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                )}

                {/* 2. Fixed (Second Priority) */}
                {fixedWidth > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fixedWidth}%` }}
                        transition={{ delay: 0.1 }}
                        className="h-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white relative group border-l border-blue-600/20"
                    >
                        <span className="truncate px-2">Fijos</span>
                    </motion.div>
                )}

                {/* 3. Variable (The Playground) */}
                {variableWidth > 0 && (
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${variableWidth}%` }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                            "h-full flex items-center justify-center text-[10px] font-bold text-white relative group border-l border-white/10",
                            isOverflow ? "bg-rose-500" : "bg-violet-500"
                        )}
                    >
                        <span className="truncate px-2">Variables</span>
                    </motion.div>
                )}

                {/* 4. Remaining (Gap) */}
                {!isOverflow && remainingWidth > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 bg-emerald-500/20 flex items-center justify-center"
                    >
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Libre</span>
                    </motion.div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-medium text-muted-foreground">Ahorros ({formatMoney(planning.commitments.savings)})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Fijos ({formatMoney(planning.commitments.fixed)})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-xs font-medium text-muted-foreground">Variables ({formatMoney(planning.plannedVariable)})</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", planning.isDeficit ? "bg-rose-500" : "bg-emerald-500")} />
                    <span className={cn("text-xs font-bold", planning.isDeficit ? "text-rose-500" : "text-emerald-500")}>
                        {planning.isDeficit ? 'Sobregiro' : 'Disponible'}
                    </span>
                </div>
            </div>
        </Card>
    )
}
