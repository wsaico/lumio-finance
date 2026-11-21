"use client"

import * as React from "react"
import { Search, Check, ChevronRight, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CategoryIcon } from "@/components/icons/category-icon"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export interface CategoryOption {
    id: string
    name: string
    icon?: string | null
    color?: string | null
    type?: string
    subcategories?: {
        id: string
        name: string
        icon?: string | null
    }[]
}

export interface PremiumCategoryPickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    categories: CategoryOption[]
    selectedCategoryId?: string
    selectedSubcategoryId?: string
    recentCategoryIds?: string[]
    type?: "EXPENSE" | "INCOME"
    onSelect: (categoryId: string, subcategoryId?: string) => void
}

export function PremiumCategoryPicker({
    open,
    onOpenChange,
    categories,
    selectedCategoryId,
    selectedSubcategoryId,
    recentCategoryIds = [],
    type = "EXPENSE",
    onSelect,
}: PremiumCategoryPickerProps) {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [search, setSearch] = React.useState("")
    const [expandedCatId, setExpandedCatId] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) {
            setSearch("")
            setExpandedCatId(null)
        }
    }, [open])

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase()
        return categories.filter((c) => {
            if (c.type && c.type !== type) return false
            if (!q) return true
            const matchMain = c.name.toLowerCase().includes(q)
            const matchSub = c.subcategories?.some((s) => s.name.toLowerCase().includes(q))
            return matchMain || matchSub
        })
    }, [categories, type, search])

    const recentCategories = React.useMemo(() => {
        if (search.trim() || recentCategoryIds.length === 0) return []
        return recentCategoryIds
            .map((id) => filtered.find((c) => c.id === id))
            .filter((c): c is CategoryOption => Boolean(c))
            .slice(0, 4)
    }, [recentCategoryIds, filtered, search])

    const handlePick = (catId: string, subId?: string) => {
        onSelect(catId, subId)
        onOpenChange(false)
    }

    const content = (
        <div className="flex flex-col gap-4 max-h-[75vh]">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar categoría o subcategoría..."
                    className="w-full h-11 rounded-2xl bg-muted/60 pl-10 pr-9 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="overflow-y-auto pr-1 space-y-5 flex-1">
                {/* Recent / Frequent Strip */}
                {recentCategories.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Más usadas
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {recentCategories.map((cat) => {
                                const isSelected = selectedCategoryId === cat.id && !selectedSubcategoryId
                                return (
                                    <button
                                        key={`recent-${cat.id}`}
                                        type="button"
                                        onClick={() => handlePick(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left",
                                            isSelected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border/60 bg-card hover:border-primary/40"
                                        )}
                                    >
                                        <span
                                            className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                                            style={{ backgroundColor: cat.color || "var(--primary)" }}
                                        >
                                            <CategoryIcon name={cat.icon || "tag"} className="h-4 w-4" />
                                        </span>
                                        <span className="text-xs font-bold truncate">{cat.name}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Main Grid */}
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Todas las categorías ({filtered.length})
                    </p>
                    {filtered.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            No se encontraron categorías para &ldquo;{search}&rdquo;
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {filtered.map((cat) => {
                                const hasSubs = Boolean(cat.subcategories && cat.subcategories.length > 0)
                                const isSelected = selectedCategoryId === cat.id
                                const isExpanded = expandedCatId === cat.id || (search.trim().length > 0 && hasSubs)

                                return (
                                    <div
                                        key={cat.id}
                                        className={cn(
                                            "rounded-2xl border transition-all overflow-hidden",
                                            isExpanded ? "col-span-2 sm:col-span-3 border-primary/40 bg-muted/30" : "border-border/60 bg-card hover:border-primary/40",
                                            isSelected && !isExpanded && "border-primary bg-primary/8 ring-1 ring-primary/20"
                                        )}
                                    >
                                        <div className="flex items-center justify-between p-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handlePick(cat.id)}
                                                className="flex items-center gap-3 min-w-0 flex-1 text-left"
                                            >
                                                <span
                                                    className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                                                    style={{ backgroundColor: cat.color || "var(--primary)" }}
                                                >
                                                    <CategoryIcon name={cat.icon || "tag"} className="h-5 w-5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-foreground truncate">
                                                        {cat.name}
                                                    </p>
                                                    {hasSubs && (
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {cat.subcategories!.length} subcategorías
                                                        </p>
                                                    )}
                                                </div>
                                            </button>

                                            {hasSubs ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                                                    className="h-8 w-8 rounded-xl bg-muted/70 hover:bg-primary/15 hover:text-primary flex items-center justify-center shrink-0 transition-colors"
                                                    aria-label="Ver subcategorías"
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            "h-4 w-4 transition-transform",
                                                            isExpanded && "rotate-90"
                                                        )}
                                                    />
                                                </button>
                                            ) : (
                                                isSelected && <Check className="h-4 w-4 text-primary shrink-0" />
                                            )}
                                        </div>

                                        {isExpanded && hasSubs && (
                                            <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5 border-t border-border/40">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePick(cat.id)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                                                        isSelected && !selectedSubcategoryId
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-card border border-border/60 text-foreground hover:border-primary/40"
                                                    )}
                                                >
                                                    General ({cat.name})
                                                </button>
                                                {cat.subcategories!.map((sub) => {
                                                    const subActive = isSelected && selectedSubcategoryId === sub.id
                                                    return (
                                                        <button
                                                            key={sub.id}
                                                            type="button"
                                                            onClick={() => handlePick(cat.id, sub.id)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
                                                                subActive
                                                                    ? "bg-primary text-primary-foreground shadow-xs"
                                                                    : "bg-card border border-border/60 text-foreground hover:border-primary/40"
                                                            )}
                                                        >
                                                            {sub.icon && <CategoryIcon name={sub.icon} className="h-3.5 w-3.5" />}
                                                            {sub.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-4 pb-8 max-h-[88vh]">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
                    <SheetHeader className="mb-3 text-left">
                        <SheetTitle className="text-lg font-extrabold">
                            Categoría de {type === "INCOME" ? "Ingreso" : "Gasto"}
                        </SheetTitle>
                    </SheetHeader>
                    {content}
                </SheetContent>
            </Sheet>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-3xl p-6 border-border/60">
                <DialogHeader>
                    <DialogTitle className="text-xl font-extrabold">
                        Categoría de {type === "INCOME" ? "Ingreso" : "Gasto"}
                    </DialogTitle>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    )
}
