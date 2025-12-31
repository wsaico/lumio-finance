"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Calendar } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { BalanceOverTimeChart } from "@/components/accounts/charts/balance-over-time-chart"
import { IncomeExpensePieChart } from "@/components/accounts/charts/income-expense-pie-chart"
import { MonthlyComparisonChart } from "@/components/accounts/charts/monthly-comparison-chart"
import { AccountTransactionsList } from "@/components/accounts/account-transactions-list"
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

    // Fetch transactions for this account
    const { data: transactions, isLoading: loadingTransactions } = useQuery({
        queryKey: ['transactions', id],
        queryFn: async () => {
            const res = await fetch(`/api/transactions?accountId=${id}`)
            if (!res.ok) throw new Error('Error fetching transactions')
            return res.json()
        },
    })

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
    const totalIncome = transactions?.filter((t: any) => t.transaction_type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

    const totalExpenses = transactions?.filter((t: any) => t.transaction_type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

    return (
        <FadeIn className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/accounts')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{account.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Badge variant="outline">{account.accountType.replace('_', ' ')}</Badge>
                            {account.accountNumber && (
                                <span className="text-sm font-mono">{account.accountNumber}</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StaggerItem>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {account.currencyCode === 'PEN' ? 'S/' : '$'} {balance.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Inicial: {account.currencyCode === 'PEN' ? 'S/' : '$'} {initialBalance.toFixed(2)}
                            </p>
                            <div className={`flex items-center text-xs mt-2 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {change >= 0 ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {change >= 0 ? '+' : ''}{account.currencyCode === 'PEN' ? 'S/' : '$'} {change.toFixed(2)} ({changePercent.toFixed(1)}%)
                            </div>
                        </CardContent>
                    </Card>
                </StaggerItem>

                <StaggerItem>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">
                                {account.currencyCode === 'PEN' ? 'S/' : '$'} {totalIncome.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Transacciones de ingreso
                            </p>
                        </CardContent>
                    </Card>
                </StaggerItem>

                <StaggerItem>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {account.currencyCode === 'PEN' ? 'S/' : '$'} {totalExpenses.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Transacciones de gasto
                            </p>
                        </CardContent>
                    </Card>
                </StaggerItem>

                <StaggerItem>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {transactions?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total de movimientos
                            </p>
                        </CardContent>
                    </Card>
                </StaggerItem>
            </StaggerContainer>

            {/* Charts and Transactions */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="analytics">Análisis</TabsTrigger>
                    <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <BalanceOverTimeChart
                            accountId={id}
                            currencyCode={account.currencyCode}
                        />
                        <IncomeExpensePieChart
                            transactions={transactions || []}
                            currencyCode={account.currencyCode}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <MonthlyComparisonChart
                        transactions={transactions || []}
                        currencyCode={account.currencyCode}
                    />
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    {loadingTransactions ? (
                        <div className="flex items-center justify-center h-[400px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <AccountTransactionsList
                            transactions={transactions || []}
                            currencyCode={account.currencyCode}
                        />
                    )}
                </TabsContent>
            </Tabs>
        </FadeIn>
    )
}
