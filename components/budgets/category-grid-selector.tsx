"use client"

import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
import { CategoryIcon } from "@/components/icons/category-icon"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, X, RefreshCw, AlertCircle, Search } from "lucide-react"

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
    const { categories, isLoading, error, refetch } = useCategories()
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTypeTab, setActiveTypeTab] = useState<"EXPENSE" | "INCOME" | "ALL">(
        type === "ALL" ? "EXPENSE" : type
    )

    // Flatten categories from API response (The hook returns a flat array)
    const rawCategories: Category[] = Array.isArray(categories) ? categories : []

    // 1. Strict deduplication by (normalized name + type) to guarantee no duplicated tiles
    const dedupedCategories: Category[] = []
    const seenMap = new Map<string, Category>()

    for (const cat of rawCategories) {
        if (!cat || !cat.name) continue
        const normName = cat.name.trim().toLowerCase()
        const key = `${normName}__${cat.type || 'EXPENSE'}`

        if (!seenMap.has(key)) {
            seenMap.set(key, cat)
            dedupedCategories.push(cat)
        }
    }

    // Filter categories based on active type tab
    const filteredByType = dedupedCategories.filter((cat) => {
        if (activeTypeTab === "ALL") return true
        return cat.type === activeTypeTab
    })

    const filteredCategories = searchTerm.trim()
        ? filteredByType.filter((cat) => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : filteredByType

    if (isLoading) {
        return (
            <div className="w-full rounded-2xl border border-border/40 bg-muted/20 p-5 space-y-4">
                <div className="h-9 w-48 bg-muted/60 animate-pulse rounded-lg" />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 animate-pulse">
                            <div className="w-10 h-10 rounded-full bg-muted/80" />
                            <div className="w-16 h-3 bg-muted/60 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error && filteredCategories.length === 0) {
        return (
            <div className="w-full rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <p className="font-semibold text-foreground text-sm">Hubo un problema al cargar las categorías</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Verifica tu conexión a internet o intenta recargar los datos.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="rounded-full gap-2 text-xs font-semibold"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                </Button>
            </div>
        )
    }

    const expenseCount = dedupedCategories.filter(c => c.type === 'EXPENSE').length
    const incomeCount = dedupedCategories.filter(c => c.type === 'INCOME').length

    return (
        <div className="space-y-4 w-full">
            {/* Header Controls: Type Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {type === "ALL" && (
                    <div className="flex items-center p-1 bg-muted/50 dark:bg-muted/30 rounded-xl border border-border/40 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTypeTab("EXPENSE")}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTypeTab === "EXPENSE"
                                    ? "bg-background text-foreground shadow-xs border border-border/50"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Gastos ({expenseCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTypeTab("INCOME")}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTypeTab === "INCOME"
                                    ? "bg-background text-foreground shadow-xs border border-border/50"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Ingresos ({incomeCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTypeTab("ALL")}
                            className={cn(
                                "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTypeTab === "ALL"
                                    ? "bg-background text-foreground shadow-xs border border-border/50"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Todos
                        </button>
                    </div>
                )}

                <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs bg-card/60 border-border/40 w-full"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {filteredCategories.length === 0 ? (
                <div className="w-full rounded-2xl border border-border/50 bg-muted/20 p-8 text-center space-y-3">
                    <p className="font-medium text-muted-foreground text-sm">
                        {searchTerm ? `No se encontraron categorías que coincidan con "${searchTerm}".` : "No hay categorías disponibles en esta sección."}
                    </p>
                    {searchTerm ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm("")}
                            className="text-xs font-medium text-primary"
                        >
                            Limpiar búsqueda
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="rounded-full gap-2 text-xs font-semibold"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Recargar categorías
                        </Button>
                    )}
                </div>
            ) : (
                <ScrollArea className="h-[290px] w-full rounded-2xl border border-border/40 bg-muted/10 p-3 sm:p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
                        {filteredCategories.map((category) => {
                            const isSelected = selectedIds.includes(category.id)
                            return (
                                <button
                                    key={`${category.id}-${category.type}`}
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onToggle(category.id, category)
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] relative group",
                                        isSelected
                                            ? (mode === "INCLUDE"
                                                ? "bg-primary/10 border-2 border-primary shadow-sm"
                                                : "bg-destructive/10 border-2 border-destructive shadow-sm")
                                            : "bg-card/80 border border-border/50 hover:bg-muted/40 shadow-xs"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-2.5 rounded-2xl transition-colors",
                                            isSelected ? "bg-primary/15" : "bg-muted/50"
                                        )}
                                        style={{ color: category.color || "#8b5cf6" }}
                                    >
                                        <CategoryIcon name={category.icon} className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className="text-[11px] text-center font-medium truncate w-full px-1 text-foreground">
                                        {category.name}
                                    </span>
                                    {activeTypeTab === "ALL" && (
                                        <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                                            {category.type === "INCOME" ? "Ingreso" : "Gasto"}
                                        </span>
                                    )}

                                    {/* Selection Badge */}
                                    {isSelected && (
                                        <div className={cn(
                                            "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-md animate-in zoom-in-50 duration-200",
                                            mode === "INCLUDE" ? "bg-primary" : "bg-destructive"
                                        )}>
                                            {mode === "INCLUDE" ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
            )}
        </div>
    )
}
