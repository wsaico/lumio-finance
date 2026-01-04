"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Hourglass, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const fetcher = (url: string) => fetch(url, { method: 'POST' }).then(res => res.json())

export function AgeOfMoneyWidget() {
    const { data, isLoading } = useSWR('/api/analytics/age-of-money', fetcher, {
        refreshInterval: 60000, // Refresh every minute
        revalidateOnFocus: false
    })

    const age = data?.age || 0
    const error = data?.error

    // Status Logic
    let color = "text-red-500"
    let bg = "bg-red-50 dark:bg-red-950/30"
    let status = "Crítico"

    if (error) {
        status = "Error"
        color = "text-gray-500"
    } else if (age >= 30) {
        color = "text-emerald-500"
        bg = "bg-emerald-50 dark:bg-emerald-950/30"
        status = "Saludable"
    } else if (age >= 10) {
        color = "text-amber-500"
        bg = "bg-amber-50 dark:bg-amber-950/30"
        status = "Creciendo"
    }

    if (isLoading) {
        return (
            <Card className="shadow-sm">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        Edad del Dinero
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="widget-surface">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Hourglass className="w-4 h-4 opacity-70" />
                        Edad del Dinero
                    </span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-[200px] text-xs">
                                    {error || "Promedio de días que pasan desde que ganas el dinero hasta que lo gastas. Meta: > 30 días."}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="flex items-end gap-2">
                    <div className={`text-3xl font-bold ${color}`}>
                        {error ? "ERR" : age}
                    </div>
                    {!error && (
                        <div className="text-base font-medium text-muted-foreground mb-1">
                            días
                        </div>
                    )}
                </div>
                <div className={`text-xs font-bold mt-2 px-2 py-0.5 rounded-full w-fit ${bg} ${color}`}>
                    {status}
                </div>
            </CardContent>
        </Card>
    )
}
