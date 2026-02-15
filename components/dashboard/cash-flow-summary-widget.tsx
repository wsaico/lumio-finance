"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useFormat } from "@/hooks/useFormat"
import { useEffect, useState } from "react"
import { Loader2, Activity, TrendingUp, TrendingDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface CashFlowSummaryWidgetProps {
    month?: Date
}



export function CashFlowSummaryWidget({ month = new Date() }: CashFlowSummaryWidgetProps) {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { formatMoney } = useFormat()
    const [isError, setIsError] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        async function fetchData() {
            try {
                setIsError(false)
                setIsLoading(true)
                const year = month.getFullYear()
                const m = month.getMonth() + 1

                // Add timeout to fetch to prevent infinite hanging
                const timeoutId = setTimeout(() => controller.abort(), 15000)

                const res = await fetch(`/api/analytics/monthly-summary?month=${m}&year=${year}`, {
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                if (res.ok) {
                    const result = await res.json()

                    // Simple fetch for previous month
                    const prevMonth = m === 1 ? 12 : m - 1
                    const prevYear = m === 1 ? year - 1 : year
                    const prevRes = await fetch(`/api/analytics/monthly-summary?month=${prevMonth}&year=${prevYear}`, {
                        signal: controller.signal
                    })
                    const prevResult = prevRes.ok ? await prevRes.json() : null

                    const cashFlow = result.totalIncome - result.totalExpense
                    const prevCashFlow = prevResult ? (prevResult.totalIncome - prevResult.totalExpense) : 0
                    const change = cashFlow - prevCashFlow
                    const percentChange = prevCashFlow !== 0 ? (change / Math.abs(prevCashFlow)) * 100 : 0

                    setData({
                        cashFlow,
                        income: result.totalIncome,
                        expense: result.totalExpense,
                        percentChange,
                        isPositive: change >= 0
                    })
                } else {
                    throw new Error('Server returned error')
                }
            } catch (error: any) {
                if (error.name === 'AbortError') return
                console.error('Error fetching cash flow:', error)
                setIsError(true)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        return () => controller.abort()
    }, [month.getFullYear(), month.getMonth()])

    if (isError) {
        return (
            <Card className="widget-surface h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-rose-600">Error de Datos</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <TrendingDown className="w-8 h-8 text-rose-500/50 mb-2" />
                    <p className="text-xs text-neutral-500">No se pudo cargar el flujo de caja. Verifique su conexión.</p>
                </CardContent>
            </Card>
        )
    }

    if (isLoading || !data) {
        return (
            <Card className="widget-surface h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Flujo de Efectivo</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-4">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Calculando...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const total = data.income + Math.abs(data.expense)
    const incomePercent = total > 0 ? (data.income / total) * 100 : 0
    const expensePercent = total > 0 ? (Math.abs(data.expense) / total) * 100 : 0

    return (
        <Card className="widget-surface h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Resultado Neto</CardTitle>
                        <div className="text-2xl md:text-3xl font-black tracking-tighter">
                            {formatMoney(data.cashFlow)}
                        </div>
                    </div>
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full",
                        data.isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}>
                        {data.isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                        ) : (
                            <TrendingDown className="h-4 w-4" />
                        )}
                        <span>{Math.abs(data.percentChange).toFixed(1)}%</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end space-y-4 pb-6">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground uppercase tracking-tight">Ingresos</span>
                        <span className="text-emerald-600 font-black">{formatMoney(data.income)}</span>
                    </div>
                    <div className="h-1.5 bg-emerald-500/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${incomePercent}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-muted-foreground uppercase tracking-tight">Egresos</span>
                        <span className="text-rose-600 font-black">-{formatMoney(Math.abs(data.expense))}</span>
                    </div>
                    <div className="h-1.5 bg-rose-500/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-rose-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${expensePercent}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

