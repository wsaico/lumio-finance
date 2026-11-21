"use client"

import { ArrowUpRight, ArrowDownLeft, AlertCircle, Scale, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { Button } from "@/components/ui/button"

interface LoansSummaryProps {
    summary: {
        totalReceivable: number
        totalPayable: number
        overdueReceivable: number
        overduePayable: number
        activeReceivableCount?: number
        activePayableCount?: number
        currencyCode: string
    }
    onCreateLoan?: () => void
}

export function LoansSummary({ summary, onCreateLoan }: LoansSummaryProps) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const netPosition = summary.totalReceivable - summary.totalPayable
    const hasOverdue = summary.overdueReceivable > 0 || summary.overduePayable > 0

    return (
        <div className="space-y-3">
            {/* Executive Hero Banner */}
            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 sm:p-7 text-white shadow-xl shadow-indigo-900/15">
                <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-black/15 blur-3xl" />

                <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                            <Scale className="h-3.5 w-3.5" />
                            Posición Neta en Préstamos
                        </div>
                        <p className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                            {isBalanceVisible
                                ? `${netPosition >= 0 ? "+" : "-"}${formatMoney(Math.abs(netPosition), summary.currencyCode)}`
                                : "••••••"}
                        </p>
                        <p className="text-xs sm:text-sm text-white/80 font-medium">
                            {netPosition >= 0
                                ? "Saldo neto a tu favor"
                                : "Saldo neto pendiente por pagar"}
                        </p>
                    </div>

                    {onCreateLoan && (
                        <Button
                            type="button"
                            onClick={onCreateLoan}
                            className="h-11 px-5 rounded-full bg-white text-indigo-700 hover:bg-white/95 font-extrabold text-sm shadow-lg shadow-black/15 gap-2 self-start sm:self-auto"
                        >
                            <Plus className="h-4 w-4 stroke-[2.75]" />
                            Nuevo Préstamo
                        </Button>
                    )}
                </div>

                {/* Bottom Split Strip: Por Cobrar vs Por Pagar */}
                <div className="relative mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 flex items-center gap-1">
                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
                            Por Cobrar
                        </span>
                        <p className="text-lg sm:text-xl font-black tabular-nums">
                            {isBalanceVisible
                                ? formatMoney(summary.totalReceivable, summary.currencyCode)
                                : "••••••"}
                        </p>
                        <p className="text-[11px] text-white/70">
                            {summary.activeReceivableCount ?? 0} activos · te deben
                        </p>
                    </div>

                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/75 flex items-center gap-1">
                            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-300" />
                            Por Pagar
                        </span>
                        <p className="text-lg sm:text-xl font-black tabular-nums">
                            {isBalanceVisible
                                ? formatMoney(summary.totalPayable, summary.currencyCode)
                                : "••••••"}
                        </p>
                        <p className="text-[11px] text-white/70">
                            {summary.activePayableCount ?? 0} activos · debes
                        </p>
                    </div>
                </div>
            </div>

            {/* Compact Overdue Alert Strip (Dark-mode native!) */}
            {hasOverdue && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-700 dark:text-rose-300 space-y-0.5">
                        <p className="font-extrabold">Tienes préstamos vencidos</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-semibold tabular-nums">
                            {summary.overdueReceivable > 0 && (
                                <span>
                                    Por cobrar:{" "}
                                    {isBalanceVisible
                                        ? formatMoney(summary.overdueReceivable, summary.currencyCode)
                                        : "••••"}
                                </span>
                            )}
                            {summary.overduePayable > 0 && (
                                <span>
                                    Por pagar:{" "}
                                    {isBalanceVisible
                                        ? formatMoney(summary.overduePayable, summary.currencyCode)
                                        : "••••"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
