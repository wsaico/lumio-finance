"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useSettingsStore } from "@/hooks/useSettingsStore"
import {
    MoreHorizontal,
    Edit2,
    Trash2,
    Copy,
    Pause,
    Play,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
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

type BudgetStatus = 'healthy' | 'warning' | 'danger' | 'critical' | 'exceeded' | 'goal-achieved'

function getBudgetStatus(percentage: number, type: 'EXPENSE' | 'SAVINGS'): BudgetStatus {
    if (type === 'EXPENSE') {
        if (percentage > 100) return 'exceeded'
        if (percentage >= 90) return 'critical'
        if (percentage >= 80) return 'danger'
        if (percentage >= 60) return 'warning'
        return 'healthy'
    } else {
        if (percentage >= 100) return 'goal-achieved'
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

    const status = getBudgetStatus(percentage, budget.type)

    // Modern "Finance App" aesthetic colors
    // We move away from pure "Traffic Light" colors to more sophisticated shades
    let accentColor = budget.color

    // Override color based on critical status, but keep user color if healthy
    if (budget.type === 'EXPENSE') {
        if (status === 'exceeded') accentColor = '#ef4444' // Red 500
        else if (status === 'critical') accentColor = '#f97316' // Orange 500
        else if (status === 'warning') accentColor = '#eab308' // Yellow 500
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await fetch(`/api/budgets/${budget.id}`, { method: 'DELETE' })
            onDelete?.(budget.id)
            onRefresh?.()
        } catch (error) {
            // Error handling
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

    const handleToggleActive = async () => {
        try {
            await fetch(`/api/budgets/${budget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !budget.isActive })
            })
            onToggleActive?.(budget.id, !budget.isActive)
            onRefresh?.()
        } catch (error) { }
    }

    const formatMoney = (amount: number) => {
        return `${symbol}${Math.abs(amount).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    return (
        <>
            <Card className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-md border-border/50 bg-card/50 backdrop-blur-sm",
                !budget.isActive && "opacity-60 grayscale-[0.5]"
            )}>
                {/* Thin Accent Line - Elegant Indicator */}
                <div
                    className="absolute top-0 left-0 w-1 h-full opacity-80 transition-all group-hover:opacity-100"
                    style={{ backgroundColor: accentColor }}
                />

                <CardContent className="p-5 pl-6 space-y-5">
                    {/* Header: Name + Actions */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-base tracking-tight text-foreground/90 truncate pr-4">
                                {budget.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-[4px] bg-secondary text-secondary-foreground text-[10px] tracking-wide uppercase",
                                    !budget.isActive && "bg-muted"
                                )}>
                                    {budget.isActive ? (budget.period === 'MONTHLY' ? 'Mensual' : 'Personal') : 'Pausado'}
                                </span>
                                {status === 'exceeded' && (
                                    <span className="text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Excedido
                                    </span>
                                )}
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => onEdit?.(budget)}><Edit2 className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleToggleActive}>
                                    {budget.isActive ? <><Pause className="mr-2 h-3.5 w-3.5" /> Pausar</> : <><Play className="mr-2 h-3.5 w-3.5" /> Activar</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Main Numbers: Left-Aligned for quick scanning */}
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            {/* Primary Number: AVAILABLE (Psychological Safety) or SPENT? 
                                Expert View: "Available" is actionable. "Spent" is historical.
                                Let's show AVAILABLE big if healthy, OVERSPENT big if not.
                             */}
                            <span className={cn(
                                "text-2xl font-bold tracking-tight title-font",
                                status === 'exceeded' ? "text-red-500" : "text-foreground"
                            )}>
                                {formatMoney(remaining)}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground/70">
                                {remaining >= 0 ? 'disponibles' : 'excedidos'}
                            </span>
                        </div>

                        {/* Context: Total Spend */}
                        <div className="text-xs text-muted-foreground font-medium flex justify-between items-center">
                            <span>Gastado: {formatMoney(spent)}</span>
                            <span>Límite: {formatMoney(limit)}</span>
                        </div>
                    </div>

                    {/* Minimalist Progress Bar */}
                    <div className="space-y-1.5">
                        <Progress
                            value={Math.min(percentage, 100)}
                            className="h-1.5 bg-secondary" // Ultra thin, classy
                            indicatorColor={accentColor}
                        />
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
                            <span>{percentage.toFixed(0)}%</span>
                            {/* Smart Status Label */}
                            <span className={cn(
                                status === 'exceeded' && "text-red-500",
                                status === 'warning' && "text-amber-500",
                                status === 'healthy' && "text-emerald-500"
                            )}>
                                {status === 'healthy' ? 'En orden' :
                                    status === 'exceeded' ? 'Atención' :
                                        status === 'goal-achieved' ? 'Completado' : 'Cuidado'}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
