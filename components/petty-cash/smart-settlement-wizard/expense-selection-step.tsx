"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ChevronRight, Receipt, CheckCircle2, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePettyCashExpenses, useUpdatePettyCashExpense } from "@/hooks/usePettyCash"
import { CategoryIcon } from "@/components/icons/category-icon"
import { toast } from "sonner"

interface ExpenseSelectionStepProps {
    fundId: string
    fundCode: string
    onNext: (data: { expenseIds: string[] }) => void
    onBack: () => void
}

export function ExpenseSelectionStep({ fundId, fundCode, onNext, onBack }: ExpenseSelectionStepProps) {
    const { data: approvedExpenses, isLoading: loadingApproved, refetch: refetchApproved } = usePettyCashExpenses(fundId, 'APPROVED', 'null')
    const { data: pendingExpenses, isLoading: loadingPending, refetch: refetchPending } = usePettyCashExpenses(fundId, 'PENDING', 'null')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const { mutateAsync: updateExpense, isPending: isUpdating } = useUpdatePettyCashExpense()
    const [approvingId, setApprovingId] = useState<string | null>(null)

    const toggleExpense = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        )
    }

    const handleApproveExpense = async (expenseId: string) => {
        setApprovingId(expenseId)
        try {
            await updateExpense({
                id: expenseId,
                status: 'APPROVED'
            })
            toast.success("Gasto aprobado")
            // Refetch both lists
            await Promise.all([refetchApproved(), refetchPending()])
        } catch (error: any) {
            toast.error(error.message || "Error al aprobar gasto")
        } finally {
            setApprovingId(null)
        }
    }

    const selectedExpenses = approvedExpenses?.filter((e: any) => selectedIds.includes(e.id)) || []
    const total = selectedExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    const handleContinue = () => {
        if (selectedIds.length > 0) {
            onNext({ expenseIds: selectedIds })
        }
    }

    const isLoading = loadingApproved || loadingPending
    const hasPendingExpenses = pendingExpenses && pendingExpenses.length > 0
    const hasApprovedExpenses = approvedExpenses && approvedExpenses.length > 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-border/40 px-4 py-3 flex items-center gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="rounded-full w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">Liquidar Fondo {fundCode}</h1>
                    <p className="text-xs text-muted-foreground">Paso 3 de 4 • Selección de Gastos</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto p-6 md:p-12">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-4xl font-black mb-3">
                        Selecciona los Gastos
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        {selectedIds.length > 0 ? (
                            <span className="font-bold text-orange-600">
                                {selectedIds.length} gasto(s) • S/ {total.toFixed(2)}
                            </span>
                        ) : (
                            "Toca los gastos que deseas liquidar"
                        )}
                    </p>
                </div>

                {/* Pending Expenses Alert */}
                {hasPendingExpenses && (
                    <Card className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                                <Receipt className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-amber-900 dark:text-amber-100">
                                    {pendingExpenses.length} gasto(s) pendiente(s) de validación
                                </p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Apruébalos abajo para incluirlos en la liquidación
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Summary Card - Sticky */}
                {selectedIds.length > 0 && (
                    <Card className="sticky top-20 z-40 p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white mb-6 shadow-xl shadow-orange-500/20 animate-in slide-in-from-top-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90 font-medium">Total a Liquidar</p>
                                <p className="text-xs opacity-75">{selectedIds.length} comprobante(s) seleccionado(s)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-black">S/ {total.toFixed(2)}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds([])}
                                className="text-white hover:bg-white/20"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Limpiar
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Expenses List */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando gastos...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Pending Expenses Section */}
                        {hasPendingExpenses && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Pendientes de Validación ({pendingExpenses.length})
                                </h3>
                                {pendingExpenses.map((expense: any) => {
                                    const amount = Number(expense.amount)
                                    const isApproving = approvingId === expense.id

                                    return (
                                        <Card
                                            key={expense.id}
                                            className="p-5 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Icon */}
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/30">
                                                    <Receipt className="w-6 h-6 text-amber-600" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className="font-bold text-base truncate">{expense.description}</h4>
                                                        <Badge variant="outline" className="font-mono text-xs shrink-0 border-amber-500 text-amber-700">
                                                            {expense.expenseCode}
                                                        </Badge>
                                                        <Badge className="bg-amber-500 text-white text-xs">
                                                            PENDIENTE
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                                        <span>{new Date(expense.expenseDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        {expense.vendor && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="font-medium">{expense.vendor}</span>
                                                            </>
                                                        )}
                                                        {expense.receiptType && expense.receiptNumber && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="font-mono text-xs">
                                                                    {expense.receiptType}: {expense.receiptNumber}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount & Actions */}
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-amber-600">
                                                            S/ {amount.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApproveExpense(expense.id)}
                                                        disabled={isApproving || isUpdating}
                                                        className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                                                    >
                                                        {isApproving ? (
                                                            <>Aprobando...</>
                                                        ) : (
                                                            <>
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Aprobar
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}

                        {/* Approved Expenses Section */}
                        {hasApprovedExpenses && (
                            <div className="space-y-3">
                                {hasPendingExpenses && (
                                    <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mt-8">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Aprobados ({approvedExpenses.length})
                                    </h3>
                                )}
                                <div className="grid gap-3">
                                    {approvedExpenses.map((expense: any) => {
                                        const isSelected = selectedIds.includes(expense.id)
                                        const amount = Number(expense.amount)

                                        return (
                                            <Card
                                                key={expense.id}
                                                className={cn(
                                                    "p-5 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] relative overflow-hidden",
                                                    isSelected && "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-lg shadow-orange-500/10"
                                                )}
                                                onClick={() => toggleExpense(expense.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Checkbox Visual */}
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                                                        isSelected
                                                            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                                            : "bg-slate-100 dark:bg-zinc-800"
                                                    )}>
                                                        {isSelected ? (
                                                            <CheckCircle2 className="w-6 h-6" />
                                                        ) : (
                                                            <Receipt className="w-6 h-6" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <h4 className="font-bold text-base truncate">{expense.description}</h4>
                                                            <Badge variant="outline" className="font-mono text-xs shrink-0">
                                                                {expense.expenseCode}
                                                            </Badge>
                                                            {expense.categoryIcon && (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <CategoryIcon name={expense.categoryIcon} className="w-3 h-3" />
                                                                    <span>{expense.categoryName}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                                            <span>{new Date(expense.expenseDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            {expense.vendor && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-medium">{expense.vendor}</span>
                                                                </>
                                                            )}
                                                            {expense.receiptType && expense.receiptNumber && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="font-mono text-xs">
                                                                        {expense.receiptType}: {expense.receiptNumber}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="text-right shrink-0">
                                                        <p className={cn(
                                                            "text-2xl font-black transition-colors",
                                                            isSelected ? "text-orange-600" : "text-slate-900 dark:text-white"
                                                        )}>
                                                            S/ {amount.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* No Expenses */}
                        {!hasApprovedExpenses && !hasPendingExpenses && (
                            <div className="text-center py-16">
                                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <Receipt className="w-12 h-12 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">No hay gastos disponibles</h3>
                                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                    No hay gastos en este fondo para liquidar.
                                    <br />
                                    Crea gastos primero desde la página principal.
                                </p>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={onBack}
                                    className="h-14 px-8 rounded-2xl"
                                >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Volver a Selección de Fondo
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                {hasApprovedExpenses && (
                    <div className="flex gap-4 mt-12">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            className="h-14 px-8 rounded-2xl"
                        >
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Atrás
                        </Button>
                        <Button
                            onClick={handleContinue}
                            disabled={selectedIds.length === 0}
                            className="flex-1 h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                        >
                            Continuar con {selectedIds.length} gasto(s)
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
