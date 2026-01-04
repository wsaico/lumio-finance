"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    User,
    Calendar,
    CheckCircle2,
    ArrowDownRight,
    ArrowUpRight,
    ArrowDownLeft,
    Mail,
    Phone,
    FileText,
    History,
    Trash2,
    Building,
    AlertTriangle,
    Banknote,
    Clock
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountReceivable, AccountPayable, LoanPayment } from "@/types/loans"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/use-format"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
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
import { PaymentModal, type PaymentFormData } from "./payment-modal"
import { useUpdateAccountReceivable } from "@/hooks/use-accounts-receivable"
import { useUpdateAccountPayable } from "@/hooks/use-accounts-payable"

interface LoanDetailsModalProps {
    open: boolean
    onClose: () => void
    loan: (AccountReceivable | AccountPayable) & { type: 'RECEIVABLE' | 'PAYABLE' } | null
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

    const isReceivable = loan.type === 'RECEIVABLE'
    const isOverdue = loan.status === 'OVERDUE'
    const isCompleted = isReceivable ? loan.status === 'COLLECTED' : loan.status === 'PAID'
    const percentPaid = loan.percentPaid || 0

    const statusConfig = {
        PENDING: { label: 'Pendiente', color: 'bg-zinc-500' },
        PARTIAL: { label: 'En Proceso', color: 'bg-blue-500' },
        COLLECTED: { label: 'Completado', color: 'bg-green-500' },
        PAID: { label: 'Pagado', color: 'bg-green-500' },
        OVERDUE: { label: 'Vencido', color: 'bg-red-500' },
        CANCELLED: { label: 'Cancelado', color: 'bg-zinc-400' },
    }

    const currentStatus = statusConfig[loan.status] || statusConfig.PENDING

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const endpoint = isReceivable
                ? `/api/accounts-receivable?id=${loan.id}`
                : `/api/accounts-payable?id=${loan.id}`

            const res = await fetch(endpoint, { method: 'DELETE' })

            if (!res.ok) throw new Error("Error al eliminar")

            toast.success("Préstamo eliminado correctamente", {
                description: "Se han revertido los saldos y transacciones."
            })

            queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })

            onClose()
        } catch (error) {
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
                notes: data.notes
            }

            if (isReceivable) {
                await updateReceivable.mutateAsync(payload)
                toast.success("Cobro registrado exitosamente")
            } else {
                await updatePayable.mutateAsync(payload)
                toast.success("Pago registrado exitosamente")
            }
            setShowPaymentModal(false)
        } catch (error) {
            console.error("Error registering payment:", error)
            toast.error("Error al registrar el movimiento")
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-none shadow-2xl rounded-3xl h-[90vh] flex flex-col">

                    {/* Header */}
                    <div className={cn(
                        "relative px-8 py-6 flex-shrink-0",
                        isReceivable
                            ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white"
                            : "bg-gradient-to-br from-orange-500 to-amber-600 text-white"
                    )}>
                        {/* Background Icon */}
                        <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                            {isReceivable ? <ArrowUpRight className="w-48 h-48" /> : <ArrowDownLeft className="w-48 h-48" />}
                        </div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1 opacity-90">
                                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                                        {isReceivable ? 'Préstamo Otorgado' : 'Préstamo Recibido'}
                                    </Badge>
                                    <Badge variant="secondary" className={cn("text-white border-0 backdrop-blur-md", currentStatus.color)}>
                                        {currentStatus.label}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-3xl font-black tracking-tight text-white">
                                    {loan.contactName}
                                </DialogTitle>
                                <div className="flex gap-4 mt-2 text-sm text-blue-50 dark:text-blue-100 opacity-90 font-medium">
                                    {loan.contactEmail && (
                                        <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {loan.contactEmail}</span>
                                    )}
                                    {loan.contactPhone && (
                                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {loan.contactPhone}</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium opacity-80 uppercase tracking-wide">Monto Original</p>
                                <p className="text-3xl font-black tracking-tight">
                                    {formatMoney(loan.originalAmount, loan.currencyCode)}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar in Header */}
                        <div className="mt-6 relative">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 opacity-90">
                                <span>Progreso de Pago</span>
                                <span>{percentPaid.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                                <div
                                    className="h-full bg-white shadow-lg transition-all duration-1000 ease-out"
                                    style={{ width: `${percentPaid}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Content Links */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950/50 min-h-0">
                        <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full min-h-0">
                            <div className="px-6 py-4">
                                <TabsList className="w-full justify-start h-auto p-1 bg-zinc-200/50 dark:bg-black/20 rounded-xl">
                                    <TabsTrigger
                                        value="overview"
                                        className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                                    >
                                        Resumen
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="installments"
                                        className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                                    >
                                        Cronograma
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="history"
                                        className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                                    >
                                        Historial
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <ScrollArea className="flex-1 h-full">
                                <div className="px-6 pb-32">
                                    <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in-0 slide-in-from-bottom-3 duration-500">

                                        {/* Key Stats */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Total Pagado</span>
                                                    </div>
                                                    <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                                        {formatMoney(loan.totalPaid, loan.currencyCode)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Clock className={cn("w-12 h-12", isOverdue ? "text-red-500" : "text-blue-500")} />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Pendiente</span>
                                                    </div>
                                                    <p className={cn(
                                                        "text-2xl font-black tracking-tight",
                                                        isOverdue ? "text-red-600" : "text-blue-600"
                                                    )}>
                                                        {formatMoney(loan.outstandingBalance, loan.currencyCode)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Card */}
                                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
                                                <h3 className="font-bold flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-zinc-400" />
                                                    Detalles del Contrato
                                                </h3>
                                            </div>
                                            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8">
                                                <div>
                                                    <span className="text-xs text-zinc-500 font-medium uppercase block mb-1">Fecha Inicio</span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {format(new Date(loan.loanDate), "dd MMM yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 font-medium uppercase block mb-1">Vencimiento</span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {loan.dueDate ? format(new Date(loan.dueDate), "dd MMM yyyy", { locale: es }) : 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 font-medium uppercase block mb-1">Tasa Interés</span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                        {loan.interestRate}%
                                                        <Badge variant="outline" className="text-[10px] h-5">{loan.interestType === 'COMPOUND' ? 'Compuesto' : 'Simple'}</Badge>
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 font-medium uppercase block mb-1">Frecuencia</span>
                                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase text-sm">
                                                        {loan.paymentFrequency === 'MONTHLY' ? 'Mensual' : loan.paymentFrequency}
                                                    </span>
                                                </div>
                                                {loan.notes && (
                                                    <div className="col-span-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-2">
                                                        <span className="text-xs text-zinc-500 font-medium uppercase block mb-1">Notas</span>
                                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 italic">"{loan.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </TabsContent>

                                    <TabsContent value="installments" className="mt-0">
                                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                                            <table className="w-full text-sm">
                                                <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-zinc-500">#</th>
                                                        <th className="px-4 py-3 text-left font-bold text-xs uppercase text-zinc-500">Fecha</th>
                                                        <th className="px-4 py-3 text-right font-bold text-xs uppercase text-zinc-500">Monto</th>
                                                        <th className="px-4 py-3 text-center font-bold text-xs uppercase text-zinc-500">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                    {((loan as any).installments || []).map((inst: any) => (
                                                        <tr key={inst.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-zinc-500">{inst.installmentNumber}</td>
                                                            <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                                                {format(new Date(inst.dueDate), "dd MMM yyyy", { locale: es })}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-white">
                                                                {formatMoney(inst.totalAmount, loan.currencyCode)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={cn(
                                                                        "h-5 text-[10px] uppercase font-bold border-0",
                                                                        inst.status === 'PAID' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                            inst.status === 'OVERDUE' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                                                "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                                    )}
                                                                >
                                                                    {inst.status === 'PAID' ? 'Pagado' : inst.status === 'OVERDUE' ? 'Vencido' : 'Pendiente'}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!(loan as any).installments || (loan as any).installments.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">
                                                                No hay cronograma generado para este préstamo.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="history" className="mt-0">
                                        <div className="space-y-4">
                                            {(loan.payments && loan.payments.length > 0) ? (
                                                <div className="relative pl-4 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-200 dark:before:bg-zinc-800">
                                                    {loan.payments.map((payment) => (
                                                        <div key={payment.id} className="relative pl-8">
                                                            <div className={cn(
                                                                "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-zinc-950 shadow-sm z-10",
                                                                isReceivable ? "bg-blue-500" : "bg-orange-500"
                                                            )} />
                                                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <span className="text-lg font-black block">
                                                                            {formatMoney(payment.amount, payment.currencyCode)}
                                                                        </span>
                                                                        <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider mt-1">
                                                                            {(payment.principalAmount || 0) > 0 && <span className="text-zinc-500">Cap: {formatMoney(payment.principalAmount || 0, payment.currencyCode)}</span>}
                                                                            {(payment.interestAmount || 0) > 0 && <span className="text-emerald-600">Int: {formatMoney(payment.interestAmount || 0, payment.currencyCode)}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                                        {format(new Date(payment.paymentDate), "dd MMM", { locale: es })}
                                                                    </span>
                                                                </div>
                                                                {payment.notes && (
                                                                    <p className="text-xs text-zinc-500 mt-2 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg italic">
                                                                        "{payment.notes}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                                    <History className="w-12 h-12 text-zinc-300 mb-2" />
                                                    <p className="text-sm font-medium">No hay pagos registrados</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </div>
                            </ScrollArea>
                        </Tabs>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-between items-center flex-shrink-0 z-20 relative">
                        {showDeleteAlert ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                <span className="text-sm font-medium text-red-600">¿Estás seguro?</span>
                                <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowDeleteAlert(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setShowDeleteAlert(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                            </Button>
                        )}

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="rounded-xl border-zinc-200 dark:border-zinc-800">
                                Cerrar
                            </Button>
                            {!isCompleted && (
                                <Button
                                    onClick={() => setShowPaymentModal(true)}
                                    className={cn(
                                        "rounded-xl shadow-lg shadow-blue-500/20 text-white border-0",
                                        isReceivable
                                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                            : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                                    )}>
                                    {isReceivable ? "Registrar Cobro" : "Registrar Pago"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleting}>
                <AlertDialogContent className="z-[1000]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminando Préstamo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Por favor espera mientras revertimos las transacciones y actualizamos los saldos...
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>


            {(() => {
                const installments = ((loan as any).installments || [])
                    .sort((a: any, b: any) => a.installmentNumber - b.installmentNumber)

                // Robust status check: find first non-paid installment
                const nextPendingInstallment = installments.find((i: any) =>
                    i.status !== 'PAID' && i.status !== 'CANCELLED'
                )

                return (
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
                            nextInstallment: nextPendingInstallment ? {
                                number: nextPendingInstallment.installmentNumber,
                                amount: nextPendingInstallment.totalAmount,
                                dueDate: nextPendingInstallment.dueDate,
                                principal: nextPendingInstallment.principalAmount,
                                interest: nextPendingInstallment.interestAmount,
                            } : null
                        }}
                        isLoading={updateReceivable.isPending || updatePayable.isPending}
                    />
                )
            })()}
        </>
    )
}
