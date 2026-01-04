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
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CategoryIcon } from "@/components/icons/category-icon"

interface Category {
    name: string
    icon?: string
    color?: string
}

interface Account {
    name: string
    icon?: string
    color?: string
    currencyCode?: string
}

interface Transaction {
    id: string
    transactionDate: string
    transactionType: 'INCOME' | 'EXPENSE'
    amount: number
    description: string
    category?: string // Legacy or flattened
    paymentMethod?: string
    expenseCategory?: Category
    incomeCategory?: Category
    account?: Account
}

interface AccountTransactionsListProps {
    transactions: Transaction[]
    currencyCode: string
    onLoadMore?: () => void
    hasMore?: boolean
    isLoadingMore?: boolean
}

export function AccountTransactionsList({
    transactions,
    currencyCode,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    headerContent
}: AccountTransactionsListProps & { headerContent?: React.ReactNode }) {

    // Group transactions by date
    const groupedTransactions = useMemo(() => {
        // Ensure transactions is an array
        const list = Array.isArray(transactions) ? transactions : []
        const groups: { [key: string]: Transaction[] } = {}

        list.forEach(transaction => {
            const date = new Date(transaction.transactionDate)
            // ... (rest is same)

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
    }, [transactions])

    // Calculate summary stats
    const stats = useMemo(() => {
        const list = Array.isArray(transactions) ? transactions : []
        const totalIncome = list
            .filter(t => t.transactionType === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        const totalExpenses = list
            .filter(t => t.transactionType === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        return {
            totalIncome,
            totalExpenses,
            count: list.length
        }
    }, [transactions])

    // Infinite Scroll Observer
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoadingMore) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore()
                }
            },
            { threshold: 0.1 }
        )

        const sentinel = document.getElementById("scroll-sentinel")
        if (sentinel) observer.observe(sentinel)

        return () => {
            if (sentinel) observer.unobserve(sentinel)
        }
    }, [onLoadMore, hasMore, isLoadingMore, transactions.length])

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
                {/* Header Content (Smart Search) */}
                {headerContent && (
                    <div className="mb-6">
                        {headerContent}
                    </div>
                )}

                {/* Summary Stats */}
                {stats.count > 0 && (
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
                {stats.count === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron transacciones</p>
                        <p className="text-sm">Intenta ajustar la búsqueda</p>
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
                                    {dayTransactions.map((transaction) => {
                                        const category = transaction.transactionType === 'EXPENSE'
                                            ? transaction.expenseCategory
                                            : transaction.incomeCategory

                                        const categoryName = category?.name || transaction.category || 'Sin categoría'
                                        const categoryColor = category?.color || 'gray'

                                        return (
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
                                                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                                                    transaction.transactionType === 'INCOME'
                                                        ? "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                                                        : "bg-red-100 text-red-600 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                                                )} style={{ borderColor: category?.color }}>
                                                    {category?.icon ? (
                                                        <CategoryIcon name={category.icon} className="w-5 h-5" />
                                                    ) : (
                                                        transaction.transactionType === 'INCOME' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="font-semibold text-base truncate">
                                                                {transaction.description}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                {/* Category Badge */}
                                                                <Badge variant="outline" className="text-xs font-normal" style={{
                                                                    backgroundColor: category?.color ? `${category.color}10` : undefined,
                                                                    color: category?.color,
                                                                    borderColor: category?.color ? `${category.color}40` : undefined
                                                                }}>
                                                                    {categoryName}
                                                                </Badge>

                                                                {/* Account Name (if visible) */}
                                                                {transaction.account && (
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <span className="text-[10px]">•</span>
                                                                        {transaction.account.name}
                                                                    </span>
                                                                )}

                                                                {/* Payment Method */}
                                                                {transaction.paymentMethod && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {transaction.paymentMethod}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Amount & Time */}
                                                        <div className="flex-shrink-0 text-right">
                                                            <p className={cn(
                                                                "font-bold text-base",
                                                                transaction.transactionType === 'INCOME'
                                                                    ? "text-emerald-600"
                                                                    : "text-red-600"
                                                            )}>
                                                                {transaction.transactionType === 'INCOME' ? '+' : '-'}
                                                                {currencyCode} {Number(transaction.amount).toFixed(2)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {new Date(transaction.transactionDate).toLocaleTimeString('es-ES', {
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
                                                    transaction.transactionType === 'INCOME'
                                                        ? "bg-emerald-500"
                                                        : "bg-red-500"
                                                )} />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Sentinel & Loader */}
                <div id="scroll-sentinel" className="h-4 flex items-center justify-center w-full py-4">
                    {isLoadingMore && (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
