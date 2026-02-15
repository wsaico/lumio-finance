"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Calculator, FileText, Archive, TrendingUp, AlertCircle, CheckCircle2, Wallet, Sparkles, Receipt } from "lucide-react"
import Link from "next/link"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/ui/fade-in"
import { Badge } from "@/components/ui/badge"
import { usePettyCashFunds, usePettyCashExpenses, usePettyCashSettlements } from "@/hooks/usePettyCash"
import { CreateFundModal } from "@/components/petty-cash/create-fund-modal"
import { CreateAuditModal } from "@/components/petty-cash/create-audit-modal"
import { ExpensesList } from "@/components/petty-cash/expenses-list"
import { SettlementsList } from "@/components/petty-cash/settlements-list"
import { AuditsList } from "@/components/petty-cash/audits-list"
import { ReplenishmentHistoryCard } from "@/components/petty-cash/replenishment-history-card"

export default function PettyCashPage() {
    const [selectedFund, setSelectedFund] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>('funds')

    const { data: funds, isLoading: loadingFunds } = usePettyCashFunds('ACTIVE')
    const { data: expenses, isLoading: loadingExpenses } = usePettyCashExpenses(selectedFund || undefined)
    const { data: settlements, isLoading: loadingSettlements } = usePettyCashSettlements(selectedFund || undefined)

    // Calculate aggregated data from actual funds
    const activeFunds = funds?.filter((f: any) => f.status === 'ACTIVE') || []
    const totalBalance = activeFunds.reduce((sum: number, f: any) => sum + Number(f.currentBalance), 0)
    const totalAssigned = activeFunds.reduce((sum: number, f: any) => sum + Number(f.assignedAmount), 0)
    const totalSpent = totalAssigned - totalBalance
    const spentPercentage = totalAssigned > 0 ? (totalSpent / totalAssigned) * 100 : 0

    const pendingExpenses = expenses?.filter((e: any) => e.status === 'PENDING' || e.status === 'APPROVED') || []
    const pendingSettlements = settlements?.filter((s: any) => s.status === 'PENDING') || []

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null // or a loading skeleton
    }

    return (
        <div suppressHydrationWarning>
            <FadeIn className="space-y-6">
                {/* Header */}
                {/* Header Toolbar */}
                <div className="flex items-center justify-end">
                    <div className="flex gap-2">
                        <CreateAuditModal />
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/dashboard/petty-cash/new-settlement">
                                <FileText className="h-4 w-4" />
                                Liquidar
                            </Link>
                        </Button>
                        <Button asChild className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20">
                            <Link href="/dashboard/petty-cash/new-expense">
                                <Sparkles className="h-4 w-4" />
                                Gasto Inteligente
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StaggerItem>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    S/ {totalBalance.toFixed(2)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    de S/ {totalAssigned.toFixed(2)} asignados
                                </p>
                                <div className="mt-3 h-2 w-full rounded-full bg-secondary">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                                        style={{ width: `${100 - spentPercentage}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Fondos Activos</CardTitle>
                                <Archive className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {activeFunds.length}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {loadingFunds ? 'Cargando...' : 'fondos operativos'}
                                </p>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card
                            className="cursor-pointer hover:shadow-md transition-all hover:border-amber-500/50 group"
                            onClick={() => setActiveTab('expenses')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Gastos Pendientes</CardTitle>
                                <AlertCircle className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">
                                    {pendingExpenses.length}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    S/ {pendingExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0).toFixed(2)} por liquidar
                                </p>
                            </CardContent>
                        </Card>
                    </StaggerItem>

                    <StaggerItem>
                        <Card
                            className="cursor-pointer hover:shadow-md transition-all hover:border-blue-500/50 group"
                            onClick={() => setActiveTab('settlements')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Liquidaciones</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {pendingSettlements.length}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    pendientes de aprobar
                                </p>
                            </CardContent>
                        </Card>
                    </StaggerItem>
                </StaggerContainer>

                {/* Replenishment Tracking (Solopreneur Mode) */}
                <div className="grid gap-4">
                    <ReplenishmentHistoryCard fundId={selectedFund || undefined} />
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="funds">Fondos</TabsTrigger>
                        <TabsTrigger value="expenses">Gastos</TabsTrigger>
                        <TabsTrigger value="settlements">Liquidaciones</TabsTrigger>
                        <TabsTrigger value="audits">Arqueos</TabsTrigger>
                    </TabsList>

                    {/* Funds Tab */}
                    <TabsContent value="funds" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Fondos Fijos</CardTitle>
                                        <CardDescription>Fondos asignados a responsables</CardDescription>
                                    </div>
                                    <CreateFundModal />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingFunds ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        Cargando fondos...
                                    </div>
                                ) : activeFunds.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No hay fondos activos</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Crea tu primer fondo fijo para comenzar
                                        </p>
                                        <CreateFundModal />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeFunds.map((fund: any) => {
                                            const balance = Number(fund.currentBalance)
                                            const assigned = Number(fund.assignedAmount)
                                            const spent = assigned - balance
                                            const percentage = assigned > 0 ? (spent / assigned) * 100 : 0

                                            return (
                                                <Card key={fund.id} className="p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold">{fund.fundName}</h4>
                                                                <Badge variant="outline" className="font-mono text-xs">
                                                                    {fund.fundCode}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Responsable: {fund.responsibleName}
                                                                {fund.department && ` • ${fund.department}`}
                                                            </p>
                                                            <div className="flex items-center gap-4 text-sm">
                                                                <span className="font-semibold text-emerald-600">
                                                                    S/ {balance.toFixed(2)}
                                                                </span>
                                                                <span className="text-muted-foreground">
                                                                    / S/ {assigned.toFixed(2)}
                                                                </span>
                                                                <Badge
                                                                    variant={percentage >= Number(fund.settlementThreshold) ? "destructive" : "secondary"}
                                                                >
                                                                    {percentage.toFixed(0)}% usado
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedFund(fund.id)
                                                                setActiveTab('expenses')
                                                            }}
                                                        >
                                                            Ver Detalles
                                                        </Button>
                                                    </div>
                                                    <div className="mt-3 h-2 w-full rounded-full bg-secondary">
                                                        <div
                                                            className={`h-full rounded-full ${percentage >= Number(fund.settlement_threshold)
                                                                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                                                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                                                }`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Expenses Tab */}
                    <TabsContent value="expenses" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Gastos de Caja Chica</CardTitle>
                                        <CardDescription>
                                            Registro de gastos con comprobantes
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button asChild variant="default" className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                                            <Link href={`/dashboard/petty-cash/new-expense${selectedFund ? `?fundId=${selectedFund}` : ''}`}>
                                                <Sparkles className="h-4 w-4" />
                                                Registro Inteligente
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ExpensesList fundId={selectedFund || undefined} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settlements Tab */}
                    <TabsContent value="settlements" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Liquidaciones (Rendiciones)</CardTitle>
                                <CardDescription>
                                    Historial de liquidaciones y reposiciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SettlementsList fundId={selectedFund || undefined} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Audits Tab */}
                    <TabsContent value="audits" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Arqueos de Caja Chica</CardTitle>
                                <CardDescription>
                                    Verificaciones de efectivo físico vs registros
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AuditsList fundId={selectedFund || undefined} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </FadeIn>
        </div>
    )
}
