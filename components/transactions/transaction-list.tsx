"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useTransactionFilters } from "@/hooks/useTransactionFilters"
import { format, isToday, isYesterday, isTomorrow, isAfter, endOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { getDateKeyInTimezone } from "@/lib/timezone"
import { Loader2, Repeat, HandCoins, CalendarClock, Calendar, Clock, Calculator, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Zap } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAccounts } from "@/hooks/useAccounts"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"
import { MonthSelector } from "./month-selector"
import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/icons/category-icon"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { DEFAULT_CURRENCY, getCurrencySymbol } from "@/lib/currencies"

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
    const searchParams = useSearchParams()

    // Initialize with URL params if present, otherwise current date
    const [currentMonth, setCurrentMonth] = useState(() => {
        const urlMonth = searchParams.get('month')
        const urlYear = searchParams.get('year')
        if (urlMonth && urlYear) {
            return new Date(parseInt(urlYear), parseInt(urlMonth), 1)
        }
        return new Date()
    })

    const { filters: globalFilters } = useTransactionFilters()

    // Sync state if URL changes while mounted
    useEffect(() => {
        const urlMonth = searchParams.get('month')
        const urlYear = searchParams.get('year')
        if (urlMonth && urlYear) {
            const newDate = new Date(parseInt(urlYear), parseInt(urlMonth), 1)
            if (newDate.getMonth() !== currentMonth.getMonth() || newDate.getFullYear() !== currentMonth.getFullYear()) {
                setCurrentMonth(newDate)
            }
        }
    }, [searchParams])

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
    const {
        currencyCode: userCurrency,
        isBalanceVisible,
        txListDensity,
        txAmountTotalStyle,
        timezone,
    } = useSettingsStore()
    const { convert } = useExchangeRates()

    // Infinite Scroll Intersection Observer
    const { ref, inView } = useInView()

    useEffect(() => {
        if (inView && hasNextPage) {
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

            // Apply category filter (supports single categoryId, categories array, 'uncategorized', and 'debt-repayment')
            const targetCats: string[] = Array.isArray(filters.categories) && filters.categories.length > 0
                ? filters.categories
                : filters.categoryId
                  ? [filters.categoryId]
                  : []
            if (targetCats.length > 0) {
                const txCategoryId = tx.expenseCategoryId || tx.incomeCategoryId || "uncategorized"
                const isDebtTx = Boolean(tx.loanId || tx.loan_id || tx.metadata?.isLoanMovement)
                const matchesCat =
                    targetCats.includes(txCategoryId) ||
                    (targetCats.includes("debt-repayment") && isDebtTx)
                if (!matchesCat) {
                    return false
                }
            }

            // Apply type filter
            if (filters.type && tx.transactionType?.toUpperCase() !== filters.type?.toUpperCase()) {
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

            // Apply tag filter
            if (filters.tag) {
                const txTags: string[] = Array.isArray(tx.tags) ? tx.tags : []
                if (!txTags.includes(filters.tag)) {
                    return false
                }
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
            const key = getDateKeyInTimezone(tx.transactionDate, timezone) || format(new Date(tx.transactionDate), "yyyy-MM-dd")
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

            <div className="space-y-4 pt-1">
                {sortedKeys.map((key) => {
                    const group = groups[key]
                    let dailyIncome = 0
                    let dailyExpense = 0
                    group.forEach((tx: any) => {
                        const amount = Number(tx.amount)
                        if (tx.transactionType === 'INCOME') dailyIncome += amount
                        if (tx.transactionType === 'EXPENSE') dailyExpense += amount
                    })

                    // Header Label
                    const groupDate = new Date(group[0].transactionDate)
                    const isFutureGroup = isAfter(groupDate, endOfDay(new Date()))
                    let headerLabel = format(groupDate, "EEEE, d 'de' MMMM", { locale: es })
                    if (isToday(groupDate)) headerLabel = "Hoy"
                    else if (isYesterday(groupDate)) headerLabel = "Ayer"
                    else if (isTomorrow(groupDate)) headerLabel = `Mañana · ${format(groupDate, "d 'de' MMMM", { locale: es })}`

                    return (
                        <div key={key} className="space-y-1.5">
                            {/* Clean Native-App Day Header */}
                            <div className="flex items-center justify-between px-1.5 pt-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground capitalize">
                                        {headerLabel}
                                    </h3>
                                    {isFutureGroup && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            Próximo
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5 text-[11px] font-bold tabular-nums">
                                    {dailyIncome > 0 && (
                                        <span className={txAmountTotalStyle === "neutral" ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"}>
                                            +{isBalanceVisible ? dailyIncome.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '•••'}
                                        </span>
                                    )}
                                    {dailyExpense > 0 && (
                                        <span className={txAmountTotalStyle === "neutral" ? "text-muted-foreground" : "text-rose-500"}>
                                            -{isBalanceVisible ? dailyExpense.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '•••'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Unified Day Sheet (Revolut / Copilot Style) */}
                            <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/40 overflow-hidden shadow-xs">
                                {group.map((tx: any) => {
                                    const account = getAccountDetails(tx)
                                    const metadata = tx.metadata as any
                                    const originalAmount = Number(metadata?.originalAmount || tx.amount)
                                    const currency = metadata?.originalCurrency || tx.currencyCode || account?.currencyCode || userCurrency || DEFAULT_CURRENCY

                                    // Currency Conversion Logic
                                    const showConversion = currency !== userCurrency
                                    const convertedAmount = showConversion ? convert(originalAmount, currency, userCurrency) : originalAmount

                                    const symbol = getCurrencySymbol(currency)
                                    const userSymbol = getCurrencySymbol(userCurrency)

                                    const isExpense = tx.transactionType === 'EXPENSE'
                                    const isIncome = tx.transactionType === 'INCOME'
                                    const isTransfer = tx.transactionType === 'TRANSFER'
                                    const category = isTransfer ? null : (isExpense ? tx.expenseCategory : isIncome ? tx.incomeCategory : null)
                                    const categoryIcon = category?.icon
                                    const categoryColor = category?.color
                                    const mode = metadata?.mode
                                    const showModeBadge = mode && ['RECURRING', 'SCHEDULED', 'UPCOMING', 'SUBSCRIPTION', 'LOAN_LENT', 'LOAN_BORROWED'].includes(mode)
                                    const isAuto = metadata?.isAutoExecute
                                    const isFuture = new Date(tx.transactionDate) > new Date()

                                    const title = tx.description?.trim() || (isTransfer ? "Transferencia" : category?.name || "Movimiento")
                                    const timeLabel = format(new Date(tx.transactionDate), "HH:mm")

                                    return (
                                        <div
                                            key={tx.id}
                                            className={cn(
                                                "group flex items-center justify-between gap-3 hover:bg-muted/35 active:bg-muted/50 transition-colors cursor-pointer",
                                                txListDensity === "compact"
                                                    ? "px-3 py-1.5 sm:px-3.5 sm:py-2"
                                                    : "px-3 py-2.5 sm:px-4 sm:py-3"
                                            )}
                                            onClick={() => router.push(`/dashboard/transactions/${tx.id}`)}
                                        >
                                            {/* Left: Compact Category Icon */}
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div
                                                    className={cn(
                                                        "flex items-center justify-center shrink-0 border",
                                                        txListDensity === "compact" ? "h-8 w-8" : "h-10 w-10",
                                                        "rounded-[var(--icon-radius,1rem)]",
                                                        !categoryColor && (
                                                            isIncome
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                                : isExpense
                                                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                                                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                                        )
                                                    )}
                                                    style={
                                                        categoryColor
                                                            ? {
                                                                  backgroundColor: `${categoryColor}18`,
                                                                  color: categoryColor,
                                                                  borderColor: `${categoryColor}30`,
                                                              }
                                                            : undefined
                                                    }
                                                >
                                                    {categoryIcon ? (
                                                        <CategoryIcon name={categoryIcon} className="h-[18px] w-[18px]" />
                                                    ) : isTransfer ? (
                                                        <ArrowRightLeft className="h-[18px] w-[18px]" />
                                                    ) : isIncome ? (
                                                        <ArrowDownLeft className="h-[18px] w-[18px]" />
                                                    ) : (
                                                        <ArrowUpRight className="h-[18px] w-[18px]" />
                                                    )}
                                                </div>

                                                {/* Center: Crisp 2-line Hierarchy */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="font-bold text-[13.5px] sm:text-sm text-foreground truncate leading-snug">
                                                            {title}
                                                        </span>
                                                        {metadata?.isBalanceAdjustment && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                                                <Calculator className="h-2.5 w-2.5" />
                                                                Ajuste
                                                            </span>
                                                        )}
                                                        {showModeBadge && (
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0",
                                                                    isFuture
                                                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                                        : "bg-primary/10 text-primary"
                                                                )}
                                                            >
                                                                {(mode === 'RECURRING' || mode === 'SUBSCRIPTION') && <Repeat className="h-2.5 w-2.5" />}
                                                                {(mode === 'SCHEDULED' || mode === 'UPCOMING') && <CalendarClock className="h-2.5 w-2.5" />}
                                                                {(mode === 'LOAN_LENT' || mode === 'LOAN_BORROWED') && <HandCoins className="h-2.5 w-2.5" />}
                                                                {isAuto && <Zap className="h-2.5 w-2.5 fill-current" />}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 min-w-0">
                                                        {account && (
                                                            <span className="inline-flex items-center gap-1 truncate max-w-[130px] sm:max-w-[180px] font-medium">
                                                                <span
                                                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                                                    style={{ backgroundColor: account.color || "#7c3aed" }}
                                                                />
                                                                <span className="truncate">{account.name}</span>
                                                            </span>
                                                        )}
                                                        {category?.name && (
                                                            <>
                                                                <span className="opacity-40 shrink-0">·</span>
                                                                <span className="truncate">{category.name}</span>
                                                            </>
                                                        )}
                                                        <span className="opacity-40 shrink-0">·</span>
                                                        <span className="tabular-nums shrink-0 opacity-80">{timeLabel}</span>
                                                        {Array.isArray(tx.tags) && tx.tags.length > 0 && (
                                                            <>
                                                                <span className="opacity-40 shrink-0">·</span>
                                                                <span className="truncate text-[10px] font-semibold text-primary">
                                                                    #{tx.tags[0]}{tx.tags.length > 1 ? ` +${tx.tags.length - 1}` : ""}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Tabular Amount */}
                                            <div className="flex flex-col items-end shrink-0 pl-1">
                                                <span
                                                    className={cn(
                                                        "text-sm sm:text-[15px] font-extrabold tracking-tight tabular-nums leading-snug",
                                                        isIncome
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : isExpense
                                                              ? "text-rose-500"
                                                              : "text-indigo-600 dark:text-indigo-400"
                                                    )}
                                                >
                                                    {isExpense ? '-' : '+'}{symbol}{isBalanceVisible ? originalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '•••'}
                                                </span>
                                                {showConversion && (
                                                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                                                        ≈ {userSymbol}{isBalanceVisible ? convertedAmount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '•••'}
                                                    </span>
                                                )}
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
