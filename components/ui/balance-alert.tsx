"use client"

import { AlertCircle, AlertTriangle, ArrowRight } from "lucide-react"
import { BalanceValidationResult } from "@/hooks/useBalanceValidation"
import { useFormat } from "@/hooks/useFormat"

interface BalanceAlertProps {
    validation: BalanceValidationResult | null
    currencyCode: string
}

export function BalanceAlert({ validation, currencyCode }: BalanceAlertProps) {
    const { formatMoney } = useFormat()

    if (!validation || validation.severity === 'success') return null

    const { severity, message, details } = validation

    // ERROR: Insufficient funds - Ultra compact version
    if (severity === 'error') {
        return (
            <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800/60 px-3 py-2">
                <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-red-900 dark:text-red-300">
                            {message || 'Saldo insuficiente'}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                            Faltan <span className="font-bold tabular-nums">{formatMoney(details.shortage || 0, currencyCode)}</span>
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    // WARNING: Low balance - Compact version
    if (severity === 'warning') {
        return (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/40 dark:border-yellow-800/60 px-3 py-2">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800 dark:text-yellow-400 flex-1">
                        {message || 'Saldo bajo después de esta operación'}
                    </p>
                </div>
            </div>
        )
    }

    return null
}
