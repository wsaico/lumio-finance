"use client"

import { useState, useMemo, useEffect } from "react"
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
    Calendar,
    ChevronDown,
    Filter
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
import { cn } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"

export function TransactionFilterBar() {
    const { filters, setFilters, activeFiltersCount, clearFilters } = useTransactionFilters()
    const { accounts } = useAccounts()
    const { categories } = useCategories()
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()

    // Sync from URL to State on Mount/Update
    useEffect(() => {
        const newFilters = { ...filters }
        let hasChanges = false

        // Search Query
        const paramQ = searchParams.get('q') || ''
        if (paramQ !== filters.search) {
            newFilters.search = paramQ
            hasChanges = true
        }

        // Type
        const paramType = searchParams.get('type') || ''
        if (paramType !== filters.type) {
            newFilters.type = paramType
            hasChanges = true
        }

        // Category
        const paramCategory = searchParams.get('categoryId') || ''
        if (paramCategory !== filters.categoryId) {
            newFilters.categoryId = paramCategory
            hasChanges = true
        }

        // Account
        const paramAccount = searchParams.get('accountId') || ''
        if (paramAccount !== filters.accountId) {
            newFilters.accountId = paramAccount
            hasChanges = true
        }

        // Min Amount
        const paramMin = searchParams.get('min') || ''
        if (paramMin !== filters.minAmount) {
            newFilters.minAmount = paramMin
            hasChanges = true
        }

        // Max Amount
        const paramMax = searchParams.get('max') || ''
        if (paramMax !== filters.maxAmount) {
            newFilters.maxAmount = paramMax
            hasChanges = true
        }

        // Currency
        const paramCurrency = searchParams.get('currency') || ''
        if (paramCurrency !== filters.currency) {
            newFilters.currency = paramCurrency
            hasChanges = true
        }

        // Mode
        const paramMode = searchParams.get('mode') || ''
        if (paramMode !== filters.mode) {
            newFilters.mode = paramMode
            hasChanges = true
        }

        if (hasChanges) {
            setFilters(newFilters)
        }
    }, [searchParams])



    const allCategories = categories || []

    const currencies = useMemo(() =>
        Array.from(new Set(accounts?.map((a: any) => a.currencyCode) || [])),
        [accounts])

    const handleTypeChange = (type: string) => {
        setFilters({ ...filters, type: filters.type === type ? '' : type })
    }

    return (
        <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Top Bar: Search & Quick Actions */}
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                {/* Search Bar - Glassmorphism */}
                <div className="relative flex-1 w-full group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                        placeholder="Buscar transacciones..."
                        value={filters.search || ''}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-10 h-10 bg-background/50 backdrop-blur-md border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                    />
                    {filters.search && (
                        <button
                            onClick={() => setFilters({ ...filters, search: '' })}
                            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Quick Activity Pills */}
                <div className="flex items-center gap-2 p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-muted-foreground/10 h-10">
                    <button
                        onClick={() => setFilters({ ...filters, type: '' })}
                        className={cn(
                            "px-4 h-7 text-xs font-semibold rounded-xl transition-all",
                            !filters.type
                                ? "bg-background text-foreground shadow-sm border border-muted-foreground/10"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => handleTypeChange('INCOME')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-xl transition-all",
                            filters.type === 'INCOME'
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm"
                                : "text-muted-foreground hover:text-emerald-500/80"
                        )}
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Ingresos
                    </button>
                    <button
                        onClick={() => handleTypeChange('EXPENSE')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-xl transition-all",
                            filters.type === 'EXPENSE'
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm"
                                : "text-muted-foreground hover:text-rose-500/80"
                        )}
                    >
                        <TrendingDown className="h-3.5 w-3.5" />
                        Gastos
                    </button>
                    <button
                        onClick={() => handleTypeChange('TRANSFER')}
                        className={cn(
                            "flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-xl transition-all",
                            filters.type === 'TRANSFER'
                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm"
                                : "text-muted-foreground hover:text-blue-500/80"
                        )}
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Transf.
                    </button>
                </div>

                {/* Advanced Filters Trigger */}
                <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "h-10 px-4 rounded-xl border-muted-foreground/20 bg-background/50 gap-2 relative transition-all",
                                activeFiltersCount > 0 && "border-primary/50 bg-primary/5 text-primary"
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Avanzado</span>
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold border-2 border-background">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="end">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                            <h4 className="font-bold text-sm">Filtros Avanzados</h4>
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={() => {
                                        clearFilters()
                                        router.push('/dashboard/transactions')
                                    }}
                                    className="text-[10px] font-bold text-primary hover:underline"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Account Filter */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <Wallet className="h-3 w-3" />
                                    Cuenta
                                </Label>
                                <Select
                                    value={filters.accountId || 'all'}
                                    onValueChange={(value) => setFilters({ ...filters, accountId: value === 'all' ? '' : value })}
                                >
                                    <SelectTrigger className="h-9 rounded-lg">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las cuentas</SelectItem>
                                        {accounts?.map((account: any) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                                                    {account.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <Tag className="h-3 w-3" />
                                    Categoría
                                </Label>
                                <Select
                                    value={filters.categoryId || 'all'}
                                    onValueChange={(value) => setFilters({ ...filters, categoryId: value === 'all' ? '' : value })}
                                >
                                    <SelectTrigger className="h-9 rounded-lg">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {allCategories?.map((category: any) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Currency Filter */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <DollarSign className="h-3 w-3" />
                                    Moneda
                                </Label>
                                <Select
                                    value={filters.currency || 'all'}
                                    onValueChange={(value) => setFilters({ ...filters, currency: value === 'all' ? '' : value })}
                                >
                                    <SelectTrigger className="h-9 rounded-lg">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        {currencies.map((currency: string) => (
                                            <SelectItem key={currency} value={currency}>
                                                {currency}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Amount Range */}
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <DollarSign className="h-3 w-3" />
                                    Rango de Monto
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.minAmount || ''}
                                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                        className="h-8 rounded-lg text-xs"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.maxAmount || ''}
                                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                        className="h-8 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Active Filters Row (Mini Pills) */}
            {activeFiltersCount > 0 && (
                <div className="flex items-center flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Activos:</span>
                    {filters.accountId && (
                        <Badge variant="secondary" className="pl-1 bg-primary/5 text-primary border-primary/20 rounded-lg text-[10px] font-medium h-6 flex items-center gap-1">
                            <Wallet className="h-2.5 w-2.5" />
                            {accounts?.find((a: any) => a.id === filters.accountId)?.name}
                            <button onClick={() => setFilters({ ...filters, accountId: '' })} className="hover:text-foreground">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    )}
                    {filters.categoryId && (
                        <Badge variant="secondary" className="pl-1 bg-primary/5 text-primary border-primary/20 rounded-lg text-[10px] font-medium h-6 flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {allCategories?.find((c: any) => c.id === filters.categoryId)?.name}
                            <button onClick={() => setFilters({ ...filters, categoryId: '' })} className="hover:text-foreground">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    )}
                    {filters.currency && (
                        <Badge variant="secondary" className="pl-1 bg-primary/5 text-primary border-primary/20 rounded-lg text-[10px] font-medium h-6 flex items-center gap-1">
                            <DollarSign className="h-2.5 w-2.5" />
                            {filters.currency}
                            <button onClick={() => setFilters({ ...filters, currency: '' })} className="hover:text-foreground">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    )}
                    {(filters.minAmount || filters.maxAmount) && (
                        <Badge variant="secondary" className="pl-1 bg-primary/5 text-primary border-primary/20 rounded-lg text-[10px] font-medium h-6 flex items-center gap-1">
                            <DollarSign className="h-2.5 w-2.5" />
                            {filters.minAmount || '0'} - {filters.maxAmount || '∞'}
                            <button onClick={() => setFilters({ ...filters, minAmount: '', maxAmount: '' })} className="hover:text-foreground">
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </Badge>
                    )}
                    <button
                        onClick={() => {
                            clearFilters()
                            router.push('/dashboard/transactions')
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-rose-500 transition-colors ml-1"
                    >
                        Limpiar todo
                    </button>
                </div>
            )}
        </div>
    )
}
