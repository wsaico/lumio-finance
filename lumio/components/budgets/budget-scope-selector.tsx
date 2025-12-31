"use client"

import { cn } from "@/lib/utils"
import { BUDGET_SCOPE_OPTIONS, BudgetScope } from "@/types/budget"

interface BudgetScopeSelectorProps {
    selected: BudgetScope
    onChange: (scope: BudgetScope) => void
}

export function BudgetScopeSelector({ selected, onChange }: BudgetScopeSelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de presupuesto</label>
            <div className="grid grid-cols-2 gap-2">
                {BUDGET_SCOPE_OPTIONS.map((option) => {
                    const isSelected = selected === option.value

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onChange(option.value)
                            }}
                            className={cn(
                                "flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left",
                                isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                            )}
                        >
                            <div className="flex items-center gap-2 w-full mb-1">
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                )}>
                                    {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                </div>
                                <span className="text-sm font-medium">{option.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                                {option.description}
                            </p>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
