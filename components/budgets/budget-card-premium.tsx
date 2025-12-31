"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSettingsStore } from "@/hooks/use-settings-store"
import {
    MoreVertical,
    Edit2,
    Trash2,
    Copy,
    Pause,
    Play,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface BudgetCardPremiumProps {
    budget: any
    onEdit?: (budget: any) => void
    onDelete?: (id: string) => void
    onDuplicate?: (budget: any) => void
    onToggleActive?: (id: string, isActive: boolean) => void
    onRefresh?: () => void
}

// Helper function to determine budget health status
type BudgetStatus = 'healthy' | 'warning' | 'danger' | 'critical' | 'exceeded' | 'goal-achieved'

function getBudgetStatus(percentage: number, type: 'EXPENSE' | 'SAVINGS'): BudgetStatus {
    if (type === 'EXPENSE') {
        if (percentage >= 120) return 'exceeded'
        if (percentage >= 100) return 'critical'
        if (percentage >= 85) return 'danger'
        if (percentage >= 70) return 'warning'
        return 'healthy'
    } else {
        // SAVINGS
        if (percentage >= 100) return 'goal-achieved'
        if (percentage >= 75) return 'warning' // Nearly there
        return 'healthy'
    }
}

export function BudgetCardPremium({
    budget,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleActive,
    onRefresh
}: BudgetCardPremiumProps) {
    const { currencyCode } = useSettingsStore()
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const { stats } = budget

    const symbolMap: Record<string, string> = { 'PEN': 'S/.', 'USD': '$', 'EUR': '€', 'MXN': '$' }
    const symbol = symbolMap[currencyCode] || '$'

    const percentage = stats?.percentage || 0
    const spent = stats?.spent || 0
    const remaining = stats?.remaining || 0
    const limit = Number(budget.amount)

    // Determine budget health status
    const status = getBudgetStatus(percentage, budget.type)

    // Color and styling based on status
    let statusColor = budget.color
    let statusBg = `${budget.color}15`
    let borderColor = budget.color
    let pulseAnimation = false

    if (budget.type === 'EXPENSE') {
        switch (status) {
            case 'exceeded':
                statusColor = '#dc2626' // Red 600
                statusBg = '#dc262620'
                borderColor = '#dc2626'
                pulseAnimation = true
                break
            case 'critical':
                statusColor = '#ef4444' // Red 500
                statusBg = '#ef444420'
                borderColor = '#ef4444'
                pulseAnimation = true
                break
            case 'danger':
                statusColor = '#f59e0b' // Amber 500
                statusBg = '#f59e0b20'
                borderColor = '#f59e0b'
                break
            case 'warning':
                statusColor = '#eab308' // Yellow 500
                statusBg = '#eab30815'
                borderColor = '#eab308'
                break
        }
    } else {
        if (status === 'goal-achieved') {
            statusColor = '#10b981' // Green 500
            statusBg = '#10b98120'
            borderColor = '#10b981'
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/budgets/${budget.id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const errorData = await res.json()
                alert(`Error al eliminar: ${errorData.error || 'Error desconocido'}`)
                return
            }

            onDelete?.(budget.id)
            onRefresh?.()
        } catch (error) {
            alert('Error de red. Por favor intenta nuevamente.')
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    const handleToggleActive = async () => {
        try {
            const res = await fetch(`/api/budgets/${budget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !budget.isActive })
            })

            if (!res.ok) {
                const errorData = await res.json()
                alert(`Error al cambiar estado: ${errorData.error || 'Error desconocido'}`)
                return
            }

            onToggleActive?.(budget.id, !budget.isActive)
            onRefresh?.()
        } catch (error) {
            alert('Error de red. Por favor intenta nuevamente.')
        }
    }

    // Get status label and icon
    const getStatusInfo = () => {
        if (budget.type === 'EXPENSE') {
            switch (status) {
                case 'exceeded':
                    return {
                        label: 'EXCEDIDO',
                        icon: XCircle,
                        description: `Has superado el presupuesto en ${symbol}${Math.abs(remaining).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                    }
                case 'critical':
                    return {
                        label: 'CRÍTICO',
                        icon: ShieldAlert,
                        description: 'Presupuesto casi agotado'
                    }
                case 'danger':
                    return {
                        label: 'RIESGO',
                        icon: AlertTriangle,
                        description: 'Acercándose al límite'
                    }
                case 'warning':
                    return {
                        label: 'PRECAUCIÓN',
                        icon: AlertCircle,
                        description: 'Monitorea tus gastos'
                    }
                default:
                    return {
                        label: 'SALUDABLE',
                        icon: CheckCircle2,
                        description: 'Dentro del presupuesto'
                    }
            }
        } else {
            if (status === 'goal-achieved') {
                return {
                    label: 'META ALCANZADA',
                    icon: CheckCircle2,
                    description: '¡Felicidades!'
                }
            }
            return {
                label: percentage >= 75 ? 'CASI COMPLETO' : 'EN PROGRESO',
                icon: TrendingUp,
                description: `${(100 - percentage).toFixed(0)}% para completar`
            }
        }
    }

    const statusInfo = getStatusInfo()
    const StatusIcon = statusInfo.icon

    return (
        <>
            <Card
                className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
                    !budget.isActive && "opacity-60",
                    pulseAnimation && "animate-pulse"
                )}
                style={{
                    background: `linear-gradient(135deg, ${statusBg} 0%, transparent 100%)`,
                    borderColor: borderColor,
                    borderWidth: '2px',
                    borderStyle: 'solid'
                }}
            >
                {/* Top accent bar with animation */}
                <div
                    className={cn(
                        "absolute top-0 left-0 right-0 h-1.5 transition-all duration-300",
                        pulseAnimation && "animate-pulse"
                    )}
                    style={{ backgroundColor: statusColor }}
                />

                {/* Critical Alert Banner */}
                {(status === 'exceeded' || status === 'critical') && budget.type === 'EXPENSE' && (
                    <div
                        className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-2 shadow-md z-10"
                    >
                        <StatusIcon className="w-3.5 h-3.5 animate-pulse" />
                        <span>{statusInfo.label}: {statusInfo.description}</span>
                    </div>
                )}

                {/* Header */}
                <CardHeader className={cn(
                    "flex flex-row items-start justify-between space-y-0 pb-3",
                    (status === 'exceeded' || status === 'critical') && budget.type === 'EXPENSE' && "pt-12"
                )}>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg truncate">{budget.name}</h3>
                            {!budget.isActive && (
                                <div className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full">
                                    PAUSADO
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            {budget.type === 'EXPENSE' ? (
                                <TrendingDown className="w-3 h-3" style={{ color: statusColor }} />
                            ) : (
                                <TrendingUp className="w-3 h-3" style={{ color: statusColor }} />
                            )}
                            <span className="text-muted-foreground">{budget.type === 'EXPENSE' ? 'Gastos' : 'Ahorros'}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{budget.period === 'MONTHLY' ? 'Mensual' : 'Personalizado'}</span>
                            {status !== 'healthy' && status !== 'goal-achieved' && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="font-semibold flex items-center gap-1" style={{ color: statusColor }}>
                                        <StatusIcon className="w-3 h-3" />
                                        {statusInfo.label}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Actions dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onEdit?.(budget)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicate?.(budget)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleToggleActive}>
                                {budget.isActive ? (
                                    <>
                                        <Pause className="mr-2 h-4 w-4" />
                                        Pausar
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Activar
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>

                {/* Content */}
                <CardContent className="space-y-4">
                    {/* Primary metric - What matters most */}
                    <div className="space-y-3">
                        {/* Main amount - Gastado vs Límite */}
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight" style={{ color: statusColor }}>
                                    {symbol}{spent.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-xl text-muted-foreground">
                                    / {symbol}{limit.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground font-medium">
                                    {budget.type === 'EXPENSE' ? 'Gastado de tu presupuesto' : 'Ahorrado de tu meta'}
                                </span>
                                <span className="text-sm font-bold" style={{ color: statusColor }}>
                                    {percentage.toFixed(0)}%
                                </span>
                            </div>
                        </div>

                        {/* Progress bar with segments */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Progress
                                    value={Math.min(percentage, 100)}
                                    className="h-3 rounded-full"
                                    indicatorColor={statusColor}
                                />
                                {/* Threshold markers for expense budgets */}
                                {budget.type === 'EXPENSE' && (
                                    <>
                                        <div className="absolute top-0 h-3 border-l-2 border-yellow-500 opacity-40" style={{ left: '70%' }} title="70% - Precaución" />
                                        <div className="absolute top-0 h-3 border-l-2 border-orange-500 opacity-50" style={{ left: '85%' }} title="85% - Riesgo" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Key Financial Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {remaining >= 0 ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Disponible</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-600">Excedido</span>
                                    </>
                                )}
                            </div>
                            <div className={cn(
                                "text-2xl font-bold",
                                remaining < 0 ? "text-red-600" : ""
                            )} style={{ color: remaining >= 0 ? statusColor : undefined }}>
                                {symbol}{Math.abs(remaining).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {remaining >= 0
                                    ? `${((remaining / limit) * 100).toFixed(0)}% restante`
                                    : `${((Math.abs(remaining) / limit) * 100).toFixed(0)}% sobre límite`
                                }
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <StatusIcon className="w-3 h-3" />
                                <span>Estado</span>
                            </div>
                            <div className="text-lg font-bold flex items-center gap-1.5" style={{ color: statusColor }}>
                                <span>{statusInfo.label}</span>
                            </div>
                            <div className="text-xs" style={{ color: statusColor, opacity: 0.8 }}>
                                {statusInfo.description}
                            </div>
                        </div>
                    </div>

                    {/* Warning/Info Messages */}
                    {status === 'danger' && budget.type === 'EXPENSE' && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                                <div className="font-semibold text-amber-700">Alerta de presupuesto</div>
                                <div className="text-amber-600/90 mt-0.5">{statusInfo.description}. Solo te quedan {symbol}{remaining.toLocaleString('es-PE', { minimumFractionDigits: 2 })} disponibles.</div>
                            </div>
                        </div>
                    )}

                    {status === 'warning' && budget.type === 'EXPENSE' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2.5 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                                <div className="font-semibold text-yellow-700">Precaución</div>
                                <div className="text-yellow-600/90 mt-0.5">{statusInfo.description} para mantener el control.</div>
                            </div>
                        </div>
                    )}

                    {status === 'goal-achieved' && budget.type === 'SAVINGS' && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs">
                                <div className="font-semibold text-green-700">¡Meta alcanzada!</div>
                                <div className="text-green-600/90 mt-0.5">Has completado tu objetivo de ahorro.</div>
                            </div>
                        </div>
                    )}

                    {/* Additional info */}
                    {budget.accountIds && budget.accountIds.length > 0 && (
                        <div className="text-xs text-muted-foreground pt-2 border-t flex items-center gap-1">
                            <span className="font-medium">{budget.accountIds.length}</span>
                            <span>cuenta(s) monitoreada(s)</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El presupuesto "{budget.name}" será eliminado permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
