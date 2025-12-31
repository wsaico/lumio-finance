"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    ArrowLeft, Plus, Calendar, TrendingUp, TrendingDown,
    Target, CheckCircle2, Clock, Trophy, Sparkles, Edit, Trash2, RefreshCw
} from "lucide-react"
import { useSavingsGoal, useGoalContributions, useDeleteSavingsGoal, useUpdateContribution, useDeleteContribution, useSyncSavingsGoal } from "@/hooks/use-savings-goals"
import { ContributeModal } from "@/components/savings-goals/contribute-modal"
import { EditContributionModal } from "@/components/savings-goals/edit-contribution-modal"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

export default function GoalDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const goalId = params.id as string

    const [showContributeModal, setShowContributeModal] = useState(false)
    const [hasShownConfetti, setHasShownConfetti] = useState(false)
    const [editingContribution, setEditingContribution] = useState<any>(null)

    const { data: goalData, isLoading: loadingGoal } = useSavingsGoal(goalId)
    const { data: contributionsData, isLoading: loadingContributions } = useGoalContributions(goalId)
    const { mutate: deleteGoal, isPending: isDeleting } = useDeleteSavingsGoal()
    const { mutate: updateContribution, isPending: isUpdating } = useUpdateContribution()
    const { mutate: deleteContribution, isPending: isDeletingContribution } = useDeleteContribution()
    const { mutate: syncGoal, isPending: isSyncing } = useSyncSavingsGoal()

    console.log('[GOAL_DETAILS_PAGE] Contributions data:', contributionsData)
    // ... rest of the code ...

    console.log('[GOAL_DETAILS_PAGE] Loading:', loadingContributions)

    const goal = goalData?.goal
    const contributions = contributionsData?.contributions || []

    console.log('[GOAL_DETAILS_PAGE] Parsed contributions:', contributions)

    const isCompleted = goal?.status === 'COMPLETED'
    const progress = goal?.progress || 0

    // Show confetti on completion
    useEffect(() => {
        if (isCompleted && !hasShownConfetti) {
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 }
            })
            setHasShownConfetti(true)
        }
    }, [isCompleted, hasShownConfetti])

    const handleDelete = () => {
        if (confirm('¿Estás seguro de que quieres eliminar esta meta? Esta acción no se puede deshacer.')) {
            deleteGoal(goalId, {
                onSuccess: () => {
                    router.push('/dashboard/savings-goals')
                }
            })
        }
    }

    const handleUpdateContribution = (id: string, data: { amount: number; contributionDate: string; notes: string }) => {
        updateContribution({ id, ...data }, {
            onSuccess: () => {
                setEditingContribution(null)
                // Auto-sync to ensure progress bar updates dynamically
                syncGoal(goalId)
            }
        })
    }

    const handleDeleteContribution = (id: string) => {
        if (confirm('¿Eliminar esta contribución? Esta acción no se puede deshacer.')) {
            deleteContribution(id, {
                onSuccess: () => {
                    // Auto-sync to ensure progress bar updates dynamically
                    syncGoal(goalId)
                }
            })
        }
    }

    if (loadingGoal) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!goal) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Meta no encontrada</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </div>
        )
    }

    const formatCurrency = (amount: number) => `S/ ${amount.toFixed(2)}`
    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-PE')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">{goal.name}</h1>
                    {goal.description && (
                        <p className="text-muted-foreground">{goal.description}</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => syncGoal(goalId)}
                        disabled={isSyncing}
                        title="Sincronizar progreso"
                    >
                        <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                    </Button>
                    {!isCompleted && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => router.push(`/dashboard/savings-goals/${goal.id}/edit`)}
                                title="Editar meta"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive"
                                title="Eliminar meta"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setShowContributeModal(true)}
                                className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                            >
                                <Plus className="h-4 w-4" />
                                Contribuir
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Progress Card */}
            <Card className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-bold">
                                {formatCurrency(goal.current_amount)}
                            </h2>
                            <span className="text-muted-foreground">
                                de {formatCurrency(goal.target_amount)}
                            </span>
                        </div>
                        <p className="text-4xl font-black text-orange-600">
                            {progress.toFixed(1)}%
                        </p>
                    </div>
                    <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center"
                        style={{ backgroundColor: `${goal.color}20` }}
                    >
                        <Target className="w-10 h-10" style={{ color: goal.color }} />
                    </div>
                </div>

                <Progress value={progress} className="h-4 mb-6" />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">
                            {goal.daysRemaining > 0 ? `${goal.daysRemaining} días` : 'Vencida'}
                        </div>
                        <div className="text-xs text-muted-foreground">Restantes</div>
                    </div>

                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Trophy className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">
                            {formatCurrency(goal.amountRemaining)}
                        </div>
                        <div className="text-xs text-muted-foreground">Por ahorrar</div>
                    </div>

                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        <Sparkles className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                        <div className="text-sm font-medium">
                            {formatCurrency(goal.monthlyNeeded)}
                        </div>
                        <div className="text-xs text-muted-foreground">Mensual necesario</div>
                    </div>

                    <div className="text-center p-3 rounded-lg bg-muted/50">
                        {goal.isOnTrack ? (
                            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                        ) : (
                            <TrendingDown className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                        )}
                        <div className="text-sm font-medium">
                            {goal.isOnTrack ? 'En camino' : 'Retrasada'}
                        </div>
                        <div className="text-xs text-muted-foreground">Estado</div>
                    </div>
                </div>

                {isCompleted && (
                    <div className="mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-bold">¡Meta Completada!</span>
                        </div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                            Completada el {formatDate(goal.completed_date)}
                        </p>
                    </div>
                )}
            </Card>

            {/* Contributions History */}
            <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Historial de Contribuciones</h3>

                {loadingContributions ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : contributions.length === 0 ? (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">Aún no hay contribuciones</p>
                        <Button
                            onClick={() => setShowContributeModal(true)}
                            variant="outline"
                            className="mt-4"
                        >
                            Agregar Primera Contribución
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {contributions.map((contribution: any) => (
                            <div
                                key={contribution.id}
                                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg">
                                            {formatCurrency(contribution.amount)}
                                        </span>
                                        {contribution.transaction && (
                                            <Badge variant="secondary" className="text-xs">
                                                Transferencia
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(contribution.contribution_date)}
                                    </p>
                                    {contribution.notes && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {contribution.notes}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    {!isCompleted && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setEditingContribution(contribution)}
                                                title="Editar contribución"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteContribution(contribution.id)}
                                                disabled={isDeletingContribution}
                                                title="Eliminar contribución"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Contribute Modal */}
            <ContributeModal
                goal={goal}
                open={showContributeModal}
                onOpenChange={setShowContributeModal}
            />

            {/* Edit Contribution Modal */}
            {editingContribution && (
                <EditContributionModal
                    contribution={editingContribution}
                    open={!!editingContribution}
                    onOpenChange={(open) => !open && setEditingContribution(null)}
                    onUpdate={handleUpdateContribution}
                    isPending={isUpdating}
                />
            )}
        </div>
    )
}
