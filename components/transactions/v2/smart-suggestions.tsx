"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Zap, Target, Star, History } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartSuggestionsProps {
    onSelect: (description: string, amount?: string, categoryKeyword?: string) => void
    currentSpending?: number
    currentIncome?: number
    budgetLimit?: number
    transactions?: any[]
    currencySymbol?: string
    currentType?: "EXPENSE" | "INCOME" | "TRANSFER"
}

export function SmartSuggestions({
    onSelect,
    currentSpending = 0,
    currentIncome = 0,
    budgetLimit = 100,
    transactions = [],
    currencySymbol = "$",
    currentType = "EXPENSE"
}: SmartSuggestionsProps) {

    // Analyze history to find top recurring descriptions
    const suggestions = useMemo(() => {
        if (!transactions || transactions.length === 0) return []

        const counts: Record<string, { count: number, lastAmount: number, categoryId: string }> = {}

        transactions.forEach(t => {
            if (t.transactionType === 'EXPENSE' && t.description) {
                const desc = t.description.trim()
                const key = desc.toLowerCase()

                if (!counts[key]) {
                    counts[key] = { count: 0, lastAmount: 0, categoryId: t.expense_category_id }
                }
                counts[key].count++
                counts[key].lastAmount = t.amount
            }
        })

        const dynamic = Object.entries(counts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 4)
            .map(([desc, data]) => ({
                icon: data.count > 2 ? Star : History,
                text: desc.charAt(0).toUpperCase() + desc.slice(1),
                amount: "", // Explicitly empty as requested ("SIN MONTO")
                key: desc
            }))

        return dynamic

    }, [transactions])

    // Calculate "Budget Velocity" or "Income Target"
    const isExpense = currentType === 'EXPENSE'
    const displayAmount = isExpense ? currentSpending : currentIncome
    const percentage = Math.min((displayAmount / budgetLimit) * 100, 100)

    // Determine status color and text
    const statusColor = isExpense
        ? (percentage < 50 ? "bg-emerald-500" : percentage < 80 ? "bg-amber-500" : "bg-red-500")
        : (percentage < 30 ? "bg-amber-500" : "bg-emerald-500")

    const statusText = isExpense
        ? (percentage < 50 ? "En control" : percentage < 80 ? "Cuidado" : "Al límite")
        : (percentage < 100 ? "Falta poco" : "Meta lograda")

    const netBalance = currentIncome - currentSpending

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">

            {/* 1. Quick Actions Row */}
            {suggestions.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Frecuentes
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {suggestions.map((item, i) => (
                            <button
                                key={item.text}
                                onClick={() => onSelect(item.text, item.amount, item.key)}
                                className="group relative overflow-hidden bg-card hover:bg-muted/50 border border-input/50 hover:border-primary/20 p-3 rounded-xl transition-all duration-300 text-left flex flex-col gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                            >
                                <div className="flex justify-between items-start w-full">
                                    <div className="p-1.5 rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    {item.amount && (
                                        <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                                            {item.amount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground truncate w-full">
                                    {item.text}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. Financial Context / Pulse */}
            <div className="mt-8 pt-6 border-t border-dashed border-border/50">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-3 h-3 text-indigo-500" />
                        Pulso Financiero
                    </h4>
                    <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        percentage < 50 ? "bg-emerald-500/10 text-emerald-600" : percentage < 80 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                    )}>
                        {statusText}
                    </span>
                </div>

                <div className="relative h-24 bg-gradient-to-br from-card to-muted/20 rounded-2xl border border-input/50 p-5 overflow-hidden group">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#fff_1px,transparent_1px)]" />

                    <div className="relative z-10 flex justify-between items-end h-full">
                        <div>
                            <span className="text-xs text-muted-foreground font-medium block mb-1">
                                {isExpense ? "Gasto hoy (Lim. Diario)" : "Ingreso hoy (Meta Diaria)"}
                            </span>
                            <div className="text-3xl font-extrabold tracking-tighter text-foreground flex items-baseline gap-1">
                                {currencySymbol}{displayAmount.toFixed(2)}
                                <span className="text-sm font-normal text-muted-foreground">/ {currencySymbol}{budgetLimit.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Day Balance Indicator */}
                        <div className="text-right">
                            <div className={cn(
                                "flex items-center justify-end gap-1 text-xs font-bold mb-1",
                                netBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                            )}>
                                {netBalance >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{currencySymbol}{Math.abs(netBalance).toFixed(0)}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">Balance del día</span>
                        </div>
                    </div>

                    {/* Progress Bar background */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={cn("h-full", statusColor)}
                        />
                    </div>
                </div>
            </div>

        </div>
    )
}
