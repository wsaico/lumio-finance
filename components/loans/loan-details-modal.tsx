"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    CheckCircle2,
    ArrowUpRight,
    ArrowDownLeft,
    Mail,
    Phone,
    FileText,
    History,
    Trash2,
    Clock,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountReceivable, AccountPayable } from "@/types/loans"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { formatPaymentFrequency, parseLocalDate } from "@/lib/loans"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PaymentModal, type PaymentFormData } from "./payment-modal"
import { useUpdateAccountReceivable } from "@/hooks/useAccountsReceivable"
import { useUpdateAccountPayable } from "@/hooks/useAccountsPayable"

interface LoanDetailsModalProps {
    open: boolean
    onClose: () => void
    loan: ((AccountReceivable | AccountPayable) & { type: "RECEIVABLE" | "PAYABLE" }) | null
}

function formatSafeDate(value?: string | null, pattern = "dd MMM yyyy"): string {
    const parsed = parseLocalDate(value)
    return parsed ? format(parsed, pattern, { locale: es }) : "N/A"
}

function formatPaymentMethodLabel(method?: string | null): string | null {
    switch (method) {
        case "CASH":
            return "Efectivo"
        case "TRANSFER":
            return "Transferencia"
        case "CARD":
            return "Tarjeta"
        case "CHECK":
            return "Cheque"
        case "OTHER":
            return "Otro"
        default:
            return null
    }
}

