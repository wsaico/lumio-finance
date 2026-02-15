"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFormat } from "@/hooks/useFormat"
import { AlertCircle, CheckCircle2, TrendingUp, Link } from "lucide-react"
import { motion } from "framer-motion"

interface BudgetCardProps {
    budget: any // Type from schema/API
}

export function BudgetCard({ budget }: BudgetCardProps) {
    const { formatMoney, formatPercentage } = useFormat()
    const { stats } = budget

    // Safety check if stats logic failed or new budget
    const percentage = stats?.percentage || 0
    const spent = stats?.spent || 0
    const limit = Number(budget.amount)
    const remaining = limit - spent

    // Status determination
    const isOverBudget = percentage > 100
    const isNearLimit = percentage > 80 && percentage <= 100
    const isOnTrack = percentage <= 80

    // Color logic
    let statusColor = budget.color
    let gradientClass = 'from-blue-500/10 to-purple-500/10'

    if (budget.type === 'EXPENSE') {
        if (isOverBudget) {
            statusColor = '#ef4444'
            gradientClass = 'from-rose-500/10 to-red-500/10'
        } else if (isNearLimit) {
            statusColor = '#f59e0b'
            gradientClass = 'from-amber-500/10 to-orange-500/10'
        } else {
            gradientClass = 'from-emerald-500/10 to-green-500/10'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -4 }}
        >
            <Card className={`relative overflow-hidden border-none shadow-premium-md hover:shadow-premium-lg transition-all duration-300 bg-gradient-to-br ${gradientClass}`}>
                {/* Accent Border */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: statusColor }}
                />

                <CardHeader className="flex flex-row items-center justify-between pb-3 pl-4">
                    <CardTitle className="text-base font-semibold truncate pr-4 flex flex-col gap-1">
                        <span>{budget.name}</span>
                        {budget.is_zbb_controlled ? (
                            <div className="flex items-center gap-1.5 w-fit bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                                <Link className="w-3 h-3" />
                                Controlado por ZBB
                            </div>
                        ) : (
                            budget.zbb_allocation_id && (
                                <div className="flex items-center gap-1.5 w-fit bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                    <AlertCircle className="w-3 h-3" />
                                    Desincronizado
                                </div>
                            )
                        )}
                    </CardTitle>
                    <div className={`text-xs px-2.5 py-1 rounded-full font-medium glass ${isOverBudget ? 'bg-red-500/20 text-red-700 dark:text-red-300' :
                        isNearLimit ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                            'bg-muted/50 text-muted-foreground'
                        }`}>
                        {budget.period === 'MONTHLY' ? 'Mensual' : 'Personalizado'}
                    </div>
                </CardHeader>

                <CardContent className="pl-4">
                    {/* Amount Display */}
                    <div className="flex justify-between items-baseline mb-3">
                        <div>
                            <span className="text-2xl md:text-3xl font-bold">
                                {formatMoney(spent)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                                de {formatMoney(limit)}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar with Animation */}
                    <div className="space-y-2">
                        <div className="relative h-3 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ backgroundColor: statusColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(percentage, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>

                        {/* Status Row */}
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5">
                                {isOverBudget ? (
                                    <>
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-red-600 dark:text-red-400 font-semibold">
                                            Excedido por {formatMoney(Math.abs(remaining))}
                                        </span>
                                    </>
                                ) : isNearLimit ? (
                                    <>
                                        <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                                            Cerca del límite
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-muted-foreground">
                                            {formatPercentage(percentage)} usado
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="text-muted-foreground font-medium">
                                {remaining >= 0 ? formatMoney(remaining) : formatMoney(0)} restante
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
