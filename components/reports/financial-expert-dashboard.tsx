"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SavingsRateGauge } from "./savings-rate-gauge"
import { useFormat } from "@/hooks/use-format"
import { InsightsAdvisor } from "./insights-advisor"
import { ExpensesPieChart } from "./expenses-pie-chart"
import { CashFlowAreaChart } from "./cash-flow-area-chart"
import {
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    TrendingUp,
    Target,
    Activity,
    BrainCircuit,
    ArrowRight,
    Filter,
    HelpCircle,
    Calendar,
    ChevronDown,
    X,
    TrendingDown,
    LayoutDashboard,
    PieChart as PieChartIcon,
    Tags,
    Wallet
} from "lucide-react"
import { CategoryIcon } from "@/components/icons/category-icon"
import { cn } from "@/lib/utils"
import { BudgetRuleEducation } from "./budget-rule-education"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipProvider,
    TooltipTrigger,
    TooltipContent
} from "@/components/ui/tooltip"
import { useCategories } from "@/hooks/use-categories"
import { useAccounts } from "@/hooks/use-accounts"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { DateRangePicker } from "./date-range-picker"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { ExecutiveHealthScore } from "./financial-health-score"
import { ExecutiveAnnualizedImpact } from "./executive-annualized-impact"
import { TransactionList } from "@/components/transactions/transaction-list"
import { BudgetPulse } from "./budget-pulse"
import { DebtMonitor } from "./debt-monitor"

