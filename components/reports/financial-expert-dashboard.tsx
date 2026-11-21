"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
    Activity,
    BrainCircuit,
    Calendar,
    ChevronDown,
    ChevronRight,
    Download,
    HelpCircle,
    LayoutDashboard,
    PieChart as PieChartIcon,
    Sparkles,
    Tags,
    Target,
    TrendingDown,
    TrendingUp,
    Wallet,
    X,
    Zap,
    AlertTriangle,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
    CheckCircle2,
    CalendarRange,
    ArrowUpRight,
    ArrowDownLeft,
    HandCoins,
    BarChart3,
    LineChart as LineChartIcon,
    Plus,
} from "lucide-react"
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts"
import { cn, formatAccountPillName } from "@/lib/utils"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useCategories } from "@/hooks/useCategories"
import { useAccounts } from "@/hooks/useAccounts"
import { Button } from "@/components/ui/button"
import { TransactionList } from "@/components/transactions/transaction-list"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

const PIE_PALETTE = [
    "#7C5CFC",
    "#F43F5E",
    "#10B981",
    "#F59E0B",
    "#38BDF8",
    "#EC4899",
    "#A855F7",
    "#14B8A6",
]

type AnalysisViewMode = "all" | "cashflow" | "rule" | "audit"
type ChartStyle = "area" | "bar"

