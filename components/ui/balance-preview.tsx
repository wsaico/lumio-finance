"use client"

import { TrendingDown, TrendingUp, AlertCircle } from "lucide-react"
import { useFormat } from "@/hooks/useFormat"
import { cn } from "@/lib/utils"

interface BalancePreviewProps {
    currentBalance: number
    amount: number
    balanceAfter: number
    currencyCode: string
    className?: string
    compact?: boolean
}

export function BalancePreview({
    currentBalance,
    amount,
    balanceAfter,
    currencyCode,
    className,
    compact = false
}: BalancePreviewProps) {
    const { formatMoney } = useFormat()

    const isNegative = balanceAfter < 0
    const isLow = balanceAfter >= 0 && balanceAfter < currentBalance * 0.1

    if (compact) {
        return (
            <div className={cn(
                "px-3 py-2 rounded-md border transition-colors text-xs",
                isNegative
                    ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
                    : isLow
                        ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800/50"
                        : "bg-muted/40 border-border/60 dark:bg-muted/20",
                className
            )}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {isNegative ? (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        ) : isLow ? (
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                        ) : (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-muted-foreground truncate">Saldo después:</span>
                    </div>
                    <span className={cn(
                        "font-bold tabular-nums flex-shrink-0",
                        isNegative
                            ? "text-red-600 dark:text-red-400"
                            : isLow
                                ? "text-yellow-700 dark:text-yellow-500"
                                : "text-green-600 dark:text-green-500"
                    )}>
                        {formatMoney(balanceAfter, currencyCode)}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "p-3 rounded-lg border transition-colors",
            isNegative
                ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50"
                : isLow
                    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800/50"
                    : "bg-muted/40 border-border/60 dark:bg-muted/20",
            className
        )}>
            {/* Current Balance */}
            <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Saldo actual</span>
                <span className="font-semibold tabular-nums dark:text-foreground/90">
                    {formatMoney(currentBalance, currencyCode)}
                </span>
            </div>

            {/* Amount to Deduct */}
            <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-muted-foreground font-medium">Monto a usar</span>
                <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">
                    -{formatMoney(amount, currencyCode)}
                </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/60 dark:bg-border/40 mb-2" />

            {/* Balance After */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                    {isNegative ? (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    ) : isLow ? (
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-500" />
                    ) : (
                        <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    )}
                    <span className="font-bold text-sm dark:text-foreground">Saldo después</span>
                </div>
                <span className={cn(
                    "font-bold text-base tabular-nums",
                    isNegative
                        ? "text-red-600 dark:text-red-400"
                        : isLow
                            ? "text-yellow-700 dark:text-yellow-500"
                            : "text-green-600 dark:text-green-500"
                )}>
                    {formatMoney(balanceAfter, currencyCode)}
                </span>
            </div>
        </div>
    )
}
