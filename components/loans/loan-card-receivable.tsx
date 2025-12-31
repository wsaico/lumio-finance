"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { User, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, ArrowDownRight, FileText } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountReceivable } from "@/types/loans"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/use-format"

interface LoanCardReceivableProps {
    receivable: AccountReceivable
    onRegisterPayment: (id: string) => void
    onViewDetails: (id: string) => void
}

export function LoanCardReceivable({ receivable, onRegisterPayment, onViewDetails }: LoanCardReceivableProps) {
    const { formatMoney } = useFormat()
    const percentPaid = receivable.percentPaid || 0
    const daysOverdue = receivable.daysOverdue || 0
    const isOverdue = receivable.status === 'OVERDUE'
    const isCollected = receivable.status === 'COLLECTED'
    const isPartial = receivable.status === 'PARTIAL'

    // Status badge config
    const statusConfig = {
        PENDING: { label: 'Pendiente', variant: 'secondary' as const, color: 'text-gray-600' },
        PARTIAL: { label: 'Parcial', variant: 'default' as const, color: 'text-blue-600' },
        COLLECTED: { label: 'Cobrado', variant: 'default' as const, color: 'text-green-600' },
        PAID: { label: 'Cobrado', variant: 'default' as const, color: 'text-green-600' },
        OVERDUE: { label: 'Vencido', variant: 'destructive' as const, color: 'text-red-600' },
        CANCELLED: { label: 'Cancelado', variant: 'outline' as const, color: 'text-gray-400' },
    }

    const status = statusConfig[receivable.status]

    // Days until/since due date
    let daysText = ''
    if (receivable.dueDate && !isCollected) {
        const daysUntilDue = differenceInDays(new Date(receivable.dueDate), new Date())
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
            isOverdue && "border-red-200",
            isCollected && "border-green-200 bg-green-50/30"
        )}>
            {/* Color bar indicator */}
            <div className={cn(
                "h-1 w-full",
                isCollected ? "bg-green-500" : isOverdue ? "bg-red-500" : isPartial ? "bg-blue-500" : "bg-gray-400"
            )} />

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-3 rounded-full",
                            isCollected ? "bg-green-100 text-green-600" :
                                isOverdue ? "bg-red-100 text-red-600" :
                                    "bg-blue-100 text-blue-600"
                        )}>
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{receivable.contactName}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={status.variant} className="text-xs">
                                    {status.label}
                                </Badge>
                                {receivable.contactEmail && (
                                    <span className="text-xs text-muted-foreground">{receivable.contactEmail}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {isCollected && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Amount info */}
                <div>
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-2xl font-bold text-foreground">
                            {formatMoney(receivable.outstandingBalance, receivable.currencyCode)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            de {formatMoney(receivable.originalAmount, receivable.currencyCode)}
                        </span>
                    </div>

                    {/* Progress bar */}
                    {!isCollected && (
                        <Progress
                            value={percentPaid}
                            className="h-2"
                            indicatorColor={isOverdue ? "#ef4444" : isPartial ? "#3b82f6" : "#94a3b8"}
                        />
                    )}
                </div>

                {/* Payment stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        <span className="text-xs">{receivable.currencyCode === 'PEN' ? 'S/.' : '$'}</span>
                        <span>{percentPaid.toFixed(1)}% cobrado</span>
                    </div>
                    {receivable.totalPaid !== undefined && (
                        <span className="text-muted-foreground">
                            Cobrado: {formatMoney(receivable.totalPaid, receivable.currencyCode)}
                        </span>
                    )}
                </div>

                {/* Due date info */}
                {daysText && (
                    <div className={cn(
                        "flex items-center gap-2 text-sm",
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
                    <span>Prestado el {format(new Date(receivable.loanDate), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                </div>

                {/* Notes preview */}
                {receivable.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                        "{receivable.notes}"
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {!isCollected && (
                        <Button
                            onClick={() => onRegisterPayment(receivable.id)}
                            className="flex-1 gap-2"
                            size="sm"
                        >
                            <ArrowDownRight className="h-4 w-4" />
                            Registrar Cobro
                        </Button>
                    )}
                    <Button
                        onClick={() => onViewDetails(receivable.id)}
                        variant="outline"
                        size="sm"
                        className={cn("gap-2", isCollected && "flex-1")}
                    >
                        <FileText className="h-4 w-4" />
                        Ver Detalles
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
