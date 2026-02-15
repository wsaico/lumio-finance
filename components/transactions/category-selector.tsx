"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Globe, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

// --- REUSABLE GRID COMPONENT ---
export function CategoryGrid({ categories, categoryId, subcategoryId, onSelect, enableTabs = true }: {
    categories: any[],
    categoryId?: string,
    subcategoryId?: string,
    onSelect: (id: string, subId?: string) => void,
    enableTabs?: boolean
}) {
    const [searchTerm, setSearchTerm] = React.useState("")
    const [activeTab, setActiveTab] = React.useState<"NEED" | "WANT" | "SAVINGS" | "ALL">("ALL")
    const [activeParentId, setActiveParentId] = React.useState<string | null>(null)
    const hasAutoOpened = React.useRef(false)

    // Sync activeParentId with incoming categoryId ONLY ONCE on mount
    React.useEffect(() => {
        if (categoryId && !activeParentId && !searchTerm && !hasAutoOpened.current) {
            setActiveParentId(categoryId)
            hasAutoOpened.current = true
        }
    }, [categoryId, searchTerm, activeParentId])

    // Find active parent
    const activeParent = React.useMemo(() =>
        categories?.find(c => c.id === (activeParentId || categoryId))
        , [categories, activeParentId, categoryId])

    // Filter Logic
    const filteredCategories = React.useMemo(() => {
        let filtered = categories || []

        // If searching, ignore tabs and show all matching cats/subcats
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            return filtered.filter(c =>
                c.name.toLowerCase().includes(lowerSearch) ||
                c.subcategories?.some((s: any) => s.name.toLowerCase().includes(lowerSearch))
            ).sort((a, b) => (Number(b.is_system) - Number(a.is_system)))
        }

        // 1. Filter by Tab (Budget Rule)
        if (enableTabs && activeTab !== "ALL") {
            filtered = filtered.filter(c => {
                const rule = c.budget_rule || 'WANT'
                return rule === activeTab
            })
        }

        // Sort: System first for global visibility
        return filtered.sort((a, b) => (Number(b.is_system) - Number(a.is_system)))
    }, [categories, activeTab, searchTerm, enableTabs])

    // If searching, we don't drill down manually, we just show matches.
    // If not searching and we have an active parent, show subcategories.
    const showSubcategories = !searchTerm && activeParentId && activeParent;

    return (
        <div className="flex flex-col h-full bg-background rounded-2xl overflow-hidden">
            {/* Header: Search */}
            <div className="flex items-center gap-2 p-3 bg-muted/30 border-b shrink-0">
                <Search className="w-4 h-4 text-muted-foreground ml-2" />
                <input
                    className="flex-1 bg-transparent border-0 outline-none text-sm font-medium placeholder:text-muted-foreground"
                    placeholder="Buscar categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus={false}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="mr-2">
                        <X className="w-4 h-4 text-muted-foreground/70 hover:text-foreground" />
                    </button>
                )}
            </div>

            {/* Header: Subcategory Breadcrumb / Back button */}
            {showSubcategories && (
                <div className="flex items-center gap-2 px-3 pt-2 shrink-0 animate-in fade-in slide-in-from-left-2 duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setActiveParentId(null)}
                    >
                        <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold truncate">
                        <span className="text-muted-foreground truncate">{activeParent.name}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="shrink-0 text-primary">Subcategorías</span>
                    </div>
                </div>
            )}

            {/* Body: Tabs & Grid */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Tabs (Only show if enabled and not searching and not in subcategories) */}
                {enableTabs && !searchTerm && !activeParentId && (
                    <div className="px-3 pt-3 shrink-0 animate-in fade-in duration-200">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                            <TabsList className="w-full grid grid-cols-4 bg-muted/50 p-1 h-9 rounded-xl">
                                <TabsTrigger value="ALL" className="text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">Todo</TabsTrigger>
                                <TabsTrigger value="NEED" className="text-[10px] sm:text-xs rounded-lg gap-1 data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/40 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 50%
                                </TabsTrigger>
                                <TabsTrigger value="WANT" className="text-[10px] sm:text-xs rounded-lg gap-1 data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/40 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 30%
                                </TabsTrigger>
                                <TabsTrigger value="SAVINGS" className="text-[10px] sm:text-xs rounded-lg gap-1 data-[state=active]:bg-emerald-100 dark:data-[state=active]:bg-emerald-900/40 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 20%
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                <ScrollArea className="flex-1 p-3">
                    {!showSubcategories && filteredCategories.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-50 gap-2 py-10">
                            <Search className="w-8 h-8 text-muted-foreground/50" />
                            <p className="text-sm font-medium">No encontramos "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-10">
                            {showSubcategories ? (
                                <>
                                    {/* Option to select ONLY the parent (General) */}
                                    <button
                                        onClick={() => onSelect(activeParent.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border border-transparent hover:border-border/50 hover:bg-muted/50 relative group outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                            categoryId === activeParent.id && !subcategoryId && "bg-muted border-primary/20 shadow-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-white shadow-sm bg-slate-400"
                                        )} style={{ backgroundColor: activeParent.color }}>
                                            <Check className={cn("w-5 h-5 transition-opacity", categoryId === activeParent.id && !subcategoryId ? "opacity-100" : "opacity-20")} />
                                        </div>
                                        <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full">
                                            General
                                        </span>
                                    </button>

                                    {/* Real Subcategories */}
                                    {activeParent.subcategories?.map((sub: any) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => onSelect(activeParent.id, sub.id)}
                                            className={cn(
                                                "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border border-transparent hover:border-border/50 hover:bg-muted/50 relative group outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                                subcategoryId === sub.id && "bg-muted border-primary/20 shadow-sm"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-white shadow-sm",
                                                subcategoryId === sub.id ? "bg-slate-300 dark:bg-zinc-700 shadow-inner" : "bg-slate-100 dark:bg-zinc-800"
                                            )}>
                                                <CategoryIcon
                                                    name={sub.icon || activeParent.icon}
                                                    className={cn(
                                                        "w-5 h-5",
                                                        subcategoryId === sub.id ? "text-primary" : "text-muted-foreground"
                                                    )}
                                                />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-medium text-center leading-tight line-clamp-2 w-full",
                                                subcategoryId === sub.id ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {sub.name}
                                            </span>
                                        </button>
                                    ))}
                                </>
                            ) : (
                                filteredCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            if (cat.subcategories?.length > 0) {
                                                setSearchTerm("")
                                                setActiveParentId(cat.id)
                                            } else {
                                                onSelect(cat.id)
                                            }
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all border border-transparent hover:border-border/50 hover:bg-muted/50 relative group outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                            categoryId === cat.id && "bg-muted border-primary/20 shadow-sm"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors text-white shadow-sm",
                                            // Dynamic coloring based on rule if active, or just cat color
                                            enableTabs && cat.budget_rule === 'NEED' ? "bg-blue-500" :
                                                enableTabs && cat.budget_rule === 'SAVINGS' ? "bg-emerald-500" :
                                                    "bg-purple-500" // WANT default or Fallback
                                        )} style={cat.color && (!enableTabs || (activeTab === 'ALL')) ? { backgroundColor: cat.color } : undefined}>
                                            <CategoryIcon name={cat.icon} className="w-5 h-5" />
                                        </div>

                                        <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full">
                                            {cat.name}
                                        </span>

                                        {/* Global Indicator */}
                                        {cat.is_system && (
                                            <div className="absolute top-1 right-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-[8px]">
                                                    <Globe className="w-2.5 h-2.5 text-slate-500" />
                                                </Badge>
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    <ScrollBar orientation="vertical" />
                </ScrollArea>
            </div>
        </div>
    )
}

// --- POPOVER COMPONENT (Desktop/Responsive) ---
export interface CategorySelectorProps {
    categories: any[]
    categoryId?: string | null
    subcategoryId?: string | null
    onChange: (categoryId: string, subcategoryId?: string) => void
    onNewCategory?: () => void
    enableTabs?: boolean // Enable 50/30/20 tabs
    autoFocus?: boolean
    defaultOpen?: boolean
}

export function CategorySelector({
    categories,
    categoryId,
    subcategoryId,
    onChange,
    onNewCategory,
    enableTabs = false,
    autoFocus = false,
    defaultOpen = false
}: CategorySelectorProps) {
    const [open, setOpen] = React.useState(false)

    // Force open on mount if defaultOpen is true (delayed to ensure Dialog is ready)
    React.useEffect(() => {
        if (defaultOpen) {
            const timer = setTimeout(() => setOpen(true), 150)
            return () => clearTimeout(timer)
        }
    }, [defaultOpen])

    // Find display name
    const selectedCategory = categories?.find(c => c.id === categoryId)
    const selectedSubcategory = selectedCategory?.subcategories?.find((s: any) => s.id === subcategoryId)

    const displayName = selectedSubcategory
        ? `${selectedCategory?.name}: ${selectedSubcategory.name}`
        : selectedCategory?.name || "Selecciona Categoría"

    const handleSelect = (catId: string, subId?: string) => {
        onChange(catId, subId)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    autoFocus={autoFocus}
                    className="w-full justify-between h-14 text-base font-medium border-input/60 bg-muted/20 hover:bg-muted/40 transition-all rounded-2xl px-4 shadow-sm"
                >
                    <div className="flex items-center gap-3 truncate">
                        {selectedCategory ? (
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-300"
                            )}>
                                <CategoryIcon name={selectedCategory.icon} className="h-4 w-4" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-dashed border-slate-300 dark:border-zinc-700">
                                <Plus className="w-4 h-4 text-muted-foreground" />
                            </div>
                        )}
                        <span className={cn("text-base font-medium", !selectedCategory && "text-muted-foreground")}>
                            {displayName}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] sm:w-[500px] h-[400px] p-0 rounded-2xl overflow-hidden shadow-2xl border-0" align="start">
                <CategoryGrid
                    categories={categories}
                    categoryId={categoryId || undefined}
                    subcategoryId={subcategoryId || undefined}
                    onSelect={handleSelect}
                    enableTabs={enableTabs}
                />
                {/* Footer */}
                {onNewCategory && (
                    <div className="p-2 border-t bg-muted/20 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-primary gap-2 h-8"
                            onClick={onNewCategory}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Crear nueva categoría
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
