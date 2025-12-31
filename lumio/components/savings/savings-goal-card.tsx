
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFormat } from "@/hooks/use-format"
import { Target, Trophy, Calendar, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface SavingsGoalCardProps {
    goal: {
        id: string
        name: string
        targetAmount: number
        currentAmount: number
        currencyCode: string
        icon: string
        color: string
        targetDate?: string
    }
}

export function SavingsGoalCard({ goal }: SavingsGoalCardProps) {
    const { formatMoney, formatPercentage } = useFormat()
    const percentage = Math.min((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100, 100)
    const isComplete = percentage >= 100

    // Calculate days remaining
    let daysRemaining = null
    if (goal.targetDate) {
        const target = new Date(goal.targetDate)
        const today = new Date()
        const diffTime = target.getTime() - today.getTime()
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -4 }}
        >
            <Card className={`relative overflow-hidden border-none shadow-premium-md hover:shadow-premium-lg transition-all duration-300 ${isComplete ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10' : 'glass'
                }`}>
                {/* Accent Border */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: goal.color }}
                />

                {/* Celebration Effect for Completed Goals */}
                {isComplete && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}

                <CardHeader className="flex flex-row items-center justify-between pb-3 pl-4">
                    <CardTitle className="text-base font-semibold truncate pr-4">
                        {goal.name}
                    </CardTitle>
                    <motion.div
                        animate={isComplete ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 3 }}
                    >
                        {isComplete ? (
                            <Trophy className="h-5 w-5 text-emerald-500" />
                        ) : (
                            <Target className="h-5 w-5" style={{ color: goal.color }} />
                        )}
                    </motion.div>
                </CardHeader>

                <CardContent className="pl-4 space-y-4">
                    {/* Amount Display */}
                    <div className="flex flex-col gap-1">
                        <div className="text-2xl md:text-3xl font-bold">
                            {formatMoney(goal.currentAmount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Meta: {formatMoney(goal.targetAmount)}
                        </div>
                    </div>

                    {/* Circular Progress Indicator */}
                    <div className="relative">
                        {/* Progress Bar */}
                        <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: goal.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>

                        {/* Percentage Badge */}
                        <div className="flex justify-between items-center mt-2 text-xs">
                            <span className={`font-semibold ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                                }`}>
                                {formatPercentage(percentage)} completado
                            </span>
                            {isComplete && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    ¡Meta alcanzada!
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Target Date & Days Remaining */}
                    {goal.targetDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                                {format(new Date(goal.targetDate), "d 'de' MMMM, yyyy", { locale: es })}
                            </span>
                            {daysRemaining !== null && daysRemaining > 0 && !isComplete && (
                                <span className="ml-auto font-medium">
                                    {daysRemaining} días restantes
                                </span>
                            )}
                        </div>
                    )}

                    {/* Remaining Amount */}
                    {!isComplete && (
                        <div className="flex items-center gap-2 text-xs">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-muted-foreground">
                                Faltan <span className="font-semibold text-foreground">
                                    {formatMoney(goal.targetAmount - goal.currentAmount)}
                                </span> para tu meta
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
