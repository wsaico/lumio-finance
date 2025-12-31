"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTransactions } from "@/hooks/use-transactions"
import { useTransactionFilters } from "@/hooks/use-transaction-filters"
import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Repeat, HandCoins, CalendarClock, Calendar, Clock, Calculator, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAccounts } from "@/hooks/use-accounts"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { cn } from "@/lib/utils"
import { MonthSelector } from "./month-selector"
import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/icons/category-icon"

function useInView() {
    const [inView, setInView] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setInView(entry.isIntersecting)
            },
            { threshold: 0.1 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current)
            }
        }
    }, [])

    return { ref, inView }
}

export function TransactionList({ limit, overrideFilters, hideMonthSelector }: { limit?: number, overrideFilters?: any, hideMonthSelector?: boolean }) {
    const router = useRouter()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const { filters: globalFilters } = useTransactionFilters()

    // Merge global filters with overrides
    const filters = useMemo(() => ({
        ...globalFilters,
        ...(overrideFilters || {})
    }), [globalFilters, overrideFilters])

    // Filters for Hook
    const hookFilters = useMemo(() => {
        if (filters.startDate && filters.endDate) {
            return {
                startDate: filters.startDate,
                endDate: filters.endDate
            }
        }
        return {
            month: currentMonth.getMonth() + 1,
            year: currentMonth.getFullYear()
        }
    }, [currentMonth, filters.startDate, filters.endDate])

    const {
        transactions,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useTransactions(hookFilters)
    const { accounts } = useAccounts()
    const { showAccountLabel } = useSettingsStore()

    // Infinite Scroll Intersection Observer
    const { ref, inView } = useInView()

    useEffect(() => {
        if (inView && hasNextPage) {
            console.log("Loading more transactions...")
            fetchNextPage()
        }
    }, [inView, hasNextPage, fetchNextPage])

    // Filter out loan transactions that should be hidden
    const filteredTransactions = useMemo(() => {
        if (!transactions) return []
        let txs = transactions.filter((tx: any) => {
            // Hide transactions marked as loan movements
            if (tx.metadata?.hideFromList) return false
            if (tx.metadata?.isLoanMovement) return false

            // Apply search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase()
                const description = (tx.description || '').toLowerCase()
                const categoryName = (tx.expenseCategory?.name || tx.incomeCategory?.name || '').toLowerCase()
                if (!description.includes(searchLower) && !categoryName.includes(searchLower)) {
                    return false
                }
            }

            // Apply account filter
            if (filters.accountId && tx.accountId !== filters.accountId) {
                return false
            }

            // Apply category filter
            if (filters.categoryId) {
                const txCategoryId = tx.expenseCategoryId || tx.incomeCategoryId
                if (txCategoryId !== filters.categoryId) {
                    return false
                }
            }

            // Apply type filter
            if (filters.type && tx.transactionType !== filters.type) {
                return false
            }

            // Apply currency filter
            if (filters.currency) {
                const txCurrency = tx.metadata?.originalCurrency || tx.currencyCode || tx.account?.currencyCode
                if (txCurrency !== filters.currency) {
                    return false
                }
            }

            // Apply amount range filter
            const amount = Number(tx.amount)
            if (filters.minAmount && amount < Number(filters.minAmount)) {
                return false
            }
            if (filters.maxAmount && amount > Number(filters.maxAmount)) {
                return false
            }

            // Apply mode filter
            if (filters.mode && tx.metadata?.mode !== filters.mode) {
                return false
            }

            // Apply strict date filter if provided in overrides
            if (filters.startDate && filters.endDate) {
                const txDate = new Date(tx.transactionDate)
                const start = new Date(filters.startDate)
                const end = new Date(filters.endDate)
                if (txDate < start || txDate > end) {
                    return false
                }
            }

            return true
        })

        // Apply limit if provided (Latest N transactions)
        if (limit && limit > 0) {
            txs = txs.slice(0, limit)
        }

        return txs
    }, [transactions, limit, filters])

    // Helper to get account name or details safely
    const getAccountDetails = (tx: any) => {
        if (tx.account) return tx.account
        if (accounts && tx.accountId) {
            return accounts.find((a: any) => a.id === tx.accountId)
        }
        return null
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
    }

    // Grouping Logic: By Day
    const groupedTransactions = () => {
        if (!filteredTransactions) return {}
        const groups: Record<string, any[]> = {}
        filteredTransactions.forEach((tx: any) => {
            const key = format(new Date(tx.transactionDate), "yyyy-MM-dd")
            if (!groups[key]) groups[key] = []
            groups[key].push(tx)
        })
        return groups
    }

    const groups = groupedTransactions()
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)) // Newest first

    return (
        <div className="space-y-4">
            {!limit && !hideMonthSelector && (
                <MonthSelector
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                />
            )}

            {!filteredTransactions?.length && (
                <div className="text-center p-12 text-muted-foreground">
                    <p>No hay transacciones{filters.search || filters.accountId || filters.categoryId || filters.type || filters.currency || filters.minAmount || filters.maxAmount || filters.mode ? ' que coincidan con los filtros.' : '.'}</p>
                </div>
            )}

            <div className="space-y-6 px-1 pt-4">
                {sortedKeys.map((key) => {
                    const group = groups[key]
                    // Daily Totals logic...
                    let dailyIncome = 0
                    let dailyExpense = 0
                    group.forEach((tx: any) => {
                        const amount = Number(tx.amount)
                        if (tx.transactionType === 'INCOME') dailyIncome += amount
                        if (tx.transactionType === 'EXPENSE') dailyExpense += amount
                    })
                    const dailyNet = dailyIncome - dailyExpense

                    // Header Label
                    let headerLabel = format(new Date(group[0].transactionDate), "EEEE, d 'de' MMMM", { locale: es })
                    if (isToday(new Date(group[0].transactionDate))) headerLabel = "Hoy"
                    else if (isYesterday(new Date(group[0].transactionDate))) headerLabel = "Ayer"

                    return (
                        <div key={key} className="space-y-2">
                            {/* Hide date header if limited? Maybe keep it for context. User asked for "Latest Movements". */}
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 backdrop-blur-sm rounded-lg sticky top-[80px] z-10 border border-transparent shadow-sm">
                                <h3 className="text-sm font-semibold capitalize text-foreground">{headerLabel}</h3>
                                <div className="flex gap-4 text-xs font-medium">
                                    {dailyIncome > 0 && <span className="text-emerald-500">▲ {dailyIncome.toFixed(2)}</span>}
                                    {dailyExpense > 0 && <span className="text-rose-500">▼ {dailyExpense.toFixed(2)}</span>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {group.map((tx: any) => {
                                    const account = getAccountDetails(tx)
                                    const metadata = tx.metadata as any
                                    const originalAmount = metadata?.originalAmount || tx.amount
                                    const currency = metadata?.originalCurrency || tx.currencyCode || account?.currencyCode || 'USD'
                                    const currencyMap: Record<string, string> = { 'USD': '$', 'EUR': '€', 'PEN': 'S/', 'MXN': 'MX$' }
                                    const symbol = currencyMap[currency] || currency

                                    const isExpense = tx.transactionType === 'EXPENSE'
                                    const isIncome = tx.transactionType === 'INCOME'
                                    const isTransfer = tx.transactionType === 'TRANSFER'
                                    const category = isExpense ? tx.expenseCategory : isIncome ? tx.incomeCategory : null
                                    const categoryIcon = category?.icon
                                    const mode = metadata?.mode
                                    const showModeBadge = mode && ['RECURRING', 'SCHEDULED', 'SUBSCRIPTION', 'LOAN_LENT', 'LOAN_BORROWED'].includes(mode)
                                    const isAuto = metadata?.isAutoExecute
                                    const isFuture = new Date(tx.transactionDate) > new Date()
                                    const contactName = tx.loan?.personName || metadata?.contactName

                                    return (
                                        <div
                                            key={tx.id}
                                            className="group relative flex items-center justify-between p-3 rounded-xl bg-card border hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer"
                                            onClick={() => router.push(`/dashboard/transactions/${tx.id}`)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border shrink-0",
                                                    isIncome ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        isExpense ? "bg-rose-50 text-rose-600 border-rose-200" :
                                                            "bg-blue-50 text-blue-600 border-blue-200"
                                                )}>
                                                    {categoryIcon ? (
                                                        <CategoryIcon name={categoryIcon} className="h-5 w-5" />
                                                    ) : (
                                                        isTransfer ? <ArrowRightLeft className="h-5 w-5" /> :
                                                            isIncome ? <ArrowDownLeft className="h-5 w-5" /> :
                                                                <ArrowUpRight className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-sm truncate">
                                                            {tx.description || category?.name || "Sin descripción"}
                                                        </span>
                                                        {/* Account Badge */}
                                                        {account && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[9px] px-1.5 py-0.5 h-5 shrink-0 font-medium border"
                                                                style={{
                                                                    backgroundColor: `${account.color}15`,
                                                                    borderColor: `${account.color}40`,
                                                                    color: account.color
                                                                }}
                                                            >
                                                                {account.name}
                                                            </Badge>
                                                        )}
                                                        {/* Balance Adjustment Badge */}
                                                        {metadata?.isBalanceAdjustment && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[9px] px-1.5 py-0.5 h-5 shrink-0 font-medium bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                                                            >
                                                                <Calculator className="h-2.5 w-2.5 mr-0.5" />
                                                                Ajuste Contable
                                                            </Badge>
                                                        )}
                                                        {showModeBadge && (
                                                            <Badge variant="outline" className={cn(
                                                                "text-[9px] px-1.5 py-0 h-4 shrink-0 flex items-center gap-1",
                                                                isFuture ? "border-amber-500/50 bg-amber-500/5 text-amber-600" : ""
                                                            )}>
                                                                {mode === 'RECURRING' && <><Repeat className="h-2.5 w-2.5" />Repetitivo</>}
                                                                {mode === 'SUBSCRIPTION' && <><Repeat className="h-2.5 w-2.5" />Suscripción</>}
                                                                {mode === 'SCHEDULED' && <><CalendarClock className="h-2.5 w-2.5" />Programado</>}
                                                                {mode === 'LOAN_LENT' && <><HandCoins className="h-2.5 w-2.5" />Prestado</>}
                                                                {mode === 'LOAN_BORROWED' && <><HandCoins className="h-2.5 w-2.5" />Deuda</>}
                                                                {isAuto && <Zap className="h-2.5 w-2.5 fill-current ml-0.5" />}
                                                                {isFuture && <span className="ml-1 opacity-70">• Próximo</span>}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{format(new Date(tx.transactionDate), "dd/MM")} • {format(new Date(tx.transactionDate), "HH:mm")}</span>
                                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                                        <span className="capitalize truncate">
                                                            {isIncome ? "Ingreso" : isExpense ? "Gasto" : "Transferencia"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                <span className={cn(
                                                    "text-base font-bold tracking-tight tabular-nums",
                                                    isIncome ? "text-emerald-600" : isExpense ? "text-rose-600" : "text-blue-600"
                                                )}>
                                                    {isExpense ? '-' : '+'}{symbol} {Number(originalAmount).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Infinite Scroll Sentinel */}
            {!limit && (
                <div ref={ref} className="flex justify-center p-4">
                    {isFetchingNextPage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : hasNextPage ? (
                        <span className="text-xs text-muted-foreground">Cargando más...</span>
                    ) : transactions?.length > 0 ? (
                        <span className="text-xs text-muted-foreground">No hay más transacciones</span>
                    ) : null}
                </div>
            )}

        </div>
    )
}
