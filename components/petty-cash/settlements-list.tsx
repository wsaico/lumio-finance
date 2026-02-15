"use client"

import { usePettyCashSettlements, useUpdatePettyCashSettlement } from "@/hooks/usePettyCash"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, FileText, CheckCircle2, Clock, AlertTriangle, Check, X, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { ReplenishmentDialog } from "@/components/petty-cash/replenishment-dialog"

interface SettlementsListProps {
    fundId?: string
}

export function SettlementsList({ fundId }: SettlementsListProps) {
    const { data: settlements, isLoading } = usePettyCashSettlements(fundId)
    const { mutate: updateStatus, isPending: isUpdating } = useUpdatePettyCashSettlement()

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!settlements || settlements.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border-dashed border-2 rounded-lg">
                No hay liquidaciones registradas.
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Aprobado</Badge>
            case 'PENDING':
                return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
            case 'ACCOUNTED':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Contabilizado</Badge>
            case 'REJECTED':
                return <Badge variant="destructive">Rechazado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-3">
            {settlements.map((settlement: any) => (
                <div
                    key={settlement.id}
                    className="flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Liquidación {settlement.settlementCode}</span>
                                {settlement.fund && (
                                    <Badge variant="outline">{settlement.fund.fundName}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(settlement.settlementDate), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                <span>•</span>
                                <span>{settlement.expenseCount} gastos</span>
                                <span>•</span>
                                <span>Responsable: {settlement.responsibleName}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-lg text-blue-600">
                            S/ {Number(settlement.totalAmount).toFixed(2)}
                        </span>
                        {getStatusBadge(settlement.status)}
                    </div>

                    {/* Settlement Actions */}
                    <div className="flex items-center gap-2 ml-4 pl-4 border-l h-12">
                        {settlement.status === 'PENDING' && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                    onClick={() => updateStatus({ id: settlement.id, status: 'APPROVED' })}
                                    disabled={isUpdating}
                                    title="Aprobar Liquidación"
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/5 border-destructive/20"
                                    onClick={() => updateStatus({ id: settlement.id, status: 'REJECTED' })}
                                    disabled={isUpdating}
                                    title="Rechazar Liquidación"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {settlement.status === 'APPROVED' && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                onClick={() => updateStatus({ id: settlement.id, status: 'ACCOUNTED' })}
                                disabled={isUpdating}
                                title="Marcar como Contabilizado"
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium uppercase">Contabilizar</span>
                            </Button>
                        )}
                        {settlement.status === 'ACCOUNTED' && !settlement.replenishment && (
                            <ReplenishmentDialog
                                settlementId={settlement.id}
                                fundId={settlement.fundId || fundId}
                                totalAmount={Number(settlement.totalAmount)}
                                settlementCode={settlement.settlementCode}
                                userId={settlement.responsibleName} // Using name as ID placeholder for simplified mode
                                userName={settlement.responsibleName}
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
