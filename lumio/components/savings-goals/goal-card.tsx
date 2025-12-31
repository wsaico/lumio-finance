"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
    Target, Calendar, TrendingUp, TrendingDown,
    CheckCircle2, Clock, AlertCircle, ChevronRight
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface GoalCardProps {
    goal: any
}

export function GoalCard({ goal }: GoalCardProps) {
    const progress = goal.progress || 0
    const isCompleted = goal.status === 'COMPLETED'
    const isOnTrack = goal.isOnTrack

    // Determine status color
    const getStatusColor = () => {
        if (isCompleted) return 'text-emerald-600'
        if (isOnTrack) return 'text-blue-600'
        return 'text-amber-600'
    }

    const getStatusIcon = () => {
        if (isCompleted) return <CheckCircle2 className="w-4 h-4" />
        if (isOnTrack) return <TrendingUp className="w-4 h-4" />
        return <TrendingDown className="w-4 h-4" />
    }

    const getStatusText = () => {
        if (isCompleted) return 'Completada'
        if (isOnTrack) return 'En camino'
        return 'Retrasada'
    }

    // Format currency
    const formatCurrency = (amount: number) => {
        return `S/ ${amount.toFixed(2)}`
    }

    return (
        <Link href={`/dashboard/savings-goals/${goal.id}`}>
            <Card className={cn(
                "p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group",
                isCompleted && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
            )}>
                {/* Background gradient based on goal color */}
                <div
                    className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${goal.color || '#f97316'} 0%, transparent 100%)` }}
                />

                {/* Header */}
                <div className="flex items-start justify-between mb-4 relative">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg truncate">{goal.name}</h3>
                            {isCompleted && (
                                <Badge className="bg-emerald-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Completada
                                </Badge>
                            )}
                        </div>
                        {goal.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                        )}
                    </div>
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ml-3"
                        style={{ backgroundColor: `${goal.color || '#f97316'}20` }}
                    >
                        <Target className="w-6 h-6" style={{ color: goal.color || '#f97316' }} />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{progress.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">
                            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                        </span>
                    </div>
                    <Progress
                        value={progress}
                        className="h-3"
                        style={{
                            // @ts-ignore
                            '--progress-background': goal.color || '#f97316'
                        }}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                            {goal.daysRemaining > 0 ? (
                                <>{goal.daysRemaining} días</>
                            ) : (
                                <>Vencida</>
                            )}
                        </span>
                    </div>
                    <div className={cn("flex items-center gap-2 text-sm", getStatusColor())}>
                        {getStatusIcon()}
                        <span className="font-medium">{getStatusText()}</span>
                    </div>
                </div>

                {/* Monthly needed (if not completed) */}
                {!isCompleted && goal.monthlyNeeded > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Ahorro mensual necesario</span>
                            <span className="text-sm font-bold">{formatCurrency(goal.monthlyNeeded)}</span>
                        </div>
                    </div>
                )}

                {/* Priority badge */}
                <div className="flex items-center justify-between">
                    <Badge variant={
                        goal.priority === 'HIGH' ? 'destructive' :
                            goal.priority === 'MEDIUM' ? 'default' :
                                'secondary'
                    }>
                        {goal.priority === 'HIGH' ? 'Alta' : goal.priority === 'MEDIUM' ? 'Media' : 'Baja'} prioridad
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>

                {/* Completed date */}
                {isCompleted && goal.completed_date && (
                    <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Completada el {new Date(goal.completed_date).toLocaleDateString('es-PE')}
                        </p>
                    </div>
                )}
            </Card>
        </Link>
    )
}