export function LoanDetailsModal({ open, onClose, loan }: LoanDetailsModalProps) {
    const { formatMoney } = useFormat()
    const queryClient = useQueryClient()
    const [showDeleteAlert, setShowDeleteAlert] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    const updateReceivable = useUpdateAccountReceivable()
    const updatePayable = useUpdateAccountPayable()

    if (!loan) return null

    const isReceivable = loan.type === "RECEIVABLE"
    const isOverdue = loan.status === "OVERDUE"
    const isCompleted = isReceivable ? loan.status === "COLLECTED" : loan.status === "PAID"
    const percentPaid = Math.min(100, Math.max(0, loan.percentPaid || 0))

    const statusConfig = {
        PENDING: { label: "Pendiente", color: "bg-zinc-500" },
        PARTIAL: { label: "En Proceso", color: "bg-blue-500" },
        COLLECTED: { label: "Completado", color: "bg-emerald-500" },
        PAID: { label: "Pagado", color: "bg-emerald-500" },
        OVERDUE: { label: "Vencido", color: "bg-rose-500" },
        CANCELLED: { label: "Cancelado", color: "bg-zinc-400" },
    }

    const currentStatus = statusConfig[loan.status] || statusConfig.PENDING

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const endpoint = isReceivable
                ? `/api/accounts-receivable?id=${loan.id}`
                : `/api/accounts-payable?id=${loan.id}`

            const res = await fetch(endpoint, { method: "DELETE" })
            if (!res.ok) throw new Error("Error al eliminar")

            toast.success("Préstamo eliminado correctamente", {
                description: "Se han revertido los saldos y transacciones.",
            })

            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] })
            queryClient.invalidateQueries({ queryKey: ["accounts-payable"] })
            queryClient.invalidateQueries({ queryKey: ["accounts"] })
            queryClient.invalidateQueries({ queryKey: ["transactions"] })
            queryClient.invalidateQueries({ queryKey: ["budgets"] })

            onClose()
        } catch {
            toast.error("No se pudo eliminar el préstamo")
        } finally {
            setIsDeleting(false)
            setShowDeleteAlert(false)
        }
    }

    const handlePaymentSubmit = async (data: PaymentFormData) => {
        try {
            const payload = {
                id: loan.id,
                paymentAmount: data.paymentAmount,
                principalAmount: data.principalAmount,
                interestAmount: data.interestAmount,
                accountId: data.accountId,
                paymentMethod: data.paymentMethod,
                notes: data.notes,
            }

            if (isReceivable) {
                await updateReceivable.mutateAsync(payload)
            } else {
                await updatePayable.mutateAsync(payload)
            }
            setShowPaymentModal(false)
        } catch (error) {
            console.error("Error registering payment:", error)
        }
    }

    const installments = [...((loan as any).installments || [])].sort(
        (a: any, b: any) => a.installmentNumber - b.installmentNumber
    )
    const nextPendingInstallment = installments.find(
        (i: any) => i.status !== "PAID" && i.status !== "CANCELLED"
    )

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-card border border-border/60 shadow-2xl rounded-3xl h-[88dvh] flex flex-col">
                    {/* Header */}
                    <div
                        className={cn(
                            "relative px-6 sm:px-8 py-6 shrink-0 text-white",
                            isReceivable
                                ? "bg-gradient-to-br from-indigo-600 to-blue-600"
                                : "bg-gradient-to-br from-amber-500 to-orange-600"
                        )}
                    >
                        <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                            {isReceivable ? (
                                <ArrowUpRight className="w-40 h-40" />
                            ) : (
                                <ArrowDownLeft className="w-40 h-40" />
                            )}
                        </div>

                        <div className="relative z-10 flex justify-between items-start gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Badge
                                        variant="secondary"
                                        className="bg-white/20 text-white border-0 backdrop-blur-md"
                                    >
                                        {isReceivable ? "Préstamo Otorgado" : "Préstamo Recibido"}
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className={cn("text-white border-0", currentStatus.color)}
                                    >
                                        {currentStatus.label}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                                    {loan.contactName}
                                </DialogTitle>
                                {(loan.contactEmail || loan.contactPhone) && (
                                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-white/85 font-medium">
                                        {loan.contactEmail && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" /> {loan.contactEmail}
                                            </span>
                                        )}
                                        {loan.contactPhone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3.5 h-3.5" /> {loan.contactPhone}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-bold opacity-80 uppercase tracking-wide">
                                    Monto Original
                                </p>
                                <p className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                                    {formatMoney(loan.originalAmount, loan.currencyCode)}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-5 relative">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5 opacity-90">
                                <span>Progreso de {isReceivable ? "Cobro" : "Pago"}</span>
                                <span className="tabular-nums">{percentPaid.toFixed(0)}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-black/25 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${percentPaid}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-card min-h-0">
                        <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full min-h-0">
                            <div className="px-6 py-3.5 border-b border-border/50">
                                <TabsList className="w-full justify-start h-auto p-1 bg-muted/70 rounded-xl">
                                    <TabsTrigger
                                        value="overview"
                                        className="flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                                    >
                                        Resumen
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="installments"
                                        className="flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                                    >
                                        Cronograma ({installments.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                                    >
                                        Historial ({loan.payments?.length || 0})
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1 h-full">
                                <div className="px-6 py-4 pb-10">
                                    <TabsContent value="overview" className="mt-0 space-y-5">
                                        {/* Key Stats */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 sm:p-5 bg-muted/35 rounded-2xl border border-border/60 relative overflow-hidden">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-500/15 absolute top-3 right-3" />
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                                    Total {isReceivable ? "Cobrado" : "Pagado"}
                                                </span>
                                                <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
                                                    {formatMoney(loan.totalPaid || 0, loan.currencyCode)}
                                                </p>
                                            </div>
                                            <div className="p-4 sm:p-5 bg-muted/35 rounded-2xl border border-border/60 relative overflow-hidden">
                                                <Clock
                                                    className={cn(
                                                        "w-10 h-10 absolute top-3 right-3 opacity-15",
                                                        isOverdue ? "text-rose-500" : "text-indigo-500"
                                                    )}
                                                />
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block mb-1.5">
                                                    Saldo Pendiente
                                                </span>
                                                <p
                                                    className={cn(
                                                        "text-xl sm:text-2xl font-black tabular-nums",
                                                        isOverdue
                                                            ? "text-rose-600 dark:text-rose-400"
                                                            : "text-indigo-600 dark:text-indigo-400"
                                                    )}
                                                >
                                                    {formatMoney(
                                                        loan.outstandingBalance,
                                                        loan.currencyCode
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Details Card */}
                                        <div className="bg-muted/25 rounded-2xl border border-border/60 overflow-hidden">
                                            <div className="px-5 py-3.5 border-b border-border/60 bg-muted/40">
                                                <h3 className="text-sm font-extrabold flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    Detalles del Contrato
                                                </h3>
                                            </div>
                                            <div className="p-5 grid grid-cols-2 gap-y-5 gap-x-6">
                                                <div>
                                                    <span className="text-[11px] text-muted-foreground font-bold uppercase block mb-0.5">
                                                        Fecha Inicio
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {formatSafeDate(loan.loanDate)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] text-muted-foreground font-bold uppercase block mb-0.5">
                                                        Vencimiento Final
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {formatSafeDate(loan.dueDate)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] text-muted-foreground font-bold uppercase block mb-0.5">
                                                        Tasa Interés
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                                        {loan.interestRate || 0}%
                                                        <Badge variant="outline" className="text-[10px] h-5">
                                                            {loan.interestType === "COMPOUND"
                                                                ? "Compuesto"
                                                                : "Simple"}
                                                        </Badge>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] text-muted-foreground font-bold uppercase block mb-0.5">
                                                        Frecuencia
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {formatPaymentFrequency(loan.paymentFrequency)}
                                                    </span>
                                                </div>
                                                {loan.notes && (
                                                    <div className="col-span-2 pt-3 border-t border-dashed border-border">
                                                        <span className="text-[11px] text-muted-foreground font-bold uppercase block mb-1">
                                                            Notas
                                                        </span>
                                                        <p className="text-sm text-foreground italic">
                                                            &ldquo;{loan.notes}&rdquo;
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="installments" className="mt-0">
                                        <div className="bg-muted/20 rounded-2xl border border-border/60 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50 border-b border-border/60">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-muted-foreground">
                                                            #
                                                        </th>
                                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-muted-foreground">
                                                            Fecha
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-bold text-xs uppercase text-muted-foreground">
                                                            Monto
                                                        </th>
                                                        <th className="px-4 py-3 text-center font-bold text-xs uppercase text-muted-foreground">
                                                            Estado
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {installments.map((inst: any) => (
                                                        <tr
                                                            key={inst.id}
                                                            className="hover:bg-muted/40 transition-colors"
                                                        >
                                                            <td className="px-4 py-3 font-bold text-muted-foreground tabular-nums">
                                                                {inst.installmentNumber}
                                                            </td>
                                                            <td className="px-4 py-3 text-foreground font-medium">
                                                                {formatSafeDate(inst.dueDate)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">
                                                                {formatMoney(
                                                                    inst.totalAmount,
                                                                    loan.currencyCode
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={cn(
                                                                        "h-5 text-[10px] uppercase font-bold border-0",
                                                                        inst.status === "PAID"
                                                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                                                            : inst.status === "OVERDUE"
                                                                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                                                                              : "bg-muted text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {inst.status === "PAID"
                                                                        ? "Pagado"
                                                                        : inst.status === "OVERDUE"
                                                                          ? "Vencido"
                                                                          : "Pendiente"}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {installments.length === 0 && (
                                                        <tr>
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-8 text-center text-muted-foreground italic"
                                                            >
                                                                No hay cronograma generado para este préstamo.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="history" className="mt-0">
                                        {loan.payments && loan.payments.length > 0 ? (
                                            <div className="relative pl-4 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                                                {loan.payments.map((payment) => (
                                                    <div key={payment.id} className="relative pl-7">
                                                        <div
                                                            className={cn(
                                                                "absolute left-0 top-2 w-6 h-6 rounded-full border-4 border-card shadow-xs z-10",
                                                                isReceivable
                                                                    ? "bg-indigo-500"
                                                                    : "bg-amber-500"
                                                            )}
                                                        />
                                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/60">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div>
                                                                    <span className="text-lg font-black tabular-nums block">
                                                                        {formatMoney(
                                                                            payment.amount,
                                                                            payment.currencyCode
                                                                        )}
                                                                    </span>
                                                                    <div className="flex gap-3 text-[11px] font-bold mt-1">
                                                                        {(payment.principalAmount || 0) > 0 && (
                                                                            <span className="text-muted-foreground">
                                                                                Capital:{" "}
                                                                                {formatMoney(
                                                                                    payment.principalAmount || 0,
                                                                                    payment.currencyCode
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                        {(payment.interestAmount || 0) > 0 && (
                                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                                Interés:{" "}
                                                                                {formatMoney(
                                                                                    payment.interestAmount || 0,
                                                                                    payment.currencyCode
                                                                                )}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="text-xs font-bold text-muted-foreground bg-card border border-border/60 px-2.5 py-1 rounded-lg">
                                                                        {formatSafeDate(
                                                                            payment.paymentDate,
                                                                            "dd MMM yyyy"
                                                                        )}
                                                                    </span>
                                                                    {formatPaymentMethodLabel(payment.paymentMethod) && (
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                                            {formatPaymentMethodLabel(payment.paymentMethod)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {payment.notes && (
                                                                <p className="text-xs text-muted-foreground mt-2.5 bg-card/70 p-2 rounded-lg italic border border-border/40">
                                                                    &ldquo;{payment.notes}&rdquo;
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                <History className="w-10 h-10 mb-2 opacity-50" />
                                                <p className="text-sm font-semibold">
                                                    No hay pagos registrados todavía
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </Tabs>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 sm:p-5 border-t border-border/60 bg-card flex justify-between items-center shrink-0 z-20">
                        {showDeleteAlert ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-rose-600">
                                    ¿Revertir y eliminar?
                                </span>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="rounded-xl"
                                >
                                    {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowDeleteAlert(false)}
                                    className="rounded-xl"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
                                onClick={() => setShowDeleteAlert(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Eliminar
                            </Button>
                        )}

                        <div className="flex gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="rounded-xl border-border"
                            >
                                Cerrar
                            </Button>
                            {!isCompleted && (
                                <Button
                                    type="button"
                                    onClick={() => setShowPaymentModal(true)}
                                    className={cn(
                                        "rounded-xl shadow-md text-white border-0 font-bold",
                                        isReceivable
                                            ? "bg-indigo-600 hover:bg-indigo-700"
                                            : "bg-amber-500 hover:bg-amber-600"
                                    )}
                                >
                                    {isReceivable ? "Registrar Cobro" : "Registrar Pago"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleting}>
                <AlertDialogContent className="z-[1000] bg-card rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminando Préstamo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Revirtiendo transacciones y actualizando los saldos de tus cuentas...
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>

            <PaymentModal
                open={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSubmit={handlePaymentSubmit}
                loan={{
                    id: loan.id,
                    contactName: loan.contactName,
                    outstandingBalance: loan.outstandingBalance,
                    currencyCode: loan.currencyCode,
                    type: loan.type,
                    paymentFrequency: (loan as any).paymentFrequency,
                    nextInstallment: nextPendingInstallment
                        ? {
                              number: nextPendingInstallment.installmentNumber,
                              amount: nextPendingInstallment.totalAmount,
                              dueDate: nextPendingInstallment.dueDate,
                              principal: nextPendingInstallment.principalAmount,
                              interest: nextPendingInstallment.interestAmount,
                          }
                        : null,
                }}
                isLoading={updateReceivable.isPending || updatePayable.isPending}
            />
        </>
    )
}