export function ExpertFinancialDashboard() {
    const [period, setPeriod] = useState<string>("6m")
    const [selectedType, setSelectedType] = useState<string>("ALL")
    const [selectedAccount, setSelectedAccount] = useState<string>("ALL")
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
    const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<AnalysisViewMode>("all")
    const [chartStyle, setChartStyle] = useState<ChartStyle>("area")

    const { categories: categoriesData } = useCategories()
    const { accounts: accountsData } = useAccounts()
    const { currencyCode, isBalanceVisible } = useSettingsStore()
    const { formatMoney, formatCompactMoney } = useFormat()

    const money = (val: number) => (isBalanceVisible ? formatMoney(Number(val || 0)) : "••••••")

    const allCategoryOptions = useMemo(() => {
        if (!categoriesData) return []
        const raw = Array.isArray(categoriesData)
            ? categoriesData
            : categoriesData.all || [
                  ...(categoriesData.expense || []),
                  ...(categoriesData.income || []),
              ]
        const seen = new Set<string>()
        return raw.filter((c: any) => {
            if (!c?.id || seen.has(c.id)) return false
            seen.add(c.id)
            return true
        })
    }, [categoriesData])

    const { data, isLoading } = useQuery({
        queryKey: [
            "financial-health-expert",
            period,
            selectedType,
            selectedAccount,
            selectedCategory,
            currencyCode,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({
                type: selectedType,
                period,
                currency: currencyCode || "PEN",
            })
            if (selectedAccount !== "ALL") params.append("accounts", selectedAccount)
            if (selectedCategory !== "ALL") params.append("categories", selectedCategory)

            const res = await fetch(`/api/analytics/financial-health?${params.toString()}`)
            if (!res.ok) throw new Error("No se pudo cargar el análisis financiero")
            return res.json()
        },
    })

    const hasActiveFilters =
        period !== "6m" ||
        selectedType !== "ALL" ||
        selectedAccount !== "ALL" ||
        selectedCategory !== "ALL" ||
        Boolean(focusedCategoryId)

    const resetFilters = () => {
        setPeriod("6m")
        setSelectedType("ALL")
        setSelectedAccount("ALL")
        setSelectedCategory("ALL")
        setFocusedCategoryId(null)
    }

    const {
        range,
        kpis,
        comparison,
        insights = [],
        trend = [],
        categories = [],
        budgetRule,
        forecast,
        annualizedImpact = [],
        budgets = [],
        loans = [],
    } = data || {}

    const totalExpenseCategories = useMemo(
        () => categories.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0),
        [categories]
    )

    const focusedCategoryObj = useMemo(
        () => categories.find((c: any) => c.id === focusedCategoryId) || null,
        [categories, focusedCategoryId]
    )

    // Health Score status
    const healthScore = Math.round(kpis?.healthScore || 0)
    const hasActivity =
        (kpis?.transactionCount || 0) > 0 || (kpis?.totalLiquidity || 0) > 0

    const getHealthMeta = (s: number, active: boolean) => {
        if (!active) {
            return {
                label: "Sin datos",
                color: "text-muted-foreground",
                bg: "bg-muted/50",
                border: "border-border",
                bar: "bg-muted-foreground/40",
                icon: ShieldAlert,
                summary:
                    "Registra tu primera cuenta y movimientos para calcular tu índice de salud financiera.",
            }
        }
        if (s >= 80)
            return {
                label: "Óptimo",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/25",
                bar: "bg-emerald-500",
                icon: ShieldCheck,
                summary:
                    "Flujo de capital sólido, reserva de liquidez saludable y retención de ahorro superior al objetivo.",
            }
        if (s >= 60)
            return {
                label: "Saludable",
                color: "text-primary",
                bg: "bg-primary/10",
                border: "border-primary/25",
                bar: "bg-primary",
                icon: ShieldCheck,
                summary:
                    "Equilibrio financiero estable, con buen margen para seguir fortaleciendo tu fondo de emergencia.",
            }
        if (s >= 40)
            return {
                label: "Vulnerable",
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                border: "border-amber-500/25",
                bar: "bg-amber-500",
                icon: ShieldAlert,
                summary:
                    "Tu ritmo de gasto reduce tu margen de maniobra. Conviene moderar gastos variables este mes.",
            }
        return {
            label: "Crítico",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/25",
            bar: "bg-rose-500",
            icon: ShieldX,
            summary:
                "Riesgo de déficit o liquidez ajustada. Prioriza frenar fugas y proteger tu efectivo disponible.",
        }
    }
    const healthMeta = getHealthMeta(healthScore, hasActivity)
    const HealthIcon = healthMeta.icon

    // 50/30/20 Rules
    const ruleBlocks = useMemo(() => {
        if (!budgetRule) return []
        return [
            {
                id: "needs",
                name: "Necesidades",
                sub: "Gastos Fijos Indispensables",
                target: 50,
                percent: Math.round(budgetRule.needs?.percent || 0),
                amount: budgetRule.needs?.amount || 0,
                status: budgetRule.needs?.status,
                color: "#7C5CFC",
                description: "Vivienda, alimentación esencial, servicios básicos, salud y transporte.",
            },
            {
                id: "wants",
                name: "Deseos",
                sub: "Estilo de Vida y Ocio",
                target: 30,
                percent: Math.round(budgetRule.wants?.percent || 0),
                amount: budgetRule.wants?.amount || 0,
                status: budgetRule.wants?.status,
                color: "#F43F5E",
                description: "Restaurantes, compras discrecionales, suscripciones y entretenimiento.",
            },
            {
                id: "savings",
                name: "Ahorro y Libertad",
                sub: "Patrimonio y Amortización",
                target: 20,
                percent: Math.round(budgetRule.savings?.percent || 0),
                amount: budgetRule.savings?.amount || 0,
                status: budgetRule.savings?.status,
                color: "#10B981",
                description: "Excedente retenido, aportes a metas de ahorro, inversión y pago de deuda.",
            },
        ]
    }, [budgetRule])

    const expertAdvice = useMemo(() => {
        if (!budgetRule || !hasActivity) return null
        const needsPct = budgetRule.needs?.percent || 0
        const wantsPct = budgetRule.wants?.percent || 0
        const savingsPct = budgetRule.savings?.percent || 0

        if (savingsPct < 10) {
            return {
                title: "Prioridad: Construir tu colchón de liquidez",
                text: "Tu retención está por debajo del 10%. Reducir un 15% en suscripciones y compras no esenciales liberará flujo inmediato para tu fondo de emergencia.",
                tone: "alert",
            }
        }
        if (needsPct > 60) {
            return {
                title: "Costos fijos por encima del umbral recomendado",
                text: "Tus gastos indispensables superan el 60% de tus ingresos. Evalúa optimizar servicios recurrentes o renegociar compromisos fijos.",
                tone: "caution",
            }
        }
        if (wantsPct > 35) {
            return {
                title: "Gasto discrecional en zona de atención",
                text: "El estilo de vida y ocio superan el 35%. Definir un presupuesto mensual por categoría te ayudará a capturar mayor ahorro sin fricción.",
                tone: "caution",
            }
        }
        return {
            title: "Distribución financiera equilibrada",
            text: "Tus proporciones están alineadas con la regla 50/30/20. Mantén este ritmo para consolidar tus metas de ahorro e inversión.",
            tone: "positive",
        }
    }, [budgetRule, hasActivity])

    // Synchronized Drill-down transaction filter for TransactionList
    const drillDownFilters = useMemo(() => {
        const effectiveCat =
            focusedCategoryId || (selectedCategory !== "ALL" ? selectedCategory : null)
        return {
            categoryId: effectiveCat,
            categories: effectiveCat ? [effectiveCat] : [],
            accountId: selectedAccount !== "ALL" ? selectedAccount : null,
            type: selectedType !== "ALL" ? selectedType : null,
            startDate: range?.startDate || null,
            endDate: range?.endDate || null,
        }
    }, [focusedCategoryId, selectedCategory, selectedAccount, selectedType, range])

    const periodLabels: Record<string, string> = {
        this_month: "Este mes",
        "1m": "Últimos 30 días",
        "3m": "Últimos 3 meses",
        "6m": "Últimos 6 meses",
        "12m": "Último año",
    }

    const typeLabels: Record<string, string> = {
        ALL: "Ingresos y Gastos",
        INCOME: "Solo Ingresos",
        EXPENSE: "Solo Gastos",
    }

    const handleSelectCategoryForAudit = (catId: string) => {
        const nextId = focusedCategoryId === catId ? null : catId
        setFocusedCategoryId(nextId)
        if (nextId) {
            if (viewMode === "rule") {
                setViewMode("audit")
            } else {
                setTimeout(() => {
                    document.getElementById("audit-drilldown")?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    })
                }, 60)
            }
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-20 rounded-3xl bg-muted/60" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 rounded-3xl bg-muted/40" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-5 h-64 rounded-3xl bg-muted/40" />
                    <div className="lg:col-span-7 h-64 rounded-3xl bg-muted/40" />
                </div>
                <div className="h-80 rounded-3xl bg-muted/30" />
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className="space-y-6 pb-20 animate-in fade-in duration-300">
                {/* 1. HEADER + PREMIUM FILTER PILLS */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="h-9 w-9 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shadow-xs">
                                <BrainCircuit className="h-4.5 w-4.5" />
                            </span>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                                    Análisis Financiero
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    Diagnóstico de liquidez, anatomía de gastos, regla 50/30/20 y auditoría interactiva
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Pills Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Period Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full h-9 px-3.5 text-xs font-bold gap-1.5 border-border/80 bg-card hover:bg-muted cursor-pointer"
                                >
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                    <span>{periodLabels[period] || period}</span>
                                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl p-1.5 w-48 z-[100]">
                                {Object.entries(periodLabels).map(([key, label]) => (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() => setPeriod(key)}
                                        className={cn(
                                            "rounded-xl text-xs font-semibold cursor-pointer",
                                            period === key && "bg-primary text-primary-foreground font-bold"
                                        )}
                                    >
                                        {label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Type Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full h-9 px-3.5 text-xs font-bold gap-1.5 border-border/80 bg-card hover:bg-muted cursor-pointer"
                                >
                                    <Activity className="h-3.5 w-3.5 text-primary" />
                                    <span>{typeLabels[selectedType] || selectedType}</span>
                                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-2xl p-1.5 w-44 z-[100]">
                                {Object.entries(typeLabels).map(([key, label]) => (
                                    <DropdownMenuItem
                                        key={key}
                                        onClick={() => setSelectedType(key)}
                                        className={cn(
                                            "rounded-xl text-xs font-semibold cursor-pointer",
                                            selectedType === key && "bg-primary text-primary-foreground font-bold"
                                        )}
                                    >
                                        {label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Account Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full h-9 px-3.5 text-xs font-bold gap-1.5 border-border/80 bg-card hover:bg-muted max-w-[180px] cursor-pointer"
                                >
                                    <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate">
                                        {selectedAccount === "ALL"
                                            ? "Todas las cuentas"
                                            : accountsData?.find((a: any) => a.id === selectedAccount)?.name ||
                                              "Cuenta"}
                                    </span>
                                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="rounded-2xl p-1.5 w-56 max-h-64 overflow-y-auto z-[100]"
                            >
                                <DropdownMenuItem
                                    onClick={() => setSelectedAccount("ALL")}
                                    className={cn(
                                        "rounded-xl text-xs font-semibold cursor-pointer",
                                        selectedAccount === "ALL" &&
                                            "bg-primary text-primary-foreground font-bold"
                                    )}
                                >
                                    Todas las cuentas
                                </DropdownMenuItem>
                                {accountsData?.map((acc: any) => (
                                    <DropdownMenuItem
                                        key={acc.id}
                                        onClick={() => setSelectedAccount(acc.id)}
                                        className={cn(
                                            "rounded-xl text-xs font-semibold cursor-pointer",
                                            selectedAccount === acc.id &&
                                                "bg-primary text-primary-foreground font-bold"
                                        )}
                                    >
                                        {formatAccountPillName(acc.name, acc.currencyCode)}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Category Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full h-9 px-3.5 text-xs font-bold gap-1.5 border-border/80 bg-card hover:bg-muted max-w-[180px] cursor-pointer"
                                >
                                    <Tags className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span className="truncate">
                                        {selectedCategory === "ALL"
                                            ? "Todas las categorías"
                                            : allCategoryOptions.find((c: any) => c.id === selectedCategory)
                                                  ?.name || "Categoría"}
                                    </span>
                                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="rounded-2xl p-1.5 w-56 max-h-64 overflow-y-auto z-[100]"
                            >
                                <DropdownMenuItem
                                    onClick={() => {
                                        setSelectedCategory("ALL")
                                        setFocusedCategoryId(null)
                                    }}
                                    className={cn(
                                        "rounded-xl text-xs font-semibold cursor-pointer",
                                        selectedCategory === "ALL" &&
                                            "bg-primary text-primary-foreground font-bold"
                                    )}
                                >
                                    Todas las categorías
                                </DropdownMenuItem>
                                {allCategoryOptions.map((cat: any) => (
                                    <DropdownMenuItem
                                        key={cat.id}
                                        onClick={() => {
                                            setSelectedCategory(cat.id)
                                            setFocusedCategoryId(null)
                                        }}
                                        className={cn(
                                            "rounded-xl text-xs font-semibold cursor-pointer",
                                            selectedCategory === cat.id &&
                                                "bg-primary text-primary-foreground font-bold"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <span
                                                className="h-2 w-2 rounded-full shrink-0"
                                                style={{ backgroundColor: cat.color || "#7C5CFC" }}
                                            />
                                            <span className="truncate">{cat.name}</span>
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="rounded-full h-9 px-3 text-xs font-bold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Limpiar
                            </Button>
                        )}

                        <Link href="/dashboard/reports">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-full h-9 px-3.5 text-xs font-bold gap-1.5 cursor-pointer"
                            >
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Exportar</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* VIEW LENS TABS */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 overflow-x-auto no-scrollbar">
                    <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/60 border border-border/60">
                        {(
                            [
                                { id: "all", label: "Resumen Ejecutivo" },
                                { id: "cashflow", label: "Flujo y Gastos" },
                                { id: "rule", label: "Regla 50/30/20 y Control" },
                                { id: "audit", label: "Auditoría de Movimientos" },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setViewMode(tab.id)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                                    viewMode === tab.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                        <span>{kpis?.transactionCount || 0} movimientos analizados</span>
                        <span>·</span>
                        <span>Moneda base: {currencyCode || "PEN"}</span>
                    </span>
                </div>

                {/* DYNAMIC TAB CONTENT CONTAINER */}
                <div
                    key={viewMode}
                    className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                {/* 2. PERIOD CASHFLOW SUMMARY STRIP (4 HIGH-CLARITY CARDS) — Exclusive to Resumen Ejecutivo ("all") */}
                {viewMode === "all" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Ingresos del periodo */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between border border-border/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Ingresos ({periodLabels[period]})
                            </span>
                            <span className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <p className="text-2xl font-black text-foreground tabular-nums">
                                {money(kpis?.income || 0)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span
                                    className={cn(
                                        "text-[11px] font-bold",
                                        (comparison?.incomeChange || 0) >= 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-rose-500"
                                    )}
                                >
                                    {(comparison?.incomeChange || 0) >= 0 ? "+" : ""}
                                    {Math.round(comparison?.incomeChange || 0)}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    este mes vs. anterior
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Gastos del periodo */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between border border-border/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Gastos ({periodLabels[period]})
                            </span>
                            <span className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <p className="text-2xl font-black text-foreground tabular-nums">
                                {money(kpis?.expense || 0)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span
                                    className={cn(
                                        "text-[11px] font-bold",
                                        (comparison?.expenseChange || 0) <= 0
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-rose-500"
                                    )}
                                >
                                    {(comparison?.expenseChange || 0) > 0 ? "+" : ""}
                                    {Math.round(comparison?.expenseChange || 0)}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    este mes vs. anterior
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Balance / Flujo Neto */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between border border-border/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Balance Neto del Periodo
                            </span>
                            <span
                                className={cn(
                                    "h-7 w-7 rounded-xl flex items-center justify-center",
                                    (kpis?.netCashFlow || 0) >= 0
                                        ? "bg-primary/10 text-primary"
                                        : "bg-rose-500/10 text-rose-500"
                                )}
                            >
                                <Activity className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <p
                                className={cn(
                                    "text-2xl font-black tabular-nums",
                                    (kpis?.netCashFlow || 0) >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-500"
                                )}
                            >
                                {(kpis?.netCashFlow || 0) > 0 ? "+" : ""}
                                {money(kpis?.netCashFlow || 0)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                {(kpis?.netCashFlow || 0) >= 0
                                    ? "Superávit acumulado en el rango"
                                    : "Déficit acumulado en el rango"}
                            </p>
                        </div>
                    </div>

                    {/* Liquidez vs Deuda */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between border border-border/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Liquidez Disponible
                            </span>
                            <span className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Wallet className="h-4 w-4" />
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <p className="text-2xl font-black text-foreground tabular-nums">
                                {money(kpis?.totalLiquidity || 0)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">
                                Pasivos / Tarjetas:{" "}
                                <span className="font-bold text-rose-500">
                                    {money(kpis?.liabilities || 0)}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                )}

                {/* 3. EXECUTIVE HEALTH & STRATEGIC KPIS — Exclusive to Resumen Ejecutivo ("all") */}
                {viewMode === "all" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* Health Score Card */}
                        <div className="lg:col-span-5 card-modern p-6 flex flex-col justify-between relative overflow-hidden border border-border/60">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Índice Ejecutivo
                                    </span>
                                    <h3 className="text-lg font-black text-foreground mt-0.5">
                                        Salud Financiera General
                                    </h3>
                                </div>
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                                        healthMeta.color,
                                        healthMeta.bg,
                                        healthMeta.border
                                    )}
                                >
                                    <HealthIcon className="h-3.5 w-3.5" />
                                    {healthMeta.label}
                                </span>
                            </div>

                            <div className="my-5 flex items-baseline gap-2">
                                <span
                                    className={cn(
                                        "text-6xl font-black tracking-tighter tabular-nums leading-none",
                                        healthMeta.color
                                    )}
                                >
                                    {healthScore}
                                </span>
                                <span className="text-2xl font-bold text-muted-foreground/40">
                                    / 100
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-700",
                                            healthMeta.bar
                                        )}
                                        style={{ width: `${Math.max(4, healthScore)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {healthMeta.summary}
                                </p>
                            </div>
                        </div>

                        {/* Strategic KPIs (Runway + Burn Rate + Retention) */}
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Runway */}
                            <div className="card-modern p-5 flex flex-col justify-between border border-border/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Runway (Oxígeno)
                                    </span>
                                    <UITooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                aria-label="Qué es Runway"
                                                className="text-muted-foreground/60 hover:text-foreground"
                                            >
                                                <HelpCircle className="h-3.5 w-3.5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="rounded-xl text-xs max-w-xs">
                                            Cuántos meses podrías cubrir tu nivel de gasto actual usando únicamente tu liquidez disponible.
                                        </TooltipContent>
                                    </UITooltip>
                                </div>
                                <div className="my-3">
                                    <p className="text-3xl font-black text-foreground tabular-nums">
                                        {kpis?.runwayMonths ?? 0}
                                        <span className="text-sm font-semibold text-muted-foreground ml-1">
                                            meses
                                        </span>
                                    </p>
                                    <p className="text-[11px] font-semibold text-primary mt-1">
                                        Meta ideal: 6 meses
                                    </p>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, ((kpis?.runwayMonths || 0) / 6) * 100)}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Gasto Diario (Burn Rate) */}
                            <div className="card-modern p-5 flex flex-col justify-between border border-border/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Ritmo de Gasto
                                    </span>
                                    <Zap className="h-4 w-4 text-amber-500" />
                                </div>
                                <div className="my-3">
                                    <p className="text-3xl font-black text-foreground tabular-nums">
                                        {money(kpis?.burnRate || 0)}
                                    </p>
                                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                                        Promedio por día ({range?.days || 30}d)
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    Proyección cierre de mes:{" "}
                                    <strong className="text-foreground">
                                        {money(forecast?.predictedMonthEndExpense || 0)}
                                    </strong>
                                </span>
                            </div>

                            {/* Tasa de Retención */}
                            <div className="card-modern p-5 flex flex-col justify-between border border-border/60">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Tasa de Retención
                                    </span>
                                    <Target className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="my-3">
                                    <p
                                        className={cn(
                                            "text-3xl font-black tabular-nums",
                                            (kpis?.savingsRate || 0) >= 20
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : (kpis?.savingsRate || 0) < 0
                                                  ? "text-rose-500"
                                                  : "text-foreground"
                                        )}
                                    >
                                        {Math.round(kpis?.savingsRate || 0)}%
                                    </p>
                                    <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                                        Ahorro anual est.:{" "}
                                        <span className="text-foreground">
                                            {money(forecast?.estimatedYearlySavings || 0)}
                                        </span>
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    Estándar recomendado: 20%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. INSIGHTS ADVISOR — Exclusive to Resumen Ejecutivo ("all") */}
                {viewMode === "all" && insights.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Diagnóstico y Alertas Inteligentes
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {insights.map((ins: any, idx: number) => {
                                const isDanger = ins.type === "DANGER" || ins.type === "WARNING"
                                const isSuccess = ins.type === "SUCCESS"
                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "card-modern p-4 flex items-start gap-3 border transition-all",
                                            isDanger && "border-rose-500/30 bg-rose-500/5",
                                            isSuccess && "border-emerald-500/30 bg-emerald-500/5",
                                            !isDanger && !isSuccess && "border-border/60"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "p-2 rounded-xl shrink-0 mt-0.5",
                                                isDanger && "bg-rose-500/10 text-rose-500",
                                                isSuccess && "bg-emerald-500/10 text-emerald-500",
                                                !isDanger && !isSuccess && "bg-primary/10 text-primary"
                                            )}
                                        >
                                            {isDanger ? (
                                                <AlertTriangle className="h-4 w-4" />
                                            ) : isSuccess ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                <Zap className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            {ins.title && (
                                                <p className="text-xs font-extrabold text-foreground leading-snug">
                                                    {ins.title}
                                                </p>
                                            )}
                                            <p
                                                className={cn(
                                                    "text-xs leading-relaxed",
                                                    ins.title
                                                        ? "text-muted-foreground mt-0.5"
                                                        : "font-bold text-foreground"
                                                )}
                                            >
                                                {ins.message}
                                            </p>
                                            <span
                                                className={cn(
                                                    "inline-block mt-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                                                    ins.impact === "ALTO" || ins.impact === "CRÍTICO"
                                                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                                        : isSuccess
                                                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                          : "bg-primary/10 text-primary"
                                                )}
                                            >
                                                Impacto {ins.impact || "Estratégico"}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 5. MAIN CHARTS: CASH FLOW EVOLUTION + INTERACTIVE EXPENSE ANATOMY */}
                {(viewMode === "all" || viewMode === "cashflow") && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* Left Chart: Evolución de Capital (Area / Bar toggle) */}
                        <div className="lg:col-span-7 card-modern p-5 sm:p-6 flex flex-col justify-between border border-border/60">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-base font-extrabold text-foreground">
                                        Evolución de Ingresos vs. Gastos
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Comportamiento mensual comparativo en {currencyCode || "PEN"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
                                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            Ingresos
                                        </span>
                                        <span className="flex items-center gap-1.5 text-rose-500">
                                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                                            Gastos
                                        </span>
                                    </div>
                                    <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/50">
                                        <button
                                            type="button"
                                            onClick={() => setChartStyle("area")}
                                            title="Vista de área"
                                            className={cn(
                                                "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                                                chartStyle === "area"
                                                    ? "bg-card text-primary shadow-xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <LineChartIcon className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartStyle("bar")}
                                            title="Vista de barras"
                                            className={cn(
                                                "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                                                chartStyle === "bar"
                                                    ? "bg-card text-primary shadow-xs"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <BarChart3 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-64 sm:h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartStyle === "area" ? (
                                        <AreaChart data={trend}>
                                            <defs>
                                                <linearGradient id="incArea" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="expArea" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.32} />
                                                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                                stroke="var(--border)"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                width={48}
                                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                                tickFormatter={(v) =>
                                                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                                                }
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
                                            <Area
                                                type="monotone"
                                                dataKey="income"
                                                name="Ingresos"
                                                stroke="#10B981"
                                                strokeWidth={2.5}
                                                fill="url(#incArea)"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="expense"
                                                name="Gastos"
                                                stroke="#F43F5E"
                                                strokeWidth={2.5}
                                                fill="url(#expArea)"
                                            />
                                        </AreaChart>
                                    ) : (
                                        <BarChart data={trend} barGap={6}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                                stroke="var(--border)"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                width={48}
                                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                                                tickFormatter={(v) =>
                                                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                                                }
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
                                            <Bar
                                                dataKey="income"
                                                name="Ingresos"
                                                fill="#10B981"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={28}
                                            />
                                            <Bar
                                                dataKey="expense"
                                                name="Gastos"
                                                fill="#F43F5E"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={28}
                                            />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Right Chart: Anatomía de Gastos con Total Central y Barras de % */}
                        <div className="lg:col-span-5 card-modern p-5 sm:p-6 flex flex-col justify-between border border-border/60">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-base font-extrabold text-foreground">
                                        Anatomía de Gastos
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Toca cualquier categoría para auditar sus movimientos
                                    </p>
                                </div>
                                {focusedCategoryId ? (
                                    <button
                                        type="button"
                                        onClick={() => setFocusedCategoryId(null)}
                                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        Ver todas
                                    </button>
                                ) : (
                                    <PieChartIcon className="h-5 w-5 text-primary opacity-60" />
                                )}
                            </div>

                            {categories.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center space-y-2">
                                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                                        <PieChartIcon className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm font-bold text-foreground">
                                        Sin gastos en este periodo
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-xs">
                                        Cambia el rango de fechas o registra un gasto para visualizar la distribución por categoría.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="relative h-52 w-full flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categories}
                                                    dataKey="amount"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={56}
                                                    outerRadius={82}
                                                    paddingAngle={3}
                                                    onClick={(entry: any) => {
                                                        if (entry?.id) {
                                                            handleSelectCategoryForAudit(entry.id)
                                                        }
                                                    }}
                                                    className="cursor-pointer outline-none"
                                                >
                                                    {categories.map((entry: any, idx: number) => {
                                                        const isDimmed =
                                                            Boolean(focusedCategoryId) &&
                                                            focusedCategoryId !== entry.id
                                                        return (
                                                            <Cell
                                                                key={entry.id || idx}
                                                                fill={
                                                                    entry.color ||
                                                                    PIE_PALETTE[idx % PIE_PALETTE.length]
                                                                }
                                                                opacity={isDimmed ? 0.3 : 1}
                                                                stroke="transparent"
                                                            />
                                                        )
                                                    })}
                                                </Pie>
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
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Center Summary inside Donut */}
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[115px]">
                                                {focusedCategoryObj
                                                    ? focusedCategoryObj.name
                                                    : "Total Gastos"}
                                            </span>
                                            <span className="text-sm sm:text-base font-black text-foreground tabular-nums mt-0.5">
                                                {isBalanceVisible
                                                    ? formatCompactMoney(
                                                          focusedCategoryObj
                                                              ? focusedCategoryObj.amount
                                                              : totalExpenseCategories
                                                      )
                                                    : "••••"}
                                            </span>
                                            {focusedCategoryObj && (
                                                <span className="text-[10px] font-bold text-primary">
                                                    {focusedCategoryObj.percent}% del total
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Interactive Category Breakdown List with % and progress bars */}
                                    <div className="space-y-1.5 pt-2 border-t border-border/50 max-h-48 overflow-y-auto pr-1">
                                        {categories.slice(0, 6).map((cat: any, idx: number) => {
                                            const active = focusedCategoryId === cat.id
                                            const color =
                                                cat.color || PIE_PALETTE[idx % PIE_PALETTE.length]
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => handleSelectCategoryForAudit(cat.id)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between gap-2 p-2 rounded-xl transition-all text-left cursor-pointer",
                                                        active
                                                            ? "bg-primary/12 ring-1 ring-primary/30"
                                                            : "hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        <span className="text-xs font-bold text-foreground truncate">
                                                            {cat.name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                                                            ({cat.count || 1})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
                                                            {cat.percent}%
                                                        </span>
                                                        <span className="text-xs font-black tabular-nums text-foreground">
                                                            {money(cat.amount)}
                                                        </span>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* 6. 50/30/20 RULE & ANNUALIZED LEAKS & OPERATIONAL CONTROL */}
                {(viewMode === "all" || viewMode === "rule" || viewMode === "cashflow") && (
                    <>
                        {budgetRule && (viewMode === "all" || viewMode === "rule") && (
                            <div className="card-modern p-5 sm:p-7 space-y-6 border border-border/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Metodología de Distribución
                                        </span>
                                        <h3 className="text-lg font-black text-foreground">
                                            La Regla de Oro 50 / 30 / 20
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Equilibrio real de tus ingresos en el periodo seleccionado
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full w-fit">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Diagnóstico 50/30/20
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {ruleBlocks.map((block) => {
                                        const isWarning = block.status === "WARNING"
                                        return (
                                            <div
                                                key={block.id}
                                                className="rounded-2xl border border-border/70 p-4 bg-muted/20 flex flex-col justify-between space-y-3"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            {block.sub}
                                                        </p>
                                                        <h4 className="text-base font-black text-foreground">
                                                            {block.name}
                                                        </h4>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-xs font-black px-2.5 py-0.5 rounded-full",
                                                            isWarning
                                                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        )}
                                                    >
                                                        {block.percent}% / {block.target}%
                                                    </span>
                                                </div>

                                                <div>
                                                    <p className="text-xl font-black text-foreground tabular-nums">
                                                        {money(block.amount)}
                                                    </p>
                                                    <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{
                                                                width: `${Math.min(100, (block.percent / Math.max(1, block.target)) * 100)}%`,
                                                                backgroundColor: block.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                    {block.description}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>

                                {expertAdvice && (
                                    <div className="rounded-2xl bg-primary/8 border border-primary/20 p-4 flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0 mt-0.5">
                                            <BrainCircuit className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-bold text-foreground">
                                                {expertAdvice.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {expertAdvice.text}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Annualized Leaks */}
                            <div className="lg:col-span-6 card-modern p-5 sm:p-6 space-y-4 border border-border/60">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarRange className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-extrabold text-foreground">
                                            Impacto Anualizado por Categoría (x12)
                                        </h3>
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground">
                                        Ritmo mensual × 12
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Cuánto representa al año mantener el ritmo mensual actual de tus principales categorías de gasto.
                                </p>

                                {annualizedImpact.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                        Aún no hay gastos categorizados en este rango para proyectar impacto anual.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {annualizedImpact.map((item: any, i: number) => (
                                            <button
                                                key={item.id || i}
                                                type="button"
                                                onClick={() =>
                                                    item.id && handleSelectCategoryForAudit(item.id)
                                                }
                                                className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex flex-col justify-between space-y-2 text-left transition-all cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground truncate">
                                                        {item.name}
                                                    </span>
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-foreground tabular-nums">
                                                        {money(Math.round(item.yearly))}{" "}
                                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                                            / año
                                                        </span>
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground font-semibold">
                                                        {money(Math.round(item.monthly))} promedio / mes
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Operational Control: Budgets + Loans */}
                            <div className="lg:col-span-6 flex flex-col gap-4">
                                {/* Budgets Card */}
                                <div className="card-modern p-5 flex flex-col justify-between border border-border/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                                            <PieChartIcon className="h-4 w-4 text-primary" />
                                            Presupuestos del Mes Actual
                                        </h3>
                                        <Link
                                            href="/dashboard/budgets"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                        >
                                            <span>Gestionar</span>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                    <div className="space-y-3">
                                        {budgets.slice(0, 3).map((b: any) => (
                                            <div key={b.id} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs font-bold">
                                                    <span className="truncate text-foreground">
                                                        {b.name}
                                                    </span>
                                                    <span className="tabular-nums text-muted-foreground">
                                                        {money(b.spent)} / {money(b.amount)} (
                                                        {Math.round(b.percent)}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            b.percent >= 100
                                                                ? "bg-rose-500"
                                                                : b.percent >= 80
                                                                  ? "bg-amber-500"
                                                                  : "bg-primary"
                                                        )}
                                                        style={{ width: `${Math.min(100, b.percent)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {budgets.length === 0 && (
                                            <div className="flex items-center justify-between rounded-2xl border border-dashed border-border p-3.5 text-xs">
                                                <span className="text-muted-foreground">
                                                    No tienes presupuestos activos este mes.
                                                </span>
                                                <Link
                                                    href="/dashboard/budgets"
                                                    className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Crear
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Loans Card (Receivables & Payables) */}
                                <div className="card-modern p-5 flex flex-col justify-between border border-border/60">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                                            <HandCoins className="h-4 w-4 text-primary" />
                                            Préstamos y Cuentas Pendientes
                                        </h3>
                                        <Link
                                            href="/dashboard/loans"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                        >
                                            <span>{loans.length} activos</span>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <ArrowDownLeft className="h-3 w-3" /> Por Cobrar
                                            </span>
                                            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                                                {money(kpis?.totalReceivable || 0)}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                            <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                <ArrowUpRight className="h-3 w-3" /> Por Pagar
                                            </span>
                                            <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-1">
                                                {money(kpis?.totalPayable || 0)}
                                            </p>
                                        </div>
                                    </div>
                                    {loans.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5">
                                            {loans.slice(0, 2).map((l: any) => (
                                                <div
                                                    key={l.id}
                                                    className="flex items-center justify-between text-xs"
                                                >
                                                    <span className="font-semibold text-foreground truncate">
                                                        {l.person}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "font-black tabular-nums",
                                                            l.type === "LENT"
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : "text-rose-500"
                                                        )}
                                                    >
                                                        {l.type === "LENT" ? "Te debe " : "Debes "}
                                                        {money(l.remaining)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 7. DRILL-DOWN AUDIT SECTION */}
                {(viewMode === "all" || viewMode === "cashflow" || viewMode === "audit") && (
                    <div
                        id="audit-drilldown"
                        className="card-modern p-5 sm:p-7 space-y-5 scroll-mt-24 border border-border/60"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <LayoutDashboard className="h-5 w-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-foreground">
                                        Auditoría de Movimientos ({periodLabels[period]})
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {focusedCategoryObj
                                            ? `Mostrando categoría: ${focusedCategoryObj.name} (${money(focusedCategoryObj.amount)} · ${focusedCategoryObj.percent}%)`
                                            : "Selecciona cualquier categoría o filtro superior para auditar sus movimientos al detalle"}
                                    </p>
                                </div>
                            </div>

                            {focusedCategoryId && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setFocusedCategoryId(null)}
                                    className="rounded-full text-xs font-bold cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Quitar filtro de categoría
                                </Button>
                            )}
                        </div>

                        {/* Chips selector */}
                        {categories.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setFocusedCategoryId(null)}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer",
                                        !focusedCategoryId
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Todas las categorías
                                </button>
                                {categories.map((cat: any, idx: number) => {
                                    const active = focusedCategoryId === cat.id
                                    const color =
                                        cat.color || PIE_PALETTE[idx % PIE_PALETTE.length]
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() =>
                                                setFocusedCategoryId(active ? null : cat.id)
                                            }
                                            className={cn(
                                                "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                                                active
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
                                            )}
                                        >
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span>{cat.name}</span>
                                            <span className="opacity-75 tabular-nums">
                                                ({isBalanceVisible ? formatCompactMoney(cat.amount) : "•••"})
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Transaction list container */}
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-2 sm:p-4">
                            <TransactionList
                                overrideFilters={drillDownFilters}
                                hideMonthSelector={true}
                            />
                        </div>
                    </div>
                )}
                </div>
            </div>
        </TooltipProvider>
    )
}
