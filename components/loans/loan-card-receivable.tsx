"use client"

import { Calendar, CheckCircle2, AlertCircle, ChevronRight, ArrowDownLeft } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AccountReceivable } from "@/types/loans"
import { cn } from "@/lib/utils"
import { getCalendarDaysUntil, parseLocalDate } from "@/lib/loans"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"

interface LoanCardReceivableProps {
    receivable: AccountReceivable
    onRegisterPayment: (id: string) => void
    onViewDetails: (id: string) => void
}

export function LoanCardReceivable({
    receivable,
    onRegisterPayment,
    onViewDetails,
}: LoanCardReceivableProps) {
    const { formatMoney } = useFormat()
    const { isBalanceVisible } = useSettingsStore()

    const percentPaid = Math.min(100, Math.max(0, receivable.percentPaid || 0))
    const isOverdue = receivable.status === "OVERDUE"
    const isCollected = receivable.status === "COLLECTED" || receivable.status === "PAID"
    const isPartial = receivable.status === "PARTIAL"

    const initials = (receivable.contactName || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const statusBadge = isCollected
        ? { label: "Cobrado", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" }
        : isOverdue
          ? { label: "Vencido", cls: "bg-rose-500/12 text-rose-600 dark:text-rose-400" }
          : isPartial
            ? { label: "Parcial", cls: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" }
            : { label: "Pendiente", cls: "bg-muted text-muted-foreground" }

    let daysText = ""
    if (receivable.dueDate && !isCollected) {
        const daysUntilDue = getCalendarDaysUntil(receivable.dueDate)
        if (daysUntilDue !== null) {
            if (daysUntilDue > 0) daysText = `Vence en ${daysUntilDue} ${daysUntilDue === 1 ? "día" : "días"}`
            else if (daysUntilDue === 0) daysText = "Vence hoy"
            else daysText = `Vencido hace ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "día" : "días"}`
        }
    }
    const loanDateParsed = parseLocalDate(receivable.loanDate)

    const barColor = isCollected
        ? "#10b981"
        : isOverdue
          ? "#f43f5e"
          : "#4f46e5"

    return (
        <div
            className={cn(
                "card-modern p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between gap-4 transition-all hover:shadow-lg",
                isOverdue && "border-rose-500/35",
                isCollected && "border-emerald-500/35 bg-emerald-500/[0.02]"
            )}
        >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: barColor }} />

            {/* Top Row: Contact Avatar + Status */}
            <div
                onClick={() => onViewDetails(receivable.id)}
                className="cursor-pointer space-y-3.5"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={cn(
                                "h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border",
                                isCollected
                                    ? "bg-emerald-500/12 text-emerald-600 border-emerald-500/25"
                                    : isOverdue
                                      ? "bg-rose-500/12 text-rose-600 border-rose-500/25"
                                      : "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
                            )}
                        >
                            {isCollected ? <CheckCircle2 className="h-5 w-5" /> : initials}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-extrabold text-base text-foreground truncate leading-snug">
                                {receivable.contactName}
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                Prestado el{" "}
                                {loanDateParsed ? format(loanDateParsed, "d MMM yyyy", { locale: es }) : "—"}
                            </p>
                        </div>
                    </div>

                    <span
                        className={cn(
                            "px-2.5 py-1 rounded-full text-[11px] font-extrabold shrink-0",
                            statusBadge.cls
                        )}
                    >
                        {statusBadge.label}
                    </span>
                </div>

                {/* Amount + Progress */}
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                {isCollected ? "Total cobrado" : "Pendiente"}
                            </span>
                            <span className="text-xl sm:text-2xl font-black tracking-tight tabular-nums text-foreground">
                                {isBalanceVisible
                                    ? formatMoney(
                                          isCollected
                                              ? receivable.originalAmount
                                              : receivable.outstandingBalance,
                                          receivable.currencyCode
                                      )
                                    : "••••••"}
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                            de{" "}
                            {isBalanceVisible
                                ? formatMoney(receivable.originalAmount, receivable.currencyCode)
                                : "••••"}
                        </span>
                    </div>

                    {!isCollected && (
                        <div className="space-y-1">
                            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percentPaid}%`, backgroundColor: barColor }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground tabular-nums">
                                <span>{percentPaid.toFixed(0)}% cobrado</span>
                                {daysText && (
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1",
                                            isOverdue && "text-rose-500 font-bold"
                                        )}
                                    >
                                        {isOverdue ? (
                                            <AlertCircle className="h-3 w-3" />
                                        ) : (
                                            <Calendar className="h-3 w-3" />
                                        )}
                                        {daysText}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                {!isCollected && (
                    <button
                        type="button"
                        onClick={() => onRegisterPayment(receivable.id)}
                        className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                    >
                        <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
                        Registrar cobro
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onViewDetails(receivable.id)}
                    className={cn(
                        "h-9 px-3 rounded-xl bg-muted/60 hover:bg-muted text-foreground/85 text-xs font-bold flex items-center justify-center gap-1 transition-colors",
                        isCollected && "flex-1"
                    )}
                >
                    <span>Detalles</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    )
}
