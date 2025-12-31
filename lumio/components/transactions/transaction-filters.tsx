"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X, Search, Filter } from "lucide-react"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface TransactionFiltersProps {
    filters: {
        search: string
        accountId: string
        categoryId: string
        type: string
    }
    onFiltersChange: (filters: any) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
    const { accounts } = useAccounts()
    const { categories: allCategories } = useCategories()

    const activeFiltersCount = [
        filters.accountId,
        filters.categoryId,
        filters.type
    ].filter(Boolean).length

    const clearFilters = () => {
        onFiltersChange({
            search: '',
            accountId: '',
            categoryId: '',
            type: ''
        })
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por descripción..."
                    value={filters.search}
                    onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                    className="pl-9"
                />
            </div>

            {/* Filters Popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                        {activeFiltersCount > 0 && (
                            <Badge
                                variant="destructive"
                                className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                            >
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Filtros</h4>
                            {activeFiltersCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-xs"
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Limpiar
                                </Button>
                            )}
                        </div>

                        {/* Account Filter */}
                        <div className="space-y-2">
                            <Label>Cuenta</Label>
                            <Select
                                value={filters.accountId || 'all'}
                                onValueChange={(value) => onFiltersChange({ ...filters, accountId: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
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

                        {/* Category Filter */}
                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select
                                value={filters.categoryId || 'all'}
                                onValueChange={(value) => onFiltersChange({ ...filters, categoryId: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
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

                        {/* Type Filter */}
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                                value={filters.type || 'all'}
                                onValueChange={(value) => onFiltersChange({ ...filters, type: value === 'all' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="INCOME">Ingresos</SelectItem>
                                    <SelectItem value="EXPENSE">Gastos</SelectItem>
                                    <SelectItem value="TRANSFER">Transferencias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
