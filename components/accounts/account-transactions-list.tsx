"use client"

import React from "react"
import { useFormat } from "@/hooks/useFormat"
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Calendar, Loader2, Inbox } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AccountTransactionsListProps {
    transactions: any[]
    currencyCode?: string
    onLoadMore?: () => void
    hasMore?: boolean
    isLoadingMore?: boolean
    headerContent?: React.ReactNode
}

export function AccountTransactionsList({
    transactions = [],
    currencyCode = "USD",
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    headerContent,
}: AccountTransactionsListProps) {
    const { formatMoney } = useFormat()

    return (
        <div className="space-y-4">
            {headerContent && (
                <div className="w-full">
                    {headerContent}
                </div>
            )}

            <div className="bg-card rounded-3xl p-5 border border-border/50 shadow-xs space-y-3">
                {transactions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                            <Inbox className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-foreground">No hay movimientos</h4>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                No se encontraron transacciones registradas para este periodo o criterio de búsqueda.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border/40">
                        {transactions.map((tx: any) => {
                            const isExpense = tx.type === "EXPENSE"
                            const isIncome = tx.type === "INCOME"
                            const isTransfer = tx.type === "TRANSFER"
                            const amount = Number(tx.amount) || 0

                            let formattedDate = ""
                            try {
                                const d = typeof tx.date === "string" ? parseISO(tx.date) : new Date(tx.date)
                                formattedDate = format(d, "d MMM, yyyy", { locale: es })
                            } catch {
                                formattedDate = tx.date || ""
                            }

                            return (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between py-3.5 px-2 hover:bg-muted/30 rounded-2xl transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform",
                                                isIncome && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                                isExpense && "bg-red-500/10 text-red-600 dark:text-red-400",
                                                isTransfer && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                            )}
                                        >
                                            {isIncome && <ArrowDownLeft className="w-5 h-5" />}
                                            {isExpense && <ArrowUpRight className="w-5 h-5" />}
                                            {isTransfer && <ArrowRightLeft className="w-5 h-5" />}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {tx.description || tx.title || "Sin descripción"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                                <span>{formattedDate}</span>
                                                {tx.category?.name && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-medium text-foreground/80">{tx.category.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right pl-3 shrink-0">
                                        <div
                                            className={cn(
                                                "text-sm font-bold font-mono tracking-tight",
                                                isIncome && "text-emerald-600 dark:text-emerald-400",
                                                isExpense && "text-foreground",
                                                isTransfer && "text-indigo-600 dark:text-indigo-400"
                                            )}
                                        >
                                            {isIncome ? "+" : isExpense ? "-" : ""}
                                            {formatMoney(Math.abs(amount), tx.currencyCode || currencyCode)}
                                        </div>
                                        {tx.status && tx.status !== "COMPLETED" && (
                                            <Badge variant="outline" className="text-[10px] mt-1 rounded-full px-2 py-0">
                                                {tx.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {hasMore && (
                    <div className="pt-2 flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="rounded-full px-6 font-medium text-xs border-border/60 hover:bg-primary/5"
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    Cargando más...
                                </>
                            ) : (
                                "Cargar más movimientos"
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AccountTransactionsList
