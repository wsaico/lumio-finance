"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownLeft, AlertCircle, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"

interface LoansSummaryProps {
    summary: {
        totalReceivable: number
        totalPayable: number
        overdueReceivable: number
        overduePayable: number
        currencyCode: string
    }
}

export function LoansSummary({ summary }: LoansSummaryProps) {
    const { formatMoney } = useFormat()

    const netPosition = summary.totalReceivable - summary.totalPayable

    const stats = [
        {
            title: 'Por Cobrar',
            value: summary.totalReceivable,
            icon: ArrowUpRight,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            description: 'Dinero que te deben',
        },
        {
            title: 'Por Pagar',
            value: summary.totalPayable,
            icon: ArrowDownLeft,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            description: 'Dinero que debes',
        },
        {
            title: 'Posición Neta',
            value: Math.abs(netPosition),
            icon: TrendingUp,
            color: netPosition >= 0 ? 'text-green-600' : 'text-red-600',
            bgColor: netPosition >= 0 ? 'bg-green-100' : 'bg-red-100',
            description: netPosition >= 0 ? 'A tu favor' : 'Deuda neta',
        },
    ]

    const hasOverdue = summary.overdueReceivable > 0 || summary.overduePayable > 0

    return (
        <div className="space-y-4">
            {/* Main stats grid */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat, index) => (
                    <Card key={index} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={cn("p-2 rounded-full", stat.bgColor)}>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatMoney(stat.value, summary.currencyCode)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Overdue alerts */}
            {hasOverdue && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-red-900 mb-2">Préstamos Vencidos</h4>
                                <div className="space-y-1 text-sm text-red-700">
                                    {summary.overdueReceivable > 0 && (
                                        <p>
                                            • {formatMoney(summary.overdueReceivable, summary.currencyCode)} por cobrar vencidos
                                        </p>
                                    )}
                                    {summary.overduePayable > 0 && (
                                        <p>
                                            • {formatMoney(summary.overduePayable, summary.currencyCode)} por pagar vencidos
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
