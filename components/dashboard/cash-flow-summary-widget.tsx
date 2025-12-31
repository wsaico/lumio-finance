"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface CashFlowSummaryWidgetProps {
    month?: Date
}

export function CashFlowSummaryWidget({ month = new Date() }: CashFlowSummaryWidgetProps) {
    const [data, setData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const year = month.getFullYear()
                const m = month.getMonth() + 1

                const res = await fetch(`/api/analytics/monthly-summary?month=${m}&year=${year}`)
                if (res.ok) {
                    const result = await res.json()

                    // Get previous month for comparison
                    const prevMonth = m === 1 ? 12 : m - 1
                    const prevYear = m === 1 ? year - 1 : year
                    const prevRes = await fetch(`/api/analytics/monthly-summary?month=${prevMonth}&year=${prevYear}`)
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
                }
            } catch (error) {
                console.error('Error fetching cash flow:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [month])

    if (isLoading || !data) {
        return (
            <Card className="glass border-none shadow-premium-md">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg font-semibold">Flujo de Efectivo</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-48">
                    <div className="animate-pulse text-muted-foreground">Cargando...</div>
                </CardContent>
            </Card>
        )
    }

    const total = data.income + Math.abs(data.expense)
    const incomePercent = total > 0 ? (data.income / total) * 100 : 0
    const expensePercent = total > 0 ? (Math.abs(data.expense) / total) * 100 : 0

    return (
        <Card className="glass border-none shadow-premium-md">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xs text-muted-foreground font-normal mb-1">ESTE MES</CardTitle>
                        <div className="text-3xl md:text-4xl font-bold">
                            S/ {data.cashFlow.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${data.isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {data.isPositive ? (
                            <TrendingUp className="h-5 w-5" />
                        ) : data.percentChange === 0 ? (
                            <Minus className="h-5 w-5" />
                        ) : (
                            <TrendingDown className="h-5 w-5" />
                        )}
                        <span className="text-base">{Math.abs(data.percentChange).toFixed(1)}%</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs período anterior</p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Income</span>
                        <span className="font-medium">S/ {data.income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Progress value={incomePercent} className="h-2 bg-emerald-100">
                        <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${incomePercent}%` }} />
                    </Progress>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expense</span>
                        <span className="font-medium">-S/ {Math.abs(data.expense).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <Progress value={expensePercent} className="h-2 bg-rose-100">
                        <div className="h-full bg-rose-600 rounded-full transition-all" style={{ width: `${expensePercent}%` }} />
                    </Progress>
                </div>
            </CardContent>
        </Card>
    )
}
