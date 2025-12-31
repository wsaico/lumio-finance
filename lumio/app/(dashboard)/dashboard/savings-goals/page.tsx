"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Target, TrendingUp, Trophy, Sparkles } from "lucide-react"
import Link from "next/link"
import { useSavingsGoals, useSavingsGoalsAnalytics } from "@/hooks/use-savings-goals"
import { GoalCard } from "@/components/savings-goals/goal-card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SavingsGoalsPage() {
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')

    const { data: goalsData, isLoading: loadingGoals } = useSavingsGoals(statusFilter)
    const { data: analytics, isLoading: loadingAnalytics } = useSavingsGoalsAnalytics()

    const goals = goalsData?.goals || []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Metas de Ahorro</h2>
                    <p className="text-muted-foreground">
                        Alcanza tus objetivos financieros con metas inteligentes
                    </p>
                </div>
                <Button asChild className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20">
                    <Link href="/dashboard/savings-goals/new">
                        <Plus className="h-4 w-4" />
                        Nueva Meta
                    </Link>
                </Button>
            </div>

            {/* Analytics Cards */}
            {loadingAnalytics ? (
                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32 mb-1" />
                                <Skeleton className="h-3 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Ahorrado</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">S/ {analytics?.totalSaved?.toFixed(2) || '0.00'}</div>
                            <p className="text-xs text-muted-foreground">
                                de S/ {analytics?.totalTarget?.toFixed(2) || '0.00'} objetivo
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Metas Activas</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics?.activeGoals || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                {analytics?.completedGoals || 0} completadas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics?.avgProgress?.toFixed(1) || '0'}%</div>
                            <p className="text-xs text-muted-foreground">
                                en todas las metas
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ahorro Mensual</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">S/ {analytics?.avgMonthlyContribution?.toFixed(2) || '0.00'}</div>
                            <p className="text-xs text-muted-foreground">
                                promedio por meta
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
                <Button
                    variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('ACTIVE')}
                    size="sm"
                >
                    Activas
                </Button>
                <Button
                    variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('COMPLETED')}
                    size="sm"
                >
                    Completadas
                </Button>
                <Button
                    variant={statusFilter === '' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('')}
                    size="sm"
                >
                    Todas
                </Button>
            </div>

            {/* Goals Grid */}
            {loadingGoals ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-6 w-32 mb-4" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-10 w-full" />
                        </Card>
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <Card className="p-12">
                    <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Target className="w-12 h-12 text-orange-600" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">No hay metas {statusFilter === 'ACTIVE' ? 'activas' : statusFilter === 'COMPLETED' ? 'completadas' : ''}</h3>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Crea tu primera meta de ahorro y comienza a alcanzar tus objetivos financieros
                        </p>
                        <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                            <Link href="/dashboard/savings-goals/new">
                                <Plus className="mr-2 h-5 w-5" />
                                Crear Primera Meta
                            </Link>
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal: any) => (
                        <GoalCard key={goal.id} goal={goal} />
                    ))}
                </div>
            )}
        </div>
    )
}
