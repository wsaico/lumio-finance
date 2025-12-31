"use client"

import { usePettyCashAudits } from "@/hooks/use-petty-cash"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Calculator, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AuditsListProps {
    fundId?: string
}

export function AuditsList({ fundId }: AuditsListProps) {
    const { data: audits, isLoading } = usePettyCashAudits(fundId)

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!audits || audits.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground border-dashed border-2 rounded-lg">
                No hay arqueos registrados.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {audits.map((audit: any) => {
                const variance = Number(audit.variance)
                const isBalanced = variance === 0
                const isCritical = Math.abs(variance) > (Number(audit.fund?.assignedAmount || 0) * 0.05)

                return (
                    <div
                        key={audit.id}
                        className="flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-2 rounded-lg shrink-0",
                                isBalanced ? "bg-emerald-50 text-emerald-600" :
                                    isCritical ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                            )}>
                                <Calculator className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Arqueo {audit.auditCode}</span>
                                    <Badge variant="outline">{audit.auditType}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{format(new Date(audit.auditDate), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                    <span>•</span>
                                    <span>Auditor: {audit.auditedBy}</span>
                                    {audit.fund && (
                                        <>
                                            <span>•</span>
                                            <span className="font-medium">{audit.fund.fundName}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                {isBalanced ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                    <AlertTriangle className={cn("h-4 w-4", isCritical ? "text-red-600" : "text-amber-600")} />
                                )}
                                <span className={cn(
                                    "font-bold text-lg",
                                    isBalanced ? "text-emerald-600" : isCritical ? "text-red-600" : "text-amber-600"
                                )}>
                                    {variance > 0 ? "+" : ""}S/ {variance.toFixed(2)}
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {isBalanced ? "Cuadrado" : "Diferencia"}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ")
}
