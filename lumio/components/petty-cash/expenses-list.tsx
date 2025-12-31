"use client"

import { usePettyCashExpenses, useUpdatePettyCashExpense } from "@/hooks/use-petty-cash"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Receipt, ReceiptText, AlertCircle, CheckCircle2, Clock, XCircle, Check, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSettingsStore } from "@/hooks/use-settings-store"

interface ExpensesListProps {
    fundId?: string
}

export function ExpensesList({ fundId }: ExpensesListProps) {
    const { data: expenses, isLoading } = usePettyCashExpenses(fundId)
    const { mutate: updateStatus, isPending: isUpdating } = useUpdatePettyCashExpense()
    const { pettyCashSimpleMode } = useSettingsStore()

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!expenses || expenses.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border-dashed border-2 rounded-lg">
                No hay gastos registrados.
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Aprobado</Badge>
            case 'PENDING':
                return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
            case 'REJECTED':
                return <Badge variant="destructive">Rechazado</Badge>
            case 'SETTLED':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Liquidado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-3">
            {expenses.map((expense: any) => (
                <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg shrink-0">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{expense.description}</span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                    {expense.expenseCode}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(expense.expenseDate), "d 'de' MMMM", { locale: es })}</span>
                                <span>•</span>
                                <span>{expense.vendor || "Sin proveedor"}</span>
                                {expense.fund && (
                                    <>
                                        <span>•</span>
                                        <span className="font-medium text-primary/80">{expense.fund.fundName}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-lg">
                            S/ {Number(expense.amount).toFixed(2)}
                        </span>
                        {getStatusBadge(expense.status)}
                    </div>

                    {/* Approval Actions */}
                    {expense.status === 'PENDING' && !pettyCashSimpleMode && (
                        <div className="flex items-center gap-2 ml-4 pl-4 border-l h-12">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                onClick={() => updateStatus({ id: expense.id, status: 'APPROVED' })}
                                disabled={isUpdating}
                                title="Aprobar Gasto"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/5 border-destructive/20"
                                onClick={() => updateStatus({ id: expense.id, status: 'REJECTED' })}
                                disabled={isUpdating}
                                title="Rechazar Gasto"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
