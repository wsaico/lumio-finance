"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { BalanceOverTimeChart } from "@/components/accounts/charts/balance-over-time-chart"
import { IncomeExpensePieChart } from "@/components/accounts/charts/income-expense-pie-chart"
import { MonthlyComparisonChart } from "@/components/accounts/charts/monthly-comparison-chart"
import { AccountTransactionsList } from "@/components/accounts/account-transactions-list"
import { SmartSearchBar } from "@/components/transactions/smart-search-bar"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in"

interface PageProps {
    params: Promise<{
        id: string
    }>
}

export default function AccountDetailPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()

    // Fetch account data
    const { data: account, isLoading: loadingAccount } = useQuery({
        queryKey: ['account', id],
        queryFn: async () => {
            const res = await fetch(`/api/accounts`)
            if (!res.ok) throw new Error('Error fetching accounts')
            const accounts = await res.json()
            return accounts.find((a: any) => a.id === id)
        },
    })

    // Search State
    const [searchParams, setSearchParams] = useState({
        query: "",
        type: undefined as string | undefined,
        month: undefined as string | undefined,
        year: undefined as string | undefined,
        day: undefined as string | undefined
    })

    // Fetch transactions with infinite scroll AND filters
    const {
        data: transactionsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: loadingTransactions
    } = useInfiniteQuery({
        queryKey: ['transactions', id, 'infinite', searchParams],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams({
                accountId: id as string,
                limit: '20',
                page: pageParam.toString()
            })

            if (searchParams.query) params.append('search', searchParams.query)
            if (searchParams.type) params.append('type', searchParams.type)
            if (searchParams.month) params.append('month', searchParams.month)
            if (searchParams.year) params.append('year', searchParams.year)
            if (searchParams.day) params.append('day', searchParams.day)

            const res = await fetch(`/api/transactions?${params.toString()}`)
            if (!res.ok) throw new Error('Error fetching transactions')
            return res.json()
        },
        getNextPageParam: (lastPage: any, pages) => {
            if (lastPage.data?.length < 20) return undefined
            return pages.length + 1
        },
        initialPageParam: 1,
    })

    // Flatten transactions for stats and list
    const transactions = transactionsData?.pages.flatMap((page: any) => page.data || []) || []

    if (loadingAccount) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <p className="text-muted-foreground">Cuenta no encontrada</p>
                <Button onClick={() => router.push('/dashboard/accounts')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Cuentas
                </Button>
            </div>
        )
    }

    const balance = Number(account.currentBalance) || 0
    const initialBalance = Number(account.initialBalance) || 0
    const change = balance - initialBalance
    const changePercent = initialBalance !== 0 ? (change / Math.abs(initialBalance)) * 100 : 0

    // Calculate stats from transactions
    const totalIncome = transactions.filter((t: any) => t.transactionType === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

    const totalExpenses = transactions.filter((t: any) => t.transactionType === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

    return (
        <FadeIn className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Button variant="ghost" className="mb-2 pl-0" onClick={() => router.push('/dashboard/accounts')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a Cuentas
                    </Button>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {account.icon} {account.name}
                        <Badge variant="outline" className="text-base font-normal">
                            {account.currencyCode}
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Detalle de movimientos y balance
                    </p>
                </div>

                {/* Balance Card - Estilo Resumen de Línea */}
                <div className="text-right space-y-2">
                    {account.accountType === 'CREDIT_CARD' ? (
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em]">Crédito Disponible</p>
                            <h2 className="text-4xl font-black font-mono text-emerald-600 tracking-tighter">
                                {account.currencyCode} {(Number(account.creditLimit || 0) - Number(account.usedBalance || 0)).toFixed(2)}
                            </h2>
                            <div className="flex items-center justify-end gap-2 text-xs font-bold">
                                <span className="text-neutral-400 uppercase tracking-tighter font-medium">Límite: {account.currencyCode} {Number(account.creditLimit || 0).toFixed(0)}</span>
                                <span className="text-neutral-300">|</span>
                                <span className="text-red-500 uppercase tracking-tighter">Deuda: {account.currencyCode} {Math.abs(Number(account.usedBalance || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground mb-1">Balance Actual</p>
                            <h2 className={cn(
                                "text-3xl font-bold font-mono tracking-tight",
                                balance >= 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                                {account.currencyCode} {balance.toFixed(2)}
                            </h2>
                        </>
                    )}
                </div>
            </div>

            {/* Charts and Transactions */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="analytics">Análisis</TabsTrigger>
                    <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Summary Statistics */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0">
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Ingresos Totales</p>
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                                        {account.currencyCode} {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-xs text-emerald-600/60 dark:text-emerald-400/50 mt-1 font-medium">
                                        Entradas a esta cuenta
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10 border-red-200/50 dark:border-red-800/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between space-y-0">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Gastos Totales</p>
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
                                        <TrendingDown className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-300">
                                        {account.currencyCode} {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-xs text-red-600/60 dark:text-red-400/50 mt-1 font-medium">
                                        Salidas de esta cuenta
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <BalanceOverTimeChart
                            transactions={transactions}
                            currencyCode={account.currencyCode}
                            currentBalance={balance}
                            accountType={account.accountType}
                            creditLimit={account.creditLimit}
                        />
                        <IncomeExpensePieChart
                            transactions={transactions}
                            currencyCode={account.currencyCode}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <MonthlyComparisonChart
                        transactions={transactions}
                        currencyCode={account.currencyCode}
                    />
                </TabsContent>

                <TabsContent value="transactions">
                    <AccountTransactionsList
                        transactions={transactions}
                        currencyCode={account.currencyCode}
                        onLoadMore={() => fetchNextPage()}
                        hasMore={hasNextPage}
                        isLoadingMore={isFetchingNextPage}
                        headerContent={
                            <SmartSearchBar
                                onSearch={(filters) => setSearchParams(prev => ({
                                    ...prev,
                                    ...filters,
                                    year: filters.year || prev.year || new Date().getFullYear().toString(),
                                    month: filters.month || (filters.year ? undefined : prev.month)
                                }))}
                            />
                        }
                    />
                </TabsContent>
            </Tabs>
        </FadeIn>
    )
}
