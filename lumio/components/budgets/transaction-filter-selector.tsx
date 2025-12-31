"use client"

import { Check, Info, Wallet, TrendingUp, ArrowRightLeft, PiggyBank, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TRANSACTION_FILTER_OPTIONS, TransactionFilterMode, FilterCategory } from "@/types/budget"
import { Badge } from "@/components/ui/badge"

interface TransactionFilterSelectorProps {
    selectedFilters: TransactionFilterMode[]
    onToggle: (filter: TransactionFilterMode) => void
}

function getCategoryStyles(cat?: FilterCategory) {
    switch (cat) {
        case 'NEEDS': return { color: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', label: 'Needs (50%)' }
        case 'WANTS': return { color: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800', label: 'Wants (30%)' }
        case 'SAVINGS': return { color: 'text-green-600 dark:text-green-400', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800', label: 'Savings (20%)' }
        case 'NEUTRAL': return { color: 'text-slate-500 dark:text-slate-400', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', label: 'Flujo / Neutro' }
        case 'MIXED': return { color: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', label: 'Base Principal' }
        default: return { color: 'text-gray-500', badge: 'bg-gray-100', label: '' }
    }
}

function getIcon(mode: TransactionFilterMode) {
    switch (mode) {
        case 'DEFAULT': return Wallet
        case 'LOANED': return ArrowRightLeft
        case 'ADDED_TO_GOAL': return PiggyBank
        case 'BALANCE_CORRECTION': return Briefcase
        default: return Info
    }
}

export function TransactionFilterSelector({
    selectedFilters,
    onToggle
}: TransactionFilterSelectorProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-base font-semibold text-foreground">
                    ¿Qué dinero incluye este presupuesto?
                </label>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
                Personaliza qué cuentas y movimientos afectan tu barra de progreso. Elige sabiamente según la regla 50/30/20.
            </p>

            <ScrollArea className="h-[320px] w-full rounded-xl border bg-muted/10 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TRANSACTION_FILTER_OPTIONS.map((option) => {
                        const isSelected = selectedFilters.includes(option.value)
                        const isDefault = option.value === 'DEFAULT'
                        const styles = getCategoryStyles(option.filterCategory)
                        const Icon = getIcon(option.value)

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (isDefault && selectedFilters.length === 1 && isSelected) return
                                    onToggle(option.value)
                                }}
                                className={cn(
                                    "relative flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all hover:scale-[1.01]",
                                    isSelected
                                        ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm"
                                        : "bg-card border-border hover:border-muted-foreground/30 hover:bg-accent/50 opacity-80 hover:opacity-100"
                                )}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between w-full mb-2">
                                    <div className={cn("p-2 rounded-lg", isSelected ? "bg-primary/10" : "bg-muted")}>
                                        <Icon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                                        isSelected ? "bg-primary text-white" : "border-2 border-muted bg-transparent"
                                    )}>
                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-1">
                                    <h4 className={cn("font-bold text-sm", isSelected ? "text-foreground" : "text-muted-foreground")}>
                                        {option.label}
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {option.description}
                                    </p>
                                </div>

                                {/* Badge */}
                                {option.filterCategory && (
                                    <div className={cn("mt-3 px-2 py-0.5 rounded text-[10px] font-bold border", styles.badge)}>
                                        {styles.label}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
