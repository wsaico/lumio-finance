"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    X,
    SlidersHorizontal,
    TrendingUp,
    TrendingDown,
    ArrowLeftRight,
    Search,
    DollarSign,
    Wallet,
    Tag,
    Repeat,
    Check
} from "lucide-react"
import { useAccounts } from "@/hooks/useAccounts"
import { useCategories } from "@/hooks/useCategories"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface TransactionFiltersProps {
    filters: {
        search: string
        accountId: string
        categoryId: string
        type: string
        currency: string
        minAmount: string
        maxAmount: string
        mode: string
    }
    onFiltersChange: (filters: any) => void
}

export function TransactionFiltersImproved({ filters, onFiltersChange }: TransactionFiltersProps) {
    const { accounts } = useAccounts()
    const { categories: allCategories } = useCategories()
    const [isOpen, setIsOpen] = useState(false)
    const [tempFilters, setTempFilters] = useState(filters)

    // Get unique currencies from accounts
    const currencies = Array.from(new Set(accounts?.map((a: any) => a.currencyCode) || []))

    const activeFiltersCount = [
        filters.accountId,
        filters.categoryId,
        filters.currency,
        filters.minAmount,
        filters.maxAmount,
        filters.mode
    ].filter(Boolean).length

    const clearFilters = () => {
        const cleared = {
            search: '',
            accountId: '',
            categoryId: '',
            type: '',
            currency: '',
            minAmount: '',
            maxAmount: '',
            mode: ''
        }
        setTempFilters(cleared)
        onFiltersChange(cleared)
    }

    const applyFilters = () => {
        onFiltersChange(tempFilters)
        setIsOpen(false)
    }

    const removeFilter = (key: string) => {
        onFiltersChange({ ...filters, [key]: '' })
    }

    // Active filter chips
    const activeFilterChips = []
    if (filters.accountId) {
        const account = accounts?.find((a: any) => a.id === filters.accountId)
        if (account) activeFilterChips.push({ key: 'accountId', label: account.name, icon: Wallet })
    }
    if (filters.categoryId) {
        const category = allCategories.find((c: any) => c.id === filters.categoryId)
        if (category) activeFilterChips.push({ key: 'categoryId', label: category.name, icon: Tag })
    }
    if (filters.currency) {
        activeFilterChips.push({ key: 'currency', label: filters.currency, icon: DollarSign })
    }
    if (filters.minAmount || filters.maxAmount) {
        const label = filters.minAmount && filters.maxAmount
            ? `${filters.minAmount} - ${filters.maxAmount}`
            : filters.minAmount
                ? `≥ ${filters.minAmount}`
                : `≤ ${filters.maxAmount}`
        activeFilterChips.push({ key: 'amount', label, icon: DollarSign })
    }
    if (filters.mode) {
        const modeLabels: Record<string, string> = {
            'RECURRING': 'Recurrente',
            'SCHEDULED': 'Programado',
            'LOAN_LENT': 'Prestado',
            'LOAN_BORROWED': 'Deuda'
        }
        activeFilterChips.push({ key: 'mode', label: modeLabels[filters.mode] || filters.mode, icon: Repeat })
    }

    return (
        <div className="space-y-3">
            {/* Search + Filters Button */}
            <div className="flex gap-2">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar transacción..."
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                        className="pl-9 h-10"
                    />
                </div>

                {/* Filters Sheet */}
                <Sheet open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open)
                    if (open) setTempFilters(filters)
                }}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="relative h-10 shrink-0">
                            <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Filtros</span>
                            {activeFiltersCount > 0 && (
                                <Badge
                                    variant="default"
                                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary"
                                >
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
                        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <SheetTitle className="text-xl">Filtros Avanzados</SheetTitle>
                                    <SheetDescription className="text-sm mt-1">
                                        Personaliza tu búsqueda de transacciones
                                    </SheetDescription>
                                </div>
                                {activeFiltersCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                        {activeFiltersCount} activos
                                    </Badge>
                                )}
                            </div>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                {/* COLUMNA 1: FILTROS BÁSICOS */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Filtros Básicos
                                    </div>

                                    {/* Account */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                <Wallet className={cn(
                                                    "h-4 w-4",
                                                    tempFilters.accountId ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                Cuenta
                                            </span>
                                            {tempFilters.accountId && (
                                                <Badge variant="secondary" className="h-5 text-[10px]">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </Label>
                                        <Select
                                            value={tempFilters.accountId || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, accountId: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Todas las cuentas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las cuentas</SelectItem>
                                                {accounts?.map((account: any) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                <Tag className={cn(
                                                    "h-4 w-4",
                                                    tempFilters.categoryId ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                Categoría
                                            </span>
                                            {tempFilters.categoryId && (
                                                <Badge variant="secondary" className="h-5 text-[10px]">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </Label>
                                        <Select
                                            value={tempFilters.categoryId || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, categoryId: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Todas las categorías" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las categorías</SelectItem>
                                                {allCategories?.map((category: any) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* COLUMNA 2: FILTROS AVANZADOS */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Filtros Avanzados
                                    </div>

                                    {/* Currency */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                <DollarSign className={cn(
                                                    "h-4 w-4",
                                                    tempFilters.currency ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                Moneda
                                            </span>
                                            {tempFilters.currency && (
                                                <Badge variant="secondary" className="h-5 text-[10px]">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </Label>
                                        <Select
                                            value={tempFilters.currency || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, currency: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Todas las monedas" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todas las monedas</SelectItem>
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
                                        <Label className="flex items-center justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                <DollarSign className={cn(
                                                    "h-4 w-4",
                                                    (tempFilters.minAmount || tempFilters.maxAmount) ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                Rango de Monto
                                            </span>
                                            {(tempFilters.minAmount || tempFilters.maxAmount) && (
                                                <Badge variant="secondary" className="h-5 text-[10px]">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="number"
                                                placeholder="Mínimo"
                                                value={tempFilters.minAmount}
                                                onChange={(e) => setTempFilters({ ...tempFilters, minAmount: e.target.value })}
                                                className="h-10"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Máximo"
                                                value={tempFilters.maxAmount}
                                                onChange={(e) => setTempFilters({ ...tempFilters, maxAmount: e.target.value })}
                                                className="h-10"
                                            />
                                        </div>
                                    </div>

                                    {/* Mode */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center justify-between text-sm font-medium">
                                            <span className="flex items-center gap-2">
                                                <Repeat className={cn(
                                                    "h-4 w-4",
                                                    tempFilters.mode ? "text-primary" : "text-muted-foreground"
                                                )} />
                                                Modo
                                            </span>
                                            {tempFilters.mode && (
                                                <Badge variant="secondary" className="h-5 text-[10px]">
                                                    <Check className="h-3 w-3" />
                                                </Badge>
                                            )}
                                        </Label>
                                        <Select
                                            value={tempFilters.mode || 'all'}
                                            onValueChange={(value) => setTempFilters({ ...tempFilters, mode: value === 'all' ? '' : value })}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Todos los modos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los modos</SelectItem>
                                                <SelectItem value="RECURRING">Recurrente</SelectItem>
                                                <SelectItem value="SCHEDULED">Programado</SelectItem>
                                                <SelectItem value="LOAN_LENT">Prestado</SelectItem>
                                                <SelectItem value="LOAN_BORROWED">Deuda</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with Actions */}
                        <div className="border-t px-6 py-4 bg-muted/20">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="flex-1 h-10"
                                    disabled={activeFiltersCount === 0}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Limpiar
                                </Button>
                                <Button
                                    onClick={applyFilters}
                                    className="flex-1 h-10"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Type Tabs */}
            <Tabs
                value={filters.type || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, type: value === 'all' ? '' : value })}
                className="w-full"
            >
                <TabsList className="grid w-full grid-cols-4 h-10">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                        Todos
                    </TabsTrigger>
                    <TabsTrigger value="INCOME" className="text-xs sm:text-sm">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Ingresos</span>
                    </TabsTrigger>
                    <TabsTrigger value="EXPENSE" className="text-xs sm:text-sm">
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Gastos</span>
                    </TabsTrigger>
                    <TabsTrigger value="TRANSFER" className="text-xs sm:text-sm">
                        <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Transfer</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Active Filter Chips */}
            {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilterChips.map((chip) => {
                        const Icon = chip.icon
                        return (
                            <Badge
                                key={chip.key}
                                variant="secondary"
                                className="pl-2 pr-2 py-1.5 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
                                onClick={() => {
                                    if (chip.key === 'amount') {
                                        onFiltersChange({ ...filters, minAmount: '', maxAmount: '' })
                                    } else {
                                        removeFilter(chip.key)
                                    }
                                }}
                            >
                                <Icon className="h-3 w-3" />
                                <span className="text-xs">{chip.label}</span>
                                <X className="h-3 w-3 ml-0.5" />
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
