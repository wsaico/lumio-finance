"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { User, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, ArrowUpRight, FileText } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountPayable } from "@/types/loans"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"

interface LoanCardPayableProps {
    payable: AccountPayable
    onRegisterPayment: (id: string) => void
    onViewDetails: (id: string) => void
}

export function LoanCardPayable({ payable, onRegisterPayment, onViewDetails }: LoanCardPayableProps) {
    const { formatMoney } = useFormat()
    const percentPaid = payable.percentPaid || 0
    const daysOverdue = payable.daysOverdue || 0
    const isOverdue = payable.status === 'OVERDUE'
    const isPaid = payable.status === 'PAID'
    const isPartial = payable.status === 'PARTIAL'

    // Status badge config
    const statusConfig = {
        PENDING: { label: 'Pendiente', variant: 'secondary' as const, color: 'text-gray-600' },
        PARTIAL: { label: 'Parcial', variant: 'default' as const, color: 'text-orange-600' },
        PAID: { label: 'Pagado', variant: 'default' as const, color: 'text-green-600' },
        COLLECTED: { label: 'Pagado', variant: 'default' as const, color: 'text-green-600' },
        OVERDUE: { label: 'Vencido', variant: 'destructive' as const, color: 'text-red-600' },
        CANCELLED: { label: 'Cancelado', variant: 'outline' as const, color: 'text-gray-400' },
    }

    const status = statusConfig[payable.status]

    // Days until/since due date
    let daysText = ''
    if (payable.dueDate && !isPaid) {
        const daysUntilDue = differenceInDays(new Date(payable.dueDate), new Date())
        if (daysUntilDue > 0) {
            daysText = `Vence en ${daysUntilDue} días`
        } else if (daysUntilDue === 0) {
            daysText = 'Vence hoy'
        } else {
            daysText = `Vencido hace ${Math.abs(daysUntilDue)} días`
        }
    }

    return (
        <Card className={cn(
            "overflow-hidden transition-all hover:shadow-md",
            isOverdue && "border-red-200 bg-red-50/20",
            isPaid && "border-green-200 bg-green-50/30"
        )}>
            {/* Color bar indicator */}
            <div className={cn(
                "h-1 w-full",
                isPaid ? "bg-green-500" : isOverdue ? "bg-red-500" : isPartial ? "bg-orange-500" : "bg-gray-400"
            )} />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-3 rounded-full",
                            isPaid ? "bg-green-100 text-green-600" :
                                isOverdue ? "bg-red-100 text-red-600" :
                                    "bg-orange-100 text-orange-600"
                        )}>
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{payable.contactName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={status.variant} className="text-xs">
                                    {status.label}
                                </Badge>
                                {payable.contactEmail && (
                                    <span className="text-xs text-muted-foreground">{payable.contactEmail}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {isPaid && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {isOverdue && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Amount info */}
                <div>
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-2xl font-bold text-foreground">
                            {formatMoney(payable.outstandingBalance, payable.currencyCode)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            de {formatMoney(payable.originalAmount, payable.currencyCode)}
                        </span>
                    </div>

                    {/* Progress bar */}
                    {!isPaid && (
                        <Progress
                            value={percentPaid}
                            className="h-2"
                            indicatorColor={isOverdue ? "#ef4444" : isPartial ? "#f97316" : "#94a3b8"}
                        />
                    )}
                </div>

                {/* Payment stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        <span className="text-xs">{payable.currencyCode === 'PEN' ? 'S/.' : '$'}</span>
                        <span>{percentPaid.toFixed(1)}% pagado</span>
                    </div>
                    {payable.totalPaid !== undefined && (
                        <span className="text-muted-foreground">
                            Pagado: {formatMoney(payable.totalPaid, payable.currencyCode)}
                        </span>
                    )}
                </div>

                {/* Due date info */}
                {daysText && (
                    <div className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        isOverdue ? "text-red-600" : "text-muted-foreground"
                    )}>
                        {isOverdue ? (
                            <AlertCircle className="h-4 w-4" />
                        ) : (
                            <Calendar className="h-4 w-4" />
                        )}
                        <span>{daysText}</span>
                    </div>
                )}

                {/* Loan date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Recibido el {format(new Date(payable.loanDate), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                </div>

                {/* Notes preview */}
                {payable.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                        "{payable.notes}"
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {!isPaid && (
                        <Button
                            onClick={() => onRegisterPayment(payable.id)}
                            className="flex-1 gap-2"
                            size="sm"
                            variant={isOverdue ? "destructive" : "default"}
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            Registrar Pago
                        </Button>
                    )}
                    <Button
                        onClick={() => onViewDetails(payable.id)}
                        variant="outline"
                        size="sm"
                        className={cn("gap-2", isPaid && "flex-1")}
                    >
                        <FileText className="h-4 w-4" />
                        Ver Detalles
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
