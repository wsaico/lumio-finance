"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { BudgetWizardAdvanced } from "@/components/budgets/budget-wizard-advanced"
import { BudgetCardPremium } from "@/components/budgets/budget-card-premium"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, TrendingUp, TrendingDown, Wallet, XCircle, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBudgetRefresh } from "@/hooks/use-budget-refresh"
import { toast } from "sonner"
import { useSettingsStore } from "@/hooks/use-settings-store"

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
        if (percentage >= 100) return 'goal-achieved'
        if (percentage >= 75) return 'warning'
        return 'healthy'
    }
}

export default function BudgetsPage() {
    const { currencyCode } = useSettingsStore()
    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [editingBudget, setEditingBudget] = useState<any>(null)
    const [budgets, setBudgets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const alertsShownRef = useRef<Set<string>>(new Set())

    // Optimized: Does NOT set isLoading(true) to avoid UI flicker on updates
    const fetchBudgets = useCallback(async () => {
        try {
            const res = await fetch('/api/budgets')
            if (res.ok) {
                const data = await res.json()
                setBudgets(data)
            }
        } catch (error) {
            console.error('Failed to fetch budgets:', error)
        }
    }, [])

    // Auto-refresh when transactions change or every 30s
    useBudgetRefresh(fetchBudgets, true)

    // CENTRALIZED ALERT SYSTEM - Only place where budget alerts are shown
    useEffect(() => {
        if (isLoading || budgets.length === 0) return

        const symbolMap: Record<string, string> = { 'PEN': 'S/.', 'USD': '$', 'EUR': '€', 'MXN': '$' }
        const symbol = symbolMap[currencyCode] || '$'

        budgets.forEach(budget => {
            if (!budget.isActive) return

            const stats = budget.stats
            const percentage = stats?.percentage || 0
            const remaining = stats?.remaining || 0
            const status = getBudgetStatus(percentage, budget.type)

            // Create unique alert key
            const alertKey = `${budget.id}-${status}`

            // Skip if already shown
            if (alertsShownRef.current.has(alertKey)) return

            // Show alerts based on status
            if (budget.type === 'EXPENSE') {
                if (status === 'exceeded') {
                    toast.error(`¡PRESUPUESTO EXCEDIDO!`, {
                        id: alertKey,
                        description: `"${budget.name}" ha superado el límite en ${symbol}${Math.abs(remaining).toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
                        icon: <XCircle className="h-5 w-5" />,
                        duration: 10000,
                    })
                    alertsShownRef.current.add(alertKey)
                } else if (status === 'critical') {
                    toast.error(`¡Alerta Crítica!`, {
                        id: alertKey,
                        description: `"${budget.name}" está al ${percentage.toFixed(0)}% (${symbol}${Math.abs(remaining).toLocaleString('es-PE', { minimumFractionDigits: 0 })} ${remaining >= 0 ? 'restante' : 'excedido'})`,
                        icon: <ShieldAlert className="h-5 w-5" />,
                        duration: 8000,
                    })
                    alertsShownRef.current.add(alertKey)
                } else if (status === 'danger') {
                    toast.warning(`Presupuesto en riesgo`, {
                        id: alertKey,
                        description: `"${budget.name}" está al ${percentage.toFixed(0)}%. Te quedan ${symbol}${remaining.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`,
                        icon: <AlertTriangle className="h-5 w-5" />,
                        duration: 6000,
                    })
                    alertsShownRef.current.add(alertKey)
                }
            } else if (budget.type === 'SAVINGS') {
                if (status === 'goal-achieved') {
                    toast.success(`¡Meta de ahorro alcanzada!`, {
                        id: alertKey,
                        description: `¡Felicitaciones! Has completado "${budget.name}"`,
                        icon: <CheckCircle2 className="h-5 w-5" />,
                        duration: 8000,
                    })
                    alertsShownRef.current.add(alertKey)
                }
            }
        })
    }, [budgets, isLoading, currencyCode])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchBudgets()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    // Initial Load Logic
    useEffect(() => {
        const init = async () => {
            setIsLoading(true)
            await fetchBudgets()
            setIsLoading(false)
        }
        init()
    }, [fetchBudgets])

    const handleEdit = (budget: any) => {
        setEditingBudget(budget)
        setIsWizardOpen(true)
    }

    const handleDuplicate = async (budget: any) => {
        try {
            const duplicateData = {
                ...budget,
                name: `${budget.name} (Copia)`,
                id: undefined,
                spent: undefined,
                stats: undefined,
                createdAt: undefined,
                updatedAt: undefined,
            }

            const res = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(duplicateData)
            })

            if (res.ok) {
                await fetchBudgets()
            }
        } catch (error) {
            console.error('Failed to duplicate budget:', error)
        }
    }

    const handleDelete = async (id: string) => {
        // Optimistic UI Update
        const previousBudgets = [...budgets]
        setBudgets(prev => prev.filter(b => b.id !== id))

        try {
            const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
        } catch (error) {
            // Revert if failed
            setBudgets(previousBudgets)
            console.error('Failed to delete budget', error)
        }
    }

    const handleToggleActive = async (id: string, isActive: boolean) => {
        // Optimistic UI Update
        setBudgets(prev => prev.map(b =>
            b.id === id ? { ...b, isActive } : b
        ))

        try {
            await fetch(`/api/budgets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: isActive })
            })
        } catch (error) {
            console.error('Failed to toggle active', error)
        }
    }

    const handleWizardClose = () => {
        setIsWizardOpen(false)
        setEditingBudget(null)
    }

    // Calculate stats
    const totalBudgets = budgets.length
    const activeBudgets = budgets.filter(b => b.isActive).length
    const expenseBudgets = budgets.filter(b => b.type === 'EXPENSE')
    const savingsBudgets = budgets.filter(b => b.type === 'SAVINGS')

    return (
        <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header with stats */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            Presupuestos
                        </h1>
                        <p className="text-muted-foreground mt-1.5">
                            Controla tus gastos y alcanza tus metas de ahorro
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className={cn(isRefreshing && "animate-spin")}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={() => setIsWizardOpen(true)}
                            className="gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus className="h-4 w-4" /> Nuevo Presupuesto
                        </Button>
                    </div>
                </div>

                {/* Stats cards */}
                {budgets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-card border rounded-lg p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-medium">Total</span>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-2xl font-bold">{totalBudgets}</div>
                            <p className="text-xs text-muted-foreground">
                                {activeBudgets} activos
                            </p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-medium">Gastos</span>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </div>
                            <div className="text-2xl font-bold">{expenseBudgets.length}</div>
                            <p className="text-xs text-muted-foreground">
                                presupuestos
                            </p>
                        </div>

                        <div className="bg-card border rounded-lg p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground font-medium">Ahorros</span>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </div>
                            <div className="text-2xl font-bold">{savingsBudgets.length}</div>
                            <p className="text-xs text-muted-foreground">
                                metas
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-primary font-medium">En riesgo</span>
                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                    {budgets.filter(b => b.stats?.percentage >= 80 && b.type === 'EXPENSE').length}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-primary">
                                {budgets.filter(b => b.stats?.percentage >= 100 && b.type === 'EXPENSE').length}
                            </div>
                            <p className="text-xs text-primary/80">
                                excedidos
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Budgets grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-56 rounded-xl bg-muted/20 animate-pulse" />
                    ))}
                </div>
            ) : budgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
                    <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                        <Plus className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">No tienes presupuestos activos</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-2 mb-6">
                        Crea tu primer presupuesto para tomar el control total de tus finanzas.
                    </p>
                    <Button onClick={() => setIsWizardOpen(true)} className="shadow-lg">
                        <Plus className="mr-2 h-4 w-4" /> Crear Presupuesto
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgets.map(budget => (
                        <BudgetCardPremium
                            key={budget.id}
                            budget={budget}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                            onToggleActive={handleToggleActive}
                            onRefresh={fetchBudgets}
                        />
                    ))}
                </div>
            )}

            {/* Wizard */}
            <BudgetWizardAdvanced
                open={isWizardOpen}
                onOpenChange={handleWizardClose}
                onComplete={fetchBudgets}
                editingBudget={editingBudget}
            />
        </div>
    )
}
