"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { usePettyCashReplenishments } from "@/hooks/usePettyCash"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowDownLeft, TrendingUp, Calendar, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function ReplenishmentHistoryCard({ fundId }: { fundId?: string }) {
    const { data: replenishments, isLoading } = usePettyCashReplenishments(fundId, 'CONFIRMED')

    // Calculate metrics
    const currentMonth = new Date().getMonth()
    const monthlyReplenishments = replenishments?.filter((r: any) =>
        new Date(r.replenishmentDate).getMonth() === currentMonth
    ) || []

    const monthlyTotal = monthlyReplenishments.reduce((sum: number, r: any) => sum + Number(r.amount), 0)

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Historial de Reposiciones</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Cargando...</span>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Metric Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        Repuesto este Mes
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        S/ {monthlyTotal.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {monthlyReplenishments.length} operaciones confirmadas
                    </p>
                </CardContent>
            </Card>

            {/* Recent List Card */}
            <Card className="row-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-indigo-600" />
                                Últimas Reposiciones
                            </CardTitle>
                            <CardDescription>
                                Flujo de entrada de efectivo al fondo
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            CONFIRMADOS
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {replenishments?.slice(0, 5).map((replenishment: any) => (
                            <div key={replenishment.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full">
                                        <ArrowDownLeft className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {format(new Date(replenishment.replenishmentDate), "d 'de' MMMM", { locale: es })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {replenishment.paymentMethod === 'TRANSFER' ? 'Transferencia' :
                                                replenishment.paymentMethod === 'CASH' ? 'Efectivo' : 'Otro'}
                                            {replenishment.referenceNumber && ` • Ref: ${replenishment.referenceNumber}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-emerald-600">
                                        +S/ {Number(replenishment.amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!replenishments || replenishments.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No hay reposiciones recientes
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
