"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    SlidersHorizontal,
    X,
    TrendingUp,
    TrendingDown,
    ArrowLeftRight,
    Wallet,
    Tag,
    DollarSign,
    Check,
    RotateCcw,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useTransactionFilters } from "@/hooks/useTransactionFilters"
import { useAccounts } from "@/hooks/useAccounts"
import { useCategories } from "@/hooks/useCategories"
import { useTags } from "@/hooks/useTags"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

export function TransactionFilterBar() {
    const { filters, setFilters, updateFilter, activeFiltersCount, clearFilters } = useTransactionFilters()
    const { accounts } = useAccounts()
    const { categories } = useCategories()
    const { tags: userTags } = useTags()
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
    const searchParams = useSearchParams()

    // Sync from URL to State once on mount
    const initialSyncRef = useRef(false)
    useEffect(() => {
        if (initialSyncRef.current) return
        initialSyncRef.current = true

        const paramQ = searchParams.get("q")
        const paramType = searchParams.get("type")
        const paramCategory = searchParams.get("categoryId")
        const paramAccount = searchParams.get("accountId")
        const paramMin = searchParams.get("min")
        const paramMax = searchParams.get("max")
        const paramCurrency = searchParams.get("currency")
        const paramMode = searchParams.get("mode")

        if (paramQ || paramType || paramCategory || paramAccount || paramMin || paramMax || paramCurrency || paramMode) {
            setFilters({
                ...(paramQ ? { search: paramQ } : {}),
                ...(paramType ? { type: paramType.toUpperCase() } : {}),
                ...(paramCategory ? { categoryId: paramCategory } : {}),
                ...(paramAccount ? { accountId: paramAccount } : {}),
                ...(paramMin ? { minAmount: paramMin } : {}),
                ...(paramMax ? { maxAmount: paramMax } : {}),
                ...(paramCurrency ? { currency: paramCurrency } : {}),
                ...(paramMode ? { mode: paramMode } : {}),
            })
        }
    }, [searchParams, setFilters])

    const allCategories = categories || []

    const currencies = useMemo(
        () => Array.from(new Set(accounts?.map((a: any) => a.currencyCode).filter(Boolean) || [])),
        [accounts]
    )

    const handleTypeChange = (type: string) => {
        updateFilter("type", filters.type === type ? "" : type)
    }

    return (
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full min-w-0 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Top Bar: Search + Filter Popover + Type Pills */}
            <div className="flex flex-col md:flex-row md:items-center gap-2.5 sm:gap-3 w-full min-w-0">
                {/* Search & Advanced Filter Button */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                    <div className="relative flex-1 min-w-0 group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <Input
                            placeholder="Buscar transacciones por descripción o categoría..."
                            value={filters.search || ""}
                            onChange={(e) => updateFilter("search", e.target.value)}
                            className="pl-9 pr-8 h-10 bg-muted/40 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl text-sm"
                        />
                        {filters.search && (
                            <button
                                type="button"
                                onClick={() => updateFilter("search", "")}
                                className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Advanced Filters Trigger */}
                    <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-10 px-3 sm:px-3.5 rounded-xl border-border/60 bg-muted/40 gap-2 relative transition-all shrink-0",
                                    activeFiltersCount > 0 && "border-primary/50 bg-primary/10 text-primary font-bold shadow-xs"
                                )}
                                aria-label="Filtros avanzados"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                <span className="text-xs font-bold">Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-black">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>

                        <PopoverContent
                            className="w-[320px] sm:w-[350px] p-0 rounded-3xl border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                            align="end"
                            sideOffset={8}
                        >
                            {/* Popover Header */}
                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                    </div>
                                    <h4 className="font-extrabold text-sm text-foreground">Filtros Avanzados</h4>
                                </div>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => clearFilters()}
                                        className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            {/* Popover Body */}
                            <div className="p-4 space-y-4 text-xs">
                                {/* Account Filter */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Wallet className="h-3.5 w-3.5 text-primary" />
                                        Cuenta
                                    </Label>
                                    <Select
                                        value={filters.accountId || "all"}
                                        onValueChange={(val) => updateFilter("accountId", val === "all" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/60 text-xs font-medium w-full">
                                            <SelectValue placeholder="Todas las cuentas" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-56">
                                            <SelectItem value="all" className="font-semibold text-xs">
                                                Todas las cuentas
                                            </SelectItem>
                                            {accounts?.map((acc: any) => (
                                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: acc.color || "#7C3AED" }}
                                                        />
                                                        <span className="font-semibold">{acc.name}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-auto uppercase font-mono">
                                                            {acc.currencyCode}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5 text-primary" />
                                        Categoría
                                    </Label>
                                    <Select
                                        value={filters.categoryId || "all"}
                                        onValueChange={(val) => updateFilter("categoryId", val === "all" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/60 text-xs font-medium w-full">
                                            <SelectValue placeholder="Todas las categorías" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-56">
                                            <SelectItem value="all" className="font-semibold text-xs">
                                                Todas las categorías
                                            </SelectItem>
                                            {allCategories?.map((cat: any) => (
                                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: cat.color || "#10B981" }}
                                                        />
                                                        <span>{cat.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Tag Filter */}
                                {userTags.length > 0 && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-primary" />
                                            Etiqueta
                                        </Label>
                                        <Select
                                            value={filters.tag || "all"}
                                            onValueChange={(val) => updateFilter("tag", val === "all" ? "" : val)}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/60 text-xs font-medium w-full">
                                                <SelectValue placeholder="Todas las etiquetas" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-56">
                                                <SelectItem value="all" className="font-semibold text-xs">
                                                    Todas las etiquetas
                                                </SelectItem>
                                                {userTags.map((t) => (
                                                    <SelectItem key={t.id} value={t.name} className="text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="w-2 h-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: t.color || "#7C3AED" }}
                                                            />
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Currency Filter (Segmented buttons) */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                                        Moneda
                                    </Label>
                                    <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
                                        <button
                                            type="button"
                                            onClick={() => updateFilter("currency", "")}
                                            className={cn(
                                                "flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all text-center",
                                                !filters.currency
                                                    ? "bg-card text-foreground shadow-xs border border-border/60"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            Todas
                                        </button>
                                        {currencies.map((curr: string) => (
                                            <button
                                                key={curr}
                                                type="button"
                                                onClick={() => updateFilter("currency", filters.currency === curr ? "" : curr)}
                                                className={cn(
                                                    "flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all text-center font-mono",
                                                    filters.currency === curr
                                                        ? "bg-primary text-primary-foreground shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {curr}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Amount Range Filter */}
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                                        Rango de Importe
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Mínimo"
                                                value={filters.minAmount || ""}
                                                onChange={(e) => updateFilter("minAmount", e.target.value)}
                                                className="h-9 rounded-xl bg-muted/30 border-border/60 text-xs font-semibold tabular-nums"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="Máximo"
                                                value={filters.maxAmount || ""}
                                                onChange={(e) => updateFilter("maxAmount", e.target.value)}
                                                className="h-9 rounded-xl bg-muted/30 border-border/60 text-xs font-semibold tabular-nums"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Popover Footer */}
                            <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">
                                    {activeFiltersCount === 0
                                        ? "Sin filtros aplicados"
                                        : `${activeFiltersCount} ${activeFiltersCount === 1 ? "filtro activo" : "filtros activos"}`}
                                </span>
                                <Button
                                    size="sm"
                                    onClick={() => setIsAdvancedOpen(false)}
                                    className="h-8 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground shadow-sm"
                                >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Listo
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Quick Activity Type Pills */}
                <div className="grid grid-cols-4 md:inline-flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/50 w-full md:w-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => updateFilter("type", "")}
                        className={cn(
                            "flex items-center justify-center h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all truncate",
                            !filters.type
                                ? "bg-card text-foreground shadow-sm border border-border/60"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange("INCOME")}
                        className={cn(
                            "flex items-center justify-center gap-1 h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all truncate",
                            filters.type === "INCOME"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-sm"
                                : "text-muted-foreground hover:text-emerald-600"
                        )}
                    >
                        <TrendingUp className="h-3 w-3 shrink-0 hidden sm:inline" />
                        <span>Ingresos</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange("EXPENSE")}
                        className={cn(
                            "flex items-center justify-center gap-1 h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all truncate",
                            filters.type === "EXPENSE"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-sm"
                                : "text-muted-foreground hover:text-rose-600"
                        )}
                    >
                        <TrendingDown className="h-3 w-3 shrink-0 hidden sm:inline" />
                        <span>Gastos</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTypeChange("TRANSFER")}
                        className={cn(
                            "flex items-center justify-center gap-1 h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold rounded-lg transition-all truncate",
                            filters.type === "TRANSFER"
                                ? "bg-primary/15 text-primary border border-primary/25 shadow-sm"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <ArrowLeftRight className="h-3 w-3 shrink-0 hidden sm:inline" />
                        <span>Transf.</span>
                    </button>
                </div>
            </div>

            {/* Active Filters Row (Mini Pills) */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200 pt-0.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Activos:</span>

                    {filters.accountId && (
                        <Badge
                            variant="secondary"
                            className="pl-2 pr-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] font-semibold h-6 flex items-center gap-1.5"
                        >
                            <Wallet className="h-3 w-3" />
                            <span>{accounts?.find((a: any) => a.id === filters.accountId)?.name || "Cuenta"}</span>
                            <button
                                type="button"
                                onClick={() => updateFilter("accountId", "")}
                                className="hover:text-foreground p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {filters.categoryId && (
                        <Badge
                            variant="secondary"
                            className="pl-2 pr-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] font-semibold h-6 flex items-center gap-1.5"
                        >
                            <Tag className="h-3 w-3" />
                            <span>{allCategories?.find((c: any) => c.id === filters.categoryId)?.name || "Categoría"}</span>
                            <button
                                type="button"
                                onClick={() => updateFilter("categoryId", "")}
                                className="hover:text-foreground p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {filters.currency && (
                        <Badge
                            variant="secondary"
                            className="pl-2 pr-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] font-semibold h-6 flex items-center gap-1.5"
                        >
                            <DollarSign className="h-3 w-3" />
                            <span className="font-mono">{filters.currency}</span>
                            <button
                                type="button"
                                onClick={() => updateFilter("currency", "")}
                                className="hover:text-foreground p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {(filters.minAmount || filters.maxAmount) && (
                        <Badge
                            variant="secondary"
                            className="pl-2 pr-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-lg text-[10px] font-semibold h-6 flex items-center gap-1.5"
                        >
                            <DollarSign className="h-3 w-3" />
                            <span>
                                {filters.minAmount || "0"} - {filters.maxAmount || "∞"}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    updateFilter("minAmount", "")
                                    updateFilter("maxAmount", "")
                                }}
                                className="hover:text-foreground p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    <button
                        type="button"
                        onClick={() => clearFilters()}
                        className="text-[10px] font-bold text-muted-foreground hover:text-rose-500 transition-colors ml-1 underline decoration-dotted"
                    >
                        Limpiar todo
                    </button>
                </div>
            )}
        </div>
    )
}
