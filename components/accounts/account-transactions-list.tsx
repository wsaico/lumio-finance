"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Calendar,
    Search,
    Filter,
    TrendingUp,
    TrendingDown,
    FileText
} from "lucide-react"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Transaction {
    id: string
    transaction_date: string
    transaction_type: 'INCOME' | 'EXPENSE'
    amount: number
    description: string
    category?: string
    payment_method?: string
}

interface AccountTransactionsListProps {
    transactions: Transaction[]
    currencyCode: string
}

export function AccountTransactionsList({ transactions, currencyCode }: AccountTransactionsListProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("all")

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions]

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Apply type filter
        if (typeFilter !== "all") {
            filtered = filtered.filter(t => t.transaction_type === typeFilter)
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

        return filtered
    }, [transactions, searchQuery, typeFilter])

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: Transaction[] } = {}

        filteredTransactions.forEach(transaction => {
            const date = new Date(transaction.transaction_date)
            const dateKey = date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })

            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(transaction)
        })

        return groups
    }, [filteredTransactions])

    // Calculate summary stats
    const stats = useMemo(() => {
        const totalIncome = filteredTransactions
            .filter(t => t.transaction_type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        const totalExpenses = filteredTransactions
            .filter(t => t.transaction_type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        return {
            totalIncome,
            totalExpenses,
            count: filteredTransactions.length
        }
    }, [filteredTransactions])

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Historial de Transacciones
                </CardTitle>
                <CardDescription>
                    {stats.count} transacciones encontradas
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por descripción o categoría..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Type Filter */}
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filtrar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="INCOME">Ingresos</SelectItem>
                            <SelectItem value="EXPENSE">Gastos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Summary Stats */}
                {filteredTransactions.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium mb-1">
                                Total Ingresos
                            </span>
                            <div className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span className="text-lg font-bold text-emerald-600">
                                    {currencyCode} {stats.totalIncome.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium mb-1">
                                Total Gastos
                            </span>
                            <div className="flex items-center gap-1">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-lg font-bold text-red-600">
                                    {currencyCode} {stats.totalExpenses.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground font-medium mb-1">
                                Balance Neto
                            </span>
                            <span className={cn(
                                "text-lg font-bold",
                                stats.totalIncome - stats.totalExpenses >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {currencyCode} {(stats.totalIncome - stats.totalExpenses).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron transacciones</p>
                        <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
                            <div key={date} className="space-y-3">
                                {/* Date Header */}
                                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        {date}
                                    </h3>
                                    <div className="flex-1 h-px bg-border ml-2" />
                                </div>

                                {/* Transactions for this date */}
                                <div className="space-y-2">
                                    {dayTransactions.map((transaction) => (
                                        <div
                                            key={transaction.id}
                                            className={cn(
                                                "group relative flex items-center gap-4 p-4 rounded-lg border transition-all",
                                                "hover:shadow-md hover:border-primary/50 hover:bg-accent/50",
                                                "bg-card"
                                            )}
                                        >
                                            {/* Icon */}
                                            <div className={cn(
                                                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                                transaction.transaction_type === 'INCOME'
                                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30"
                                                    : "bg-red-100 text-red-600 dark:bg-red-950/30"
                                            )}>
                                                {transaction.transaction_type === 'INCOME' ? (
                                                    <ArrowUpCircle className="h-5 w-5" />
                                                ) : (
                                                    <ArrowDownCircle className="h-5 w-5" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium truncate text-sm">
                                                            {transaction.description}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {transaction.category && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {transaction.category}
                                                                </Badge>
                                                            )}
                                                            {transaction.payment_method && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {transaction.payment_method}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className="flex-shrink-0 text-right">
                                                        <p className={cn(
                                                            "font-bold text-base",
                                                            transaction.transaction_type === 'INCOME'
                                                                ? "text-emerald-600"
                                                                : "text-red-600"
                                                        )}>
                                                            {transaction.transaction_type === 'INCOME' ? '+' : '-'}
                                                            {currencyCode} {Number(transaction.amount).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(transaction.transaction_date).toLocaleTimeString('es-ES', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Effect Border */}
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-opacity opacity-0 group-hover:opacity-100",
                                                transaction.transaction_type === 'INCOME'
                                                    ? "bg-emerald-500"
                                                    : "bg-red-500"
                                            )} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
