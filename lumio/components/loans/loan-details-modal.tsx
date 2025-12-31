"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    User,
    Calendar,
    DollarSign,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    ArrowDownLeft,
    Mail,
    Phone,
    FileText,
    History,
    TrendingUp,
    CreditCard
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountReceivable, AccountPayable, LoanPayment } from "@/types/loans"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/use-format"

interface LoanDetailsModalProps {
    open: boolean
    onClose: () => void
    loan: (AccountReceivable | AccountPayable) & { type: 'RECEIVABLE' | 'PAYABLE' } | null
}

export function LoanDetailsModal({ open, onClose, loan }: LoanDetailsModalProps) {
    const { formatMoney } = useFormat()

    if (!loan) return null

    const isReceivable = loan.type === 'RECEIVABLE'
    const isOverdue = loan.status === 'OVERDUE'
    const isCompleted = isReceivable ? loan.status === 'COLLECTED' : loan.status === 'PAID'
    const percentPaid = loan.percentPaid || 0

    const statusConfig = {
        PENDING: { label: 'Pendiente', variant: 'secondary' as const },
        PARTIAL: { label: 'Cobro Parcial', variant: 'default' as const },
        COLLECTED: { label: 'Cobrado', variant: 'default' as const },
        PAID: { label: 'Pagado', variant: 'default' as const },
        OVERDUE: { label: 'Vencido', variant: 'destructive' as const },
        CANCELLED: { label: 'Cancelado', variant: 'outline' as const },
    }

    const currentStatus = statusConfig[loan.status]

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                {/* Header with Background Pattern */}
                <div className={cn(
                    "p-6 pb-4 relative overflow-hidden",
                    isReceivable ? "bg-blue-600/5" : "bg-orange-600/5"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        {isReceivable ? <ArrowUpRight size={120} /> : <ArrowDownLeft size={120} />}
                    </div>

                    <DialogHeader className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <Badge variant={currentStatus.variant} className="px-3 py-1 text-sm font-medium">
                                {currentStatus.label}
                            </Badge>
                            {isCompleted && (
                                <div className="flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Finalizado
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-4 rounded-2xl shadow-sm",
                                isReceivable ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
                            )}>
                                <User className="h-7 w-7" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold tracking-tight">
                                    {loan.contactName}
                                </DialogTitle>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-muted-foreground text-sm">
                                    {loan.contactEmail && (
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5" />
                                            {loan.contactEmail}
                                        </div>
                                    )}
                                    {loan.contactPhone && (
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5" />
                                            {loan.contactPhone}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                        {/* Financial Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                                    <TrendingUp className="h-3 w-3" /> Monto Original
                                </span>
                                <p className="text-xl font-bold">{formatMoney(loan.originalAmount, loan.currencyCode)}</p>
                            </div>
                            <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" /> Total {isReceivable ? 'Cobrado' : 'Pagado'}
                                </span>
                                <p className="text-xl font-bold text-green-600">{formatMoney(loan.totalPaid, loan.currencyCode)}</p>
                            </div>
                            <div className="p-4 rounded-xl border bg-card shadow-sm space-y-1">
                                <span className={cn(
                                    "text-xs font-medium uppercase flex items-center gap-1.5",
                                    isOverdue ? "text-red-600" : "text-blue-600"
                                )}>
                                    <Clock className="h-3 w-3" /> Saldo Pendiente
                                </span>
                                <p className={cn(
                                    "text-xl font-bold",
                                    isOverdue ? "text-red-600" : "text-blue-600"
                                )}>
                                    {formatMoney(loan.outstandingBalance, loan.currencyCode)}
                                </p>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold">Progreso de liquidación</span>
                                <span className="text-muted-foreground font-medium">{percentPaid.toFixed(1)}% completado</span>
                            </div>
                            <Progress
                                value={percentPaid}
                                className="h-3"
                                indicatorColor={isReceivable ? "#3b82f6" : "#ea580c"}
                            />
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Loan Info */}
                            <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2 text-sm text-foreground/80">
                                    <FileText className="h-4 w-4" /> Información General
                                </h4>
                                <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Fecha inicio:</span>
                                        <span className="font-medium">{format(new Date(loan.loanDate), "dd MMM, yyyy", { locale: es })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Fecha vencimiento:</span>
                                        <span className={cn("font-medium", isOverdue && "text-red-600")}>
                                            {loan.dueDate ? format(new Date(loan.dueDate), "dd MMM, yyyy", { locale: es }) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tasa de interés:</span>
                                        <span className="font-medium text-foreground">{loan.interestRate || 0}%</span>
                                    </div>
                                    {loan.notes && (
                                        <div className="pt-2">
                                            <span className="text-muted-foreground text-xs block mb-1">Notas:</span>
                                            <p className="text-sm italic text-foreground/80">"{loan.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Timeline */}
                            <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2 text-sm text-foreground/80">
                                    <History className="h-4 w-4" /> Historial de Pagos
                                </h4>

                                {(loan.payments && loan.payments.length > 0) ? (
                                    <div className="relative pl-1 px-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                                        {loan.payments.map((payment, index) => (
                                            <div key={payment.id} className="relative pl-10">
                                                <div className={cn(
                                                    "absolute left-0 top-1 p-1 rounded-full border-2 bg-background z-10",
                                                    isReceivable ? "border-blue-500 text-blue-500" : "border-orange-500 text-orange-500"
                                                )}>
                                                    {isReceivable ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold">
                                                            {formatMoney(payment.amount, payment.currencyCode)}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                                                            {format(new Date(payment.paymentDate), "dd MMM", { locale: es })}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {payment.paymentMethod || 'Transferencia'}
                                                        </span>
                                                    </div>
                                                    {payment.notes && (
                                                        <p className="text-[11px] text-muted-foreground mt-1 italic">
                                                            {payment.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-muted/30 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                                        <History className="h-8 w-8 text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">No hay pagos registrados aún</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-6 bg-muted/20 border-t flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} className="px-6">
                        Cerrar
                    </Button>
                    {!isCompleted && (
                        <Button className={cn(
                            "px-6 shadow-sm hover:shadow-md transition-all gap-2",
                            isReceivable ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"
                        )}>
                            {isReceivable ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                            {isReceivable ? 'Cobrar ahora' : 'Pagar ahora'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
