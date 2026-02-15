"use client"

import { useCategories } from "@/hooks/useCategories"
import { CategoryIcon } from "@/components/icons/category-icon"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X } from "lucide-react"

interface Category {
    id: string
    name: string
    type: "EXPENSE" | "INCOME"
    icon: string
    color: string
}

interface CategoryGridSelectorProps {
    selectedIds: string[]
    onToggle: (id: string, category: Category) => void
    type: "EXPENSE" | "INCOME" | "ALL"
    mode?: "INCLUDE" | "EXCLUDE"
}

export function CategoryGridSelector({ selectedIds, onToggle, type, mode = "INCLUDE" }: CategoryGridSelectorProps) {
    const { categories, isLoading } = useCategories()

    // Flatten categories from API response (The hook returns a flat array)
    const allCategories: Category[] = Array.isArray(categories) ? categories : []

    // Filter categories based on type
    const filteredCategories = allCategories.filter((cat) => {
        if (type === "ALL") return true
        return cat.type === type
    })

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground text-sm">Cargando categorías...</div>
    }

    if (filteredCategories.length === 0) {
        return <div className="p-4 text-center text-muted-foreground text-sm">No hay categorías disponibles.</div>
    }

    return (
        <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/20 p-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {filteredCategories.map((category) => {
                    const isSelected = selectedIds.includes(category.id)
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onToggle(category.id, category)
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-muted/50 relative group",
                                isSelected ? (mode === "INCLUDE" ? "bg-primary/10 ring-2 ring-primary" : "bg-destructive/10 ring-2 ring-destructive") : "bg-card border"
                            )}
                        >
                            <div
                                className={cn(
                                    "p-2 rounded-full transition-colors",
                                    isSelected ? "bg-transparent" : "bg-muted"
                                )}
                                style={{ color: isSelected ? undefined : category.color }}
                            >
                                <CategoryIcon name={category.icon} className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] text-center font-medium truncate w-full px-1">
                                {category.name}
                            </span>

                            {/* Selection Badge */}
                            {isSelected && (
                                <div className={cn(
                                    "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs shadow-sm",
                                    mode === "INCLUDE" ? "bg-primary" : "bg-destructive"
                                )}>
                                    {mode === "INCLUDE" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </ScrollArea>
    )
}