export function ExpertFinancialDashboard() {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    // Force rebuild trigger
    const [selectedType, setSelectedType] = useState<string>('ALL')
    const [period, setPeriod] = useState<string>('6m')
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null)
    // ZBB Native: We no longer check for budget mode. Everything is ZBB, and 50/30/20 is a passive report.
    const { categories: categoriesData } = useCategories()
    const { accounts: accountsData } = useAccounts()
    const { currencyCode } = useSettingsStore()
    const { formatMoney, formatCompactMoney } = useFormat()

    const { data, isLoading } = useQuery({
        queryKey: ['financial-health', selectedCategories, selectedAccounts, selectedType, period, dateRange, currencyCode],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: selectedType, // Keep this as filter if needed
                period,
                currency: currencyCode || 'PEN' // Pass the proper currency
            })
            if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','))
            if (selectedAccounts.length > 0) params.append('accounts', selectedAccounts.join(','))

            if (period === 'custom' && dateRange?.from && dateRange?.to) {
                params.append('startDate', dateRange.from.toISOString())
                params.append('endDate', dateRange.to.toISOString())
            }

            const res = await fetch(`/api/analytics/financial-health?${params.toString()}`)
            if (!res.ok) throw new Error('Error fetching financial health')
            return res.json()
        }
    })

    const resetFilters = () => {
        setSelectedCategories([])
        setSelectedAccounts([])
        setSelectedType('ALL')
        setPeriod('6m')
        setDateRange(undefined)
        setFocusedCategoryId(null)
    }

    const hasActiveFilters = selectedCategories.length > 0 || selectedAccounts.length > 0 || selectedType !== 'ALL' || period !== '6m'

    // Drill-down logic: Filter data for TransactionList based on current filters + focused category
    const drillDownFilters = useMemo(() => {
        const filters: any = {}
        if (selectedAccounts.length > 0) filters.accountId = selectedAccounts[0]
        if (selectedType !== 'ALL') filters.type = selectedType
        if (focusedCategoryId) filters.categoryId = focusedCategoryId
        else if (selectedCategories.length > 0) filters.categoryId = selectedCategories[0]

        // Date range from current analytics
        if (period === 'custom' && dateRange?.from && dateRange?.to) {
            filters.startDate = dateRange.from.toISOString()
            filters.endDate = dateRange.to.toISOString()
        } else {
            // Default periods handled by backend, but for TransactionList we might need explicit dates
            // For now let's hope TransactionList has its own state or we pass dates
        }
        return filters
    }, [selectedAccounts, selectedType, focusedCategoryId, selectedCategories, period, dateRange])

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="absolute inset-0 blur-lg bg-primary/20 animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground font-semibold animate-pulse tracking-widest uppercase">
                        Sincronizando Inteligencia...
                    </p>
                </div>
            </div>
        )
    }



    const { kpis, insights, comparison, categories, trend, budgetRule, forecast, annualizedImpact, budgets, loans } = data || {}

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
            {/* 1. Advanced Multi-Filter Bar (Sticky) */}
            <div className="flex flex-wrap items-center gap-3 bg-background/40 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-premium-sm sticky top-0 z-50">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Filter className="h-3 w-3" />
                    Filtros Expertos
                </div>

                <Select value={period} onValueChange={(val) => {
                    setPeriod(val)
                    if (val !== 'custom') setDateRange(undefined)
                }}>
                    <SelectTrigger className="w-[130px] h-9 bg-white/5 border-none text-[11px] font-bold rounded-xl focus:ring-1 ring-primary/50">
                        <Calendar className="h-3 w-3 mr-2 text-primary" />
                        <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white z-[100]">
                        <SelectItem value="3m">3 Meses</SelectItem>
                        <SelectItem value="6m">6 Meses</SelectItem>
                        <SelectItem value="12m">1 Año</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                </Select>

                {period === 'custom' && (
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                    />
                )}

                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[150px] h-9 bg-white/5 border-none text-[11px] font-bold rounded-xl focus:ring-1 ring-primary/50">
                        <Activity className="h-3 w-3 mr-2 text-primary" />
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white z-[100]">
                        <SelectItem value="ALL">Todos los tipos</SelectItem>
                        <SelectItem value="INCOME">Ingresos</SelectItem>
                        <SelectItem value="EXPENSE">Gastos</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={selectedAccounts[0] || 'ALL'}
                    onValueChange={(val) => {
                        if (val === 'ALL') setSelectedAccounts([])
                        else setSelectedAccounts([val])
                    }}
                >
                    <SelectTrigger className="w-[180px] h-9 bg-white/5 border-none text-[11px] font-bold rounded-xl focus:ring-1 ring-primary/50">
                        <Target className="h-3 w-3 mr-2 text-primary" />
                        <SelectValue placeholder="Cuenta" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white z-[100] max-h-[250px]">
                        <SelectItem value="ALL">Todas las cuentas</SelectItem>
                        {accountsData?.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={selectedCategories[0] || 'ALL'}
                    onValueChange={(val) => {
                        if (val === 'ALL') setSelectedCategories([])
                        else setSelectedCategories([val])
                    }}
                >
                    <SelectTrigger className="w-[200px] h-9 bg-white/5 border-none text-[11px] font-bold rounded-xl focus:ring-1 ring-primary/50">
                        <ChevronDown className="h-3 w-3 mr-2 text-primary" />
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 backdrop-blur-xl border-white/10 text-white z-[100] max-h-[250px]">
                        <SelectItem value="ALL">Todas las categorías</SelectItem>
                        {categoriesData?.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-rose-500 hover:bg-white/5 rounded-xl transition-all border border-white/5"
                        onClick={resetFilters}
                    >
                        <X className="h-3 w-3 mr-2" />
                        Limpiar Filtros
                    </Button>
                )}
            </div>

            {/* 2. Executive Pulse (Status Quo) */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <ExecutiveHealthScore score={kpis?.healthScore || 0} />
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Runway */}
                    <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5">
                        <CardContent className="pt-6 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12">
                                <Activity className="h-24 w-24" />
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Liquidez Estratégica</p>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                    **Runway:** Cuántos meses durarían tus ahorros si tus ingresos se detuvieran hoy.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <h4 className="text-3xl font-black tabular-nums">
                                        {kpis?.runwayMonths} <span className="text-sm font-bold text-muted-foreground/40">meses</span>
                                    </h4>
                                    <p className="text-[10px] font-bold text-primary uppercase">Runway Estimado (Oxígeno)</p>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-muted-foreground">TOTAL DISPONIBLE</span>
                                        <span>{formatMoney(kpis?.totalLiquidity)}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (kpis?.runwayMonths / 6) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Forecast */}
                    <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5">
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Proyección Mensual</p>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                    **Proyección:** Estimación de gasto total a fin de mes basada en tu ritmo diario actual.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <h4 className="text-2xl font-black tabular-nums">{formatMoney(forecast?.predictedMonthEndExpense || 0)}</h4>
                                    <p className="text-[10px] font-bold text-amber-500 uppercase">Gasto Estimado a Fin de Mes</p>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground">RESERVA ANUALIZADA</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                        **Reserva Anual:** Si mantienes tu ritmo actual todo el año.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-black",
                                            forecast?.estimatedYearlySavings >= 0 ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {forecast?.estimatedYearlySavings >= 0 ? '+' : ''}{formatMoney(Math.round(forecast?.estimatedYearlySavings || 0))}
                                        </span>
                                    </div>
                                    <TrendingUp className="h-5 w-5 text-muted-foreground/20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 3. Strategic Context & Trend Analysis */}
            <div className="space-y-6">
                <InsightsAdvisor insights={insights} />

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    {/* Evolution Chart (Main Context) */}
                    <Card className="lg:col-span-2 border-none bg-background/40 backdrop-blur-md shadow-lg border-white/10 overflow-hidden min-h-[300px]">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Evolución Dinámica de Capital
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <CashFlowAreaChart data={trend || []} />
                        </CardContent>
                    </Card>

                    {/* Tactical KPIs (Context Support) */}
                    <div className="space-y-4">
                        {/* Card 1: Burn Rate -> Velocidad de Gasto */}
                        <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Velocidad de Gasto</p>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                        **Burn Rate Diario:** Es el promedio de dinero que gastas cada día.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <h4 className="text-xl font-black">{formatMoney(kpis?.burnRate)}</h4>
                                    </div>
                                    <Zap className="h-6 w-6 text-amber-500/20" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 2: Savings Rate -> Capacidad de Ahorro */}
                        <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Capacidad de Ahorro</p>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                        **Tasa de Ahorro:** Porcentaje de tus ingresos totales que lograste retener.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <h4 className="text-xl font-black">{kpis?.savingsRate}%</h4>
                                    </div>
                                    <Target className="h-6 w-6 text-primary/20" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Card 3: Net Cash Flow -> Saldo a Favor -> Fills the gap */}
                        <Card className="border-none bg-background/40 backdrop-blur-md shadow-sm border border-white/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Saldo a Favor</p>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <HelpCircle className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black/95 border-white/10 text-[10px] p-3 max-w-[220px]">
                                                        **Flujo Neto:** Lo que realmente ganaste (o perdiste) después de pagar todo.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <h4 className={cn("text-xl font-black", (kpis?.netCashFlow || 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                            {(kpis?.netCashFlow || 0) >= 0 ? '+' : ''} {formatMoney(Math.abs(kpis?.netCashFlow || 0))}
                                        </h4>
                                    </div>
                                    <Wallet className={cn("h-6 w-6 opacity-20", (kpis?.netCashFlow || 0) >= 0 ? "text-emerald-500" : "text-rose-500")} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Expert Education - Full Width for better grid layout */}

                {/* 3.5 Operational Control (Budgets & Loans) */}
                <div className="grid gap-6 grid-cols-1 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <div className="md:col-span-2 min-h-[250px]">
                        <BudgetPulse budgets={budgets || []} />
                    </div>
                    <div className="min-h-[250px]">
                        <DebtMonitor loans={loans || []} />
                    </div>
                </div>

                {/* ZBB Native: Always show 50/30/20 as passive intelligence */}
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <BudgetRuleEducation data={budgetRule} />
                </div>
            </div>

            {/* 4. Expense Intelligence (Breakdown & Leaks) */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                {/* Anatomy of Expenses */}
                <Card className="border-none bg-background/40 backdrop-blur-md shadow-lg border-white/10 group h-full">
                    <CardHeader className="border-b border-white/5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-primary" />
                            Anatomía de Gastos
                        </CardTitle>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">
                            Haz clic para explorar el detalle (Drill-Down)
                        </p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ExpensesPieChart
                            data={categories || []}
                            onSliceClick={(catId) => {
                                setFocusedCategoryId(catId)
                                document.getElementById('drill-down-section')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Annualized Impact */}
                <div className="h-full">
                    <ExecutiveAnnualizedImpact data={annualizedImpact} />
                </div>
            </div>

            {/* 5. Drill-Down Executive Audit */}
            <div id="drill-down-section" className="space-y-4 scroll-mt-24 pt-8 border-t border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <LayoutDashboard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight uppercase">Auditoría Ejecutiva</h2>
                                <p className="text-xs text-muted-foreground font-bold">
                                    {focusedCategoryId
                                        ? `Detalle de: ${categories?.find((c: any) => c.id === focusedCategoryId)?.name || 'Categoría'}`
                                        : 'Selecciona una categoría para filtrar el desglose'}
                                </p>
                            </div>
                        </div>
                        {focusedCategoryId && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-white/10 bg-white/5 text-[10px] font-bold uppercase transition-all hover:bg-rose-500/10 hover:text-rose-500"
                                onClick={() => setFocusedCategoryId(null)}
                            >
                                <X className="h-3 w-3 mr-2" />
                                Ver Todos
                            </Button>
                        )}
                    </div>

                    {/* Category Quick Selector Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 mask-linear-r">
                        <button
                            onClick={() => setFocusedCategoryId(null)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 active:scale-95",
                                !focusedCategoryId
                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
                                    : "bg-muted/40 border-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/10"
                            )}
                        >
                            <Tags className="h-3.5 w-3.5" />
                            Todas
                        </button>
                        {categories?.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setFocusedCategoryId(focusedCategoryId === cat.id ? null : cat.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 active:scale-95",
                                    focusedCategoryId === cat.id
                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
                                        : "bg-muted/40 border-transparent text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/10"
                                )}
                            >
                                {cat.icon && <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />}
                                {cat.name}
                                <span className={cn(
                                    "ml-1 opacity-40 group-hover:opacity-100 transition-opacity",
                                    focusedCategoryId === cat.id ? "opacity-100" : ""
                                )}>{formatCompactMoney(cat.amount)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {focusedCategoryId && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in zoom-in duration-500">
                            <div className="col-span-3">
                                <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Resumen de Auditoría</span>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    {categories?.find((c: any) => c.id === focusedCategoryId)?.name || 'Categoría'}
                                </h3>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground/50">Gasto Total</span>
                                <div className="text-lg font-black tabular-nums text-primary">
                                    {formatMoney(categories?.find((c: any) => c.id === focusedCategoryId)?.amount || 0)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-1 rounded-3xl bg-white/5 border border-white/5 min-h-[400px]">
                        <TransactionList
                            overrideFilters={drillDownFilters}
                            hideMonthSelector={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
