"use client"

import * as React from "react"
import Link from "next/link"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
} from "recharts"
import {
    ArrowUpRight,
    Plus,
    Wallet,
    Receipt,
    PieChart as PieChartIcon,
    TrendingUp,
    TrendingDown,
    History,
    Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TransactionList } from "@/components/transactions/transaction-list"

const PIE_COLORS = ["#7C5CFC", "#F48FB1", "#38BDF8", "#34D399", "#FBBF24", "#A78BFA"]

function DashboardSkeleton() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 xl:grid-cols-12 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-3xl xl:col-span-2" />
                ))}
                <Skeleton className="h-28 rounded-3xl col-span-2 xl:col-span-4" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <Skeleton className="h-72 rounded-3xl xl:col-span-5" />
                <Skeleton className="h-72 rounded-3xl xl:col-span-4" />
                <Skeleton className="h-72 rounded-3xl xl:col-span-3" />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-12 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-44 rounded-3xl xl:col-span-2" />
                ))}
                <Skeleton className="h-44 rounded-3xl col-span-2 xl:col-span-4" />
            </div>
        </div>
    )
}

export function ExecutiveDashboard() {
    const { data, isLoading } = useDashboardData()
    const { totalBalanceConverted, accounts: fullAccounts } = useAccounts()
    const { formatMoney } = useFormat()
    const { isBalanceVisible, accentColor, homeWidgets } = useSettingsStore()
    const showKpis = homeWidgets?.kpis !== false
    const showCharts = homeWidgets?.charts !== false
    const showBudgetsRow = homeWidgets?.budgets !== false
    const showRecentTx = homeWidgets?.recentTx !== false
    const brandColor = accentColor || "#7C3AED"

    const money = React.useCallback(
        (val: number) => (isBalanceVisible ? formatMoney(val) : "••••••"),
        [isBalanceVisible, formatMoney]
    )

    const pieColors = React.useMemo(
        () => [brandColor, "#F48FB1", "#38BDF8", "#34D399", "#FBBF24", "#A78BFA"],
        [brandColor]
    )

    if (isLoading || !data) {
        return <DashboardSkeleton />
    }

    const {
        metrics,
        history,
        accounts,
        expensesByCategory,
        healthScore,
        activityDaily = [],
        budget,
        budgetAlerts = [],
    } = data

    const netWorth = totalBalanceConverted || metrics.availableMoney || 0

    // Compute month-over-month deltas from history
    const currHist = history[history.length - 1]
    const prevHist = history[history.length - 2]
    const incomeDelta =
        prevHist && prevHist.income > 0
            ? Math.round(((metrics.totalIncome - prevHist.income) / prevHist.income) * 100)
            : 0
    const expenseDelta =
        prevHist && prevHist.expense > 0
            ? Math.round(((metrics.totalExpense - prevHist.expense) / prevHist.expense) * 100)
            : 0

    // Sparkline series derived from real history
    const sparkHistory =
        history.length > 0
            ? history.map((h) => ({
                  name: h.month,
                  income: h.income,
                  expense: h.expense,
                  net: h.income - h.expense,
                  balance: Math.max(0, h.balance),
              }))
            : [{ name: "Mes", income: 0, expense: 0, net: 0, balance: 0 }]

    // Daily activity series for bottom mini bar chart
    const dailyBars =
        activityDaily.length > 0
            ? activityDaily.slice(-14).map((d, idx) => ({
                  day: idx + 1,
                  count: d.count || 0,
                  net: Math.abs(d.net || 0),
              }))
            : Array.from({ length: 12 }, (_, idx) => ({ day: idx + 1, count: 0, net: 0 }))

    // Circular ring percentage (savings rate clamped 0..100, fallback to healthScore)
    const ringPercent = Math.max(
        0,
        Math.min(100, Math.round(metrics.totalIncome > 0 ? metrics.savingsRate : healthScore))
    )
    const ringRadius = 50
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringOffset = ringCircumference - (ringPercent / 100) * ringCircumference

    const pieData: { name: string; value: number; fill: string }[] =
        expensesByCategory.length > 0
            ? expensesByCategory.slice(0, 5).map((c, idx) => ({
                  name: c.name,
                  value: c.value,
                  fill: c.fill || pieColors[idx % pieColors.length],
              }))
            : [{ name: "Sin gastos", value: 1, fill: "#E2E8F0" }]

    const topCategory = expensesByCategory[0]
    const nowFormatted = format(new Date(), "HH:mm · d 'de' MMMM yyyy", { locale: es })

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* SUB-HEADER BAR (myWallet style date/time + quick register CTA) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                        Resumen Financiero
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 capitalize">
                        {nowFormatted}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/dashboard/transactions/new?type=EXPENSE">
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-9 px-4 font-bold text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                        >
                            <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                            Gasto
                        </Button>
                    </Link>
                    <Link href="/dashboard/transactions/new?type=INCOME">
                        <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full h-9 px-4 font-bold text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                            Ingreso
                        </Button>
                    </Link>
                    <Link href="/dashboard/transactions/new" className="hidden sm:block">
                        <Button
                            size="sm"
                            className="rounded-full h-9 px-4 font-bold text-xs bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Registrar
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ROW 1: 4 KPI SPARKLINE CARDS + 1 VIOLET HERO WAVE CARD */}
            {showKpis && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                {/* 4 KPI Cards */}
                <div className="xl:col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    {/* KPI 1: Patrimonio Total */}
                    <div className="card-modern p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[122px]">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Patrimonio Total
                        </span>
                        <div className="my-1.5 min-w-0">
                            <p
                                className="text-base sm:text-lg xl:text-[1.3rem] font-black tracking-tight text-foreground tabular-nums whitespace-nowrap overflow-hidden text-ellipsis leading-tight"
                                title={money(netWorth)}
                            >
                                {money(netWorth)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto">
                            <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                {accounts.length} {accounts.length === 1 ? "cuenta" : "cuentas"}
                            </span>
                            <div className="w-14 h-6 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sparkHistory}>
                                        <Line
                                            type="monotone"
                                            dataKey="balance"
                                            stroke={brandColor}
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* KPI 2: Ingresos del Mes */}
                    <div className="card-modern p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[122px]">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Ingresos del Mes
                        </span>
                        <div className="my-1.5 min-w-0">
                            <p
                                className="text-base sm:text-lg xl:text-[1.3rem] font-black tracking-tight text-foreground tabular-nums whitespace-nowrap overflow-hidden text-ellipsis leading-tight"
                                title={money(metrics.totalIncome)}
                            >
                                {money(metrics.totalIncome)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto">
                            <span
                                className={cn(
                                    "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0",
                                    incomeDelta >= 0
                                        ? "text-emerald-600 bg-emerald-500/10"
                                        : "text-rose-600 bg-rose-500/10"
                                )}
                            >
                                {incomeDelta >= 0 ? `+${incomeDelta}%` : `${incomeDelta}%`}
                            </span>
                            <div className="w-14 h-6 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sparkHistory}>
                                        <Line
                                            type="monotone"
                                            dataKey="income"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* KPI 3: Gastos del Mes */}
                    <div className="card-modern p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[122px]">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Gastos del Mes
                        </span>
                        <div className="my-1.5 min-w-0">
                            <p
                                className="text-base sm:text-lg xl:text-[1.3rem] font-black tracking-tight text-foreground tabular-nums whitespace-nowrap overflow-hidden text-ellipsis leading-tight"
                                title={money(metrics.totalExpense)}
                            >
                                {money(metrics.totalExpense)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto">
                            <span
                                className={cn(
                                    "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0",
                                    expenseDelta <= 0
                                        ? "text-emerald-600 bg-emerald-500/10"
                                        : "text-rose-600 bg-rose-500/10"
                                )}
                            >
                                {expenseDelta > 0 ? `+${expenseDelta}%` : `${expenseDelta}%`}
                            </span>
                            <div className="w-14 h-6 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sparkHistory}>
                                        <Line
                                            type="monotone"
                                            dataKey="expense"
                                            stroke="#F43F5E"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* KPI 4: Liquidez / Flujo Neto */}
                    <div className="card-modern p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between min-h-[122px]">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                            Flujo Neto
                        </span>
                        <div className="my-1.5 min-w-0">
                            <p
                                className={cn(
                                    "text-base sm:text-lg xl:text-[1.3rem] font-black tracking-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis leading-tight",
                                    metrics.netFlow >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                )}
                                title={`${metrics.netFlow >= 0 ? "+" : ""}${money(metrics.netFlow)}`}
                            >
                                {metrics.netFlow >= 0 ? "+" : ""}
                                {money(metrics.netFlow)}
                            </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto">
                            <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums shrink-0">
                                Ahorro {Math.round(metrics.savingsRate)}%
                            </span>
                            <div className="w-14 h-6 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sparkHistory.slice(-5)}>
                                        <Bar dataKey="income" fill={brandColor} radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Featured Right Wave Card (myWallet top-right card) */}
                <div className="xl:col-span-3 rounded-[1.75rem] card-brand-wave text-white p-5 flex flex-col justify-between relative overflow-hidden min-h-[126px]">
                    <div className="h-14 w-full -mt-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkHistory}>
                                <Line
                                    type="monotone"
                                    dataKey="income"
                                    stroke="#FFFFFF"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: "#FFFFFF", strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-end justify-between gap-2 mt-1">
                        <div className="min-w-0">
                            <p
                                className="text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none whitespace-nowrap overflow-hidden text-ellipsis text-white"
                                title={money(Math.abs(metrics.netFlow))}
                            >
                                {money(Math.abs(metrics.netFlow))}
                            </p>
                            <p className="text-[11px] font-medium text-white/85 mt-1 truncate">
                                {metrics.netFlow >= 0 ? "Superávit de este mes" : "Déficit de este mes"}
                            </p>
                        </div>
                        <Link
                            href="/dashboard/transactions"
                            aria-label="Ver movimientos"
                            className="h-9 w-9 rounded-full btn-brand-pill hover:scale-105 transition-transform flex items-center justify-center shrink-0 shadow-md"
                        >
                            <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                        </Link>
                    </div>
                </div>
            </div>
            )}

            {/* ROW 2: 2 ANALYTICS CHARTS + STACKED VIOLET SAVINGS RING CARD */}
            {showCharts && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                {/* Chart 1: Grouped Bar Chart (Ingresos vs Gastos 6 Meses) */}
                <div className="xl:col-span-5 card-modern p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                                Ingresos vs. Gastos
                            </h3>
                            <p className="text-xs text-muted-foreground">Comparativa últimos 6 meses</p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-semibold">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                Ingresos
                            </span>
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#F48FB1]" />
                                Gastos
                            </span>
                        </div>
                    </div>

                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sparkHistory} barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    width={42}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                                />
                                <Tooltip
                                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--popover)",
                                        color: "var(--popover-foreground)",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}
                                    formatter={(val: any) => money(Number(val))}
                                />
                                <Bar dataKey="income" name="Ingresos" fill={brandColor} radius={[6, 6, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="expense" name="Gastos" fill="#F48FB1" radius={[6, 6, 0, 0]} maxBarSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Dual Curved Spline (Tendencia de Flujo) */}
                <div className="xl:col-span-4 card-modern p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                                Reporte Analítico
                            </h3>
                            <p className="text-xs text-muted-foreground">Evolución mensual de flujo</p>
                        </div>
                        <Link
                            href="/dashboard/analysis"
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            Ver detalle
                        </Link>
                    </div>

                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparkHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    width={42}
                                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--popover)",
                                        color: "var(--popover-foreground)",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                    }}
                                    formatter={(val: any) => money(Number(val))}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="income"
                                    name="Ingresos"
                                    stroke={brandColor}
                                    strokeWidth={2.5}
                                    dot={{ r: 3.5, fill: brandColor }}
                                    activeDot={{ r: 5 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expense"
                                    name="Gastos"
                                    stroke="#F48FB1"
                                    strokeWidth={2.5}
                                    dot={{ r: 3.5, fill: "#F48FB1" }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stacked Savings Card (myWallet middle-right card with Dynamic Ring) */}
                <div className="xl:col-span-3 relative py-1">
                    {/* Decorative tilted layer behind */}
                    <div className="hidden sm:block absolute inset-x-3 inset-y-2 rounded-[2rem] card-brand-tilted rotate-6 opacity-90 shadow-lg pointer-events-none" />
                    <div className="relative h-full rounded-[2rem] card-brand-savings text-white p-6 flex flex-col items-center justify-between text-center min-h-[290px]">
                        <div>
                            <p className="text-xs font-semibold text-white/80">
                                Tu ahorro de este mes
                            </p>
                            <p className="text-xl font-black tracking-tight tabular-nums mt-1 text-white">
                                {money(Math.max(0, metrics.netFlow))}
                            </p>
                        </div>

                        {/* Circular Progress Ring */}
                        <div className="relative flex items-center justify-center my-3">
                            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={ringRadius}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.22)"
                                    strokeWidth="12"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r={ringRadius}
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={ringCircumference}
                                    strokeDashoffset={ringOffset}
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black tabular-nums leading-none text-white">
                                    {ringPercent}%
                                </span>
                                <span className="text-[10px] font-semibold text-white/85 mt-1">
                                    {metrics.totalIncome > 0 ? "Tasa ahorro" : "Salud"}
                                </span>
                            </div>
                        </div>

                        {/* Bottom Metrics */}
                        <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-xs">
                            <div className="text-left">
                                <p className="text-[10px] text-white/70 font-medium">Ingresos</p>
                                <p className="font-extrabold tabular-nums truncate">
                                    {money(metrics.totalIncome)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-white/70 font-medium">Gastos</p>
                                <p className="font-extrabold tabular-nums truncate">
                                    {money(metrics.totalExpense)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* ROW 3: 4 BOTTOM INSIGHT CARDS + 2 VIOLET QUICK METRIC TILES */}
            {showBudgetsRow && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                <div className="xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Insight 1: Gasto Diario Promedio */}
                    <div className="card-modern p-4 flex flex-col justify-between min-h-[168px]">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                    Gasto Diario Prom.
                                </p>
                                <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                                    {money(metrics.dailyExpenseAvg || 0)}
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                Diario
                            </span>
                        </div>
                        <div className="h-20 w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparkHistory}>
                                    <defs>
                                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.28} />
                                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        stroke="#F43F5E"
                                        strokeWidth={2}
                                        fill="url(#expGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Insight 2: Ingreso Diario Promedio */}
                    <div className="card-modern p-4 flex flex-col justify-between min-h-[168px]">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                    Ingreso Diario Prom.
                                </p>
                                <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                                    {money(metrics.dailyIncomeAvg || 0)}
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Diario
                            </span>
                        </div>
                        <div className="h-20 w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparkHistory}>
                                    <defs>
                                        <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        fill="url(#incGrad)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Insight 3: Distribución de Gastos (Pie) */}
                    <div className="card-modern p-4 flex flex-col justify-between min-h-[168px]">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                    Top Categoría
                                </p>
                                <p className="text-sm font-black text-foreground truncate mt-0.5">
                                    {topCategory ? topCategory.name : "Sin gastos"}
                                </p>
                            </div>
                            {topCategory && (
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                                    {money(topCategory.value)}
                                </span>
                            )}
                        </div>
                        <div className="h-22 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={18}
                                        outerRadius={36}
                                        paddingAngle={2}
                                    >
                                        {pieData.map((entry, idx) => (
                                            <Cell
                                                key={entry.name}
                                                fill={entry.fill || PIE_COLORS[idx % PIE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: any) => money(Number(val))} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Insight 4: Actividad Diaria (Vertical Bars) */}
                    <div className="card-modern p-4 flex flex-col justify-between min-h-[168px]">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">
                                    Salud Financiera
                                </p>
                                <p className="text-lg font-black text-foreground tabular-nums mt-0.5">
                                    {Math.round(healthScore)} / 100
                                </p>
                            </div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Score
                            </span>
                        </div>
                        <div className="h-20 w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dailyBars}>
                                    <Bar dataKey="count" fill={brandColor} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 2 Right Brand Gradient Quick-Metric Tiles (myWallet bottom-right) */}
                <div className="xl:col-span-3 grid grid-cols-2 gap-3.5">
                    <Link
                        href="/dashboard/transactions"
                        className="rounded-[1.75rem] card-brand-tile-1 text-white p-4 flex flex-col justify-between min-h-[168px] group hover:scale-[1.02] transition-transform"
                    >
                        <div className="h-9 w-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Receipt className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-black tabular-nums leading-none text-white">
                                {metrics.transactionsCount}
                            </p>
                            <p className="text-[11px] font-medium text-white/85 mt-1 leading-tight">
                                Movimientos del mes
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <span className="h-8 w-8 rounded-full btn-brand-pill flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                            </span>
                        </div>
                    </Link>

                    <Link
                        href="/dashboard/budgets"
                        className="rounded-[1.75rem] card-brand-tile-2 text-white p-4 flex flex-col justify-between min-h-[168px] group hover:scale-[1.02] transition-transform"
                    >
                        <div className="h-9 w-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <PieChartIcon className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-black tabular-nums leading-none text-white">
                                {budget ? `${Math.round(budget.usagePercentage)}%` : "0%"}
                            </p>
                            <p className="text-[11px] font-medium text-white/85 mt-1 leading-tight">
                                Uso de presupuesto
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <span className="h-8 w-8 rounded-full btn-brand-pill flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                            </span>
                        </div>
                    </Link>
                </div>
            </div>
            )}

            {/* ROW 4: ACTIONABLE PERSONAL FINANCE STRIP (RECENT ACTIVITY + ACCOUNTS & BUDGETS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Recent Transactions */}
                {showRecentTx && (
                <div className="lg:col-span-7 card-modern p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <History className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-foreground leading-tight">
                                    Últimos Movimientos
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Toca cualquiera para editarlo
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/transactions"
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            Ver todos
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <TransactionList limit={5} />
                </div>
                )}

                {/* Accounts & Budgets Overview */}
                <div className={cn(showRecentTx ? "lg:col-span-5" : "lg:col-span-12", "flex flex-col gap-5")}>
                    {/* Accounts Card */}
                    <div className="card-modern p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Wallet className="h-4.5 w-4.5" />
                                </div>
                                <h3 className="text-base font-extrabold text-foreground">
                                    Mis Cuentas
                                </h3>
                            </div>
                            <Link
                                href="/dashboard/accounts"
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Gestionar
                            </Link>
                        </div>

                        <div className="space-y-2.5">
                            {(fullAccounts?.length ? fullAccounts : accounts)
                                .slice(0, 4)
                                .map((acc: any) => (
                                    <Link
                                        key={acc.id}
                                        href={`/dashboard/accounts/${acc.id}`}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">
                                                {acc.name}
                                            </p>
                                            <p className="text-[11px] font-medium text-muted-foreground">
                                                {acc.currencyCode || acc.currency}
                                            </p>
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-foreground shrink-0">
                                            {isBalanceVisible
                                                ? formatMoney(
                                                      Number(acc.currentBalance ?? acc.balance ?? 0),
                                                      acc.currencyCode || acc.currency
                                                  )
                                                : "••••"}
                                        </span>
                                    </Link>
                                ))}
                            {accounts.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                    Aún no tienes cuentas registradas.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Budget Alerts Card */}
                    {budgetAlerts.length > 0 && (
                        <div className="card-modern p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-extrabold text-foreground">
                                        Pulso de Presupuestos
                                    </h3>
                                </div>
                                <Link
                                    href="/dashboard/budgets"
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    Ver todos
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {budgetAlerts.slice(0, 3).map((b) => (
                                    <div key={b.name} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="truncate text-foreground">{b.name}</span>
                                            <span
                                                className={cn(
                                                    "tabular-nums",
                                                    b.percent >= 100
                                                        ? "text-rose-500"
                                                        : b.percent >= 80
                                                          ? "text-amber-500"
                                                          : "text-emerald-600"
                                                )}
                                            >
                                                {Math.round(b.percent)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, b.percent)}%`,
                                                    backgroundColor:
                                                        b.percent >= 100
                                                            ? "#F43F5E"
                                                            : b.percent >= 80
                                                              ? "#F59E0B"
                                                              : b.color || brandColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
