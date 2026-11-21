"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import {
    Calculator,
    CreditCard,
    Settings,
    PlusCircle,
    BarChart3,
    ArrowRightLeft,
    Search,
    User,
    Palette,
    Sparkles,
    LayoutDashboard,
    HandCoins,
    Target,
    Wallet,
    TrendingDown,
    TrendingUp,
    FileSpreadsheet,
    Moon,
    Sun,
    Eye,
    EyeOff,
    X,
    Loader2,
    ArrowUpRight,
    PieChart,
    Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { parseSmartQuery, normalizeText } from "@/lib/search-parser"
import { useAccounts } from "@/hooks/useAccounts"
import { useBudget } from "@/hooks/useBudget"
import { useSavingsGoals } from "@/hooks/useSavingsGoals"
import { useLoans } from "@/hooks/useLoans"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { formatAccountPillName, cn } from "@/lib/utils"

type SearchScope = "all" | "transactions" | "accounts" | "modules" | "actions"

const SCOPE_TABS: Array<{ id: SearchScope; label: string }> = [
    { id: "all", label: "Todo" },
    { id: "transactions", label: "Movimientos" },
    { id: "accounts", label: "Cuentas" },
    { id: "modules", label: "Módulos" },
    { id: "actions", label: "Acciones" },
]

const SYSTEM_MODULES = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Inicio", desc: "Resumen general y KPIs" },
    { href: "/dashboard/transactions", icon: ArrowRightLeft, label: "Movimientos", desc: "Historial de ingresos y gastos" },
    { href: "/dashboard/accounts", icon: Wallet, label: "Mis cuentas", desc: "Bancos, efectivo y tarjetas" },
    { href: "/dashboard/budgets", icon: PieChart, label: "Presupuestos", desc: "Límites mensuales por categoría" },
    { href: "/dashboard/loans", icon: HandCoins, label: "Préstamos", desc: "Por cobrar y por pagar" },
    { href: "/dashboard/planning", icon: Sparkles, label: "Planificación", desc: "Presupuesto Base Cero (ZBB)" },
    { href: "/dashboard/savings-goals", icon: Target, label: "Metas de ahorro", desc: "Objetivos y progreso" },
    { href: "/dashboard/analysis", icon: BarChart3, label: "Análisis", desc: "Gráficos y salud financiera" },
    { href: "/dashboard/reports", icon: FileSpreadsheet, label: "Reportes", desc: "Exportar a Excel y PDF" },
    { href: "/dashboard/settings", icon: Settings, label: "Ajustes", desc: "Tema, moneda y perfil" },
]

interface CommandSearchContentProps {
    query: string
    onQueryChange: (q: string) => void
    onSelectAndClose: (fn: () => void) => void
}

function CommandSearchContent({
    query,
    onQueryChange,
    onSelectAndClose,
}: CommandSearchContentProps) {
    const router = useRouter()
    const { theme, resolvedTheme, setTheme } = useTheme()
    const { accounts } = useAccounts()
    const { budgets } = useBudget()
    const { data: goals } = useSavingsGoals()
    const { loans } = useLoans()
    const { formatMoney } = useFormat()
    const { isBalanceVisible, setIsBalanceVisible } = useSettingsStore()

    const [scope, setScope] = React.useState<SearchScope>("all")
    const [txResults, setTxResults] = React.useState<any[]>([])
    const [txLoading, setTxLoading] = React.useState(false)

    // Debounced live transaction search when query >= 2 chars
    React.useEffect(() => {
        const trimmed = query.trim()
        if (trimmed.length < 2) {
            setTxResults([])
            setTxLoading(false)
            return
        }

        const controller = new AbortController()
        setTxLoading(true)

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/transactions?search=${encodeURIComponent(trimmed)}&limit=6`,
                    { signal: controller.signal }
                )
                if (res.ok) {
                    const json = await res.json()
                    setTxResults(Array.isArray(json?.data) ? json.data : [])
                } else {
                    setTxResults([])
                }
            } catch (err: any) {
                if (err?.name !== "AbortError") {
                    setTxResults([])
                }
            } finally {
                if (!controller.signal.aborted) {
                    setTxLoading(false)
                }
            }
        }, 200)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [query])

    const qNorm = normalizeText(query)
    const isDark = (resolvedTheme || theme) === "dark"

    const smartMatches = React.useMemo(() => {
        if (query.trim().length < 2) return []
        return parseSmartQuery(query)
    }, [query])

    const quickActions = React.useMemo(() => {
        const items = [
            {
                id: "qa-expense",
                label: "Nuevo Gasto",
                subtitle: "Registrar una salida de dinero",
                icon: TrendingDown,
                iconCls: "bg-rose-500/12 text-rose-500",
                shortcut: "G",
                keywords: "nuevo gasto salida compra egreso",
                onRun: () => router.push("/dashboard/transactions/new?type=EXPENSE"),
            },
            {
                id: "qa-income",
                label: "Nuevo Ingreso",
                subtitle: "Registrar una entrada de dinero",
                icon: TrendingUp,
                iconCls: "bg-emerald-500/12 text-emerald-500",
                shortcut: "I",
                keywords: "nuevo ingreso sueldo entrada cobro",
                onRun: () => router.push("/dashboard/transactions/new?type=INCOME"),
            },
            {
                id: "qa-transfer",
                label: "Transferir / Pagar Tarjeta",
                subtitle: "Mover saldo entre cuentas o abonar tarjeta",
                icon: ArrowRightLeft,
                iconCls: "bg-indigo-500/12 text-indigo-500",
                shortcut: "T",
                keywords: "transferir pagar tarjeta movimiento entre cuentas",
                onRun: () => router.push("/dashboard/transactions/new?type=TRANSFER"),
            },
            {
                id: "qa-goal",
                label: "Nueva Meta de Ahorro",
                subtitle: "Crear un objetivo financiero",
                icon: Target,
                iconCls: "bg-amber-500/12 text-amber-500",
                shortcut: undefined,
                keywords: "nueva meta ahorro objetivo",
                onRun: () => router.push("/dashboard/savings-goals/new"),
            },
            {
                id: "qa-reports",
                label: "Exportar Reporte (Excel / PDF)",
                subtitle: "Descargar informe financiero personalizado",
                icon: FileSpreadsheet,
                iconCls: "bg-primary/12 text-primary",
                shortcut: undefined,
                keywords: "exportar reporte excel pdf descargar",
                onRun: () => router.push("/dashboard/reports"),
            },
            {
                id: "qa-theme",
                label: isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
                subtitle: "Alternar apariencia visual de la app",
                icon: isDark ? Sun : Moon,
                iconCls: "bg-muted text-foreground",
                shortcut: undefined,
                keywords: "modo oscuro claro tema apariencia",
                onRun: () => setTheme(isDark ? "light" : "dark"),
            },
            {
                id: "qa-privacy",
                label: isBalanceVisible ? "Ocultar montos" : "Mostrar montos",
                subtitle: "Modo privacidad para saldos y cifras",
                icon: isBalanceVisible ? EyeOff : Eye,
                iconCls: "bg-muted text-foreground",
                shortcut: undefined,
                keywords: "ocultar mostrar montos saldos privacidad",
                onRun: () => setIsBalanceVisible(!isBalanceVisible),
            },
        ]

        if (!qNorm) return items
        return items.filter(
            (it) =>
                normalizeText(it.label).includes(qNorm) ||
                normalizeText(it.keywords).includes(qNorm)
        )
    }, [qNorm, isDark, isBalanceVisible, router, setTheme, setIsBalanceVisible])

    const filteredAccounts = React.useMemo(() => {
        const list = accounts || []
        if (!qNorm) return list.slice(0, 5)
        return list
            .filter(
                (a: any) =>
                    normalizeText(a.name || "").includes(qNorm) ||
                    normalizeText(a.currencyCode || "").includes(qNorm) ||
                    (qNorm.includes("tarjeta") && a.accountType === "CREDIT_CARD")
            )
            .slice(0, 6)
    }, [accounts, qNorm])

    const filteredBudgets = React.useMemo(() => {
        if (!qNorm) return []
        return (budgets || [])
            .filter((b: any) => normalizeText(b.name || "").includes(qNorm))
            .slice(0, 4)
    }, [budgets, qNorm])

    const filteredGoals = React.useMemo(() => {
        if (!qNorm) return []
        return (goals || [])
            .filter((g: any) => normalizeText(g.name || "").includes(qNorm))
            .slice(0, 4)
    }, [goals, qNorm])

    const filteredLoans = React.useMemo(() => {
        if (!qNorm) return []
        return (loans || [])
            .filter(
                (l: any) =>
                    normalizeText(l.personName || "").includes(qNorm) ||
                    normalizeText(l.description || "").includes(qNorm)
            )
            .slice(0, 4)
    }, [loans, qNorm])

    const filteredModules = React.useMemo(() => {
        if (!qNorm) return SYSTEM_MODULES
        return SYSTEM_MODULES.filter(
            (m) =>
                normalizeText(m.label).includes(qNorm) ||
                normalizeText(m.desc).includes(qNorm)
        )
    }, [qNorm])

    const filteredSettings = React.useMemo(() => {
        const list = [
            { href: "/dashboard/settings", icon: Settings, label: "Ajustes Generales" },
            { href: "/dashboard/settings?tab=appearance", icon: Palette, label: "Color y Apariencia" },
            { href: "/dashboard/settings?tab=data", icon: User, label: "Mi Perfil y Moneda" },
        ]
        if (!qNorm) return []
        return list.filter((s) => normalizeText(s.label).includes(qNorm))
    }, [qNorm])

    const showSmart = (scope === "all" || scope === "actions") && smartMatches.length > 0
    const showActions = (scope === "all" || scope === "actions") && quickActions.length > 0
    const showTx = (scope === "all" || scope === "transactions") && txResults.length > 0
    const showAccounts = (scope === "all" || scope === "accounts") && filteredAccounts.length > 0
    const showEntities =
        scope === "all" &&
        (filteredBudgets.length > 0 || filteredGoals.length > 0 || filteredLoans.length > 0)
    const showModules = (scope === "all" || scope === "modules") && filteredModules.length > 0
    const showSettings = (scope === "all" || scope === "modules") && filteredSettings.length > 0

    return (
        <div className="flex flex-col">
            {/* Spotlight Search Header */}
            <div
                data-slot="command-input-wrapper"
                className="flex h-14 items-center gap-3 border-b border-border/60 px-4 bg-muted/20"
            >
                <div className="h-8 w-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                    {txLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 stroke-[2.25]" />
                    )}
                </div>
                <CommandPrimitive.Input
                    data-slot="command-input"
                    placeholder="Busca movimientos, cuentas, metas, o escribe 'gasto 50 café'..."
                    value={query}
                    onValueChange={onQueryChange}
                    className="placeholder:text-muted-foreground/75 flex h-11 w-full bg-transparent text-sm font-semibold text-foreground outline-hidden"
                    autoFocus
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange("")}
                        className="h-7 w-7 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        aria-label="Limpiar búsqueda"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg border border-border/70 bg-background text-[10px] font-bold text-muted-foreground shrink-0">
                    Esc
                </kbd>
            </div>

            {/* Scope Filter Pills */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-border/50 bg-muted/10 overflow-x-auto no-scrollbar">
                {SCOPE_TABS.map((tab) => {
                    const active = scope === tab.id
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setScope(tab.id)}
                            className={cn(
                                "px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap shrink-0",
                                active
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Results Area */}
            <CommandList className="max-h-[400px] px-2 py-2 overflow-y-auto">
                <CommandEmpty>
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                        <div className="h-11 w-11 rounded-2xl bg-muted/60 flex items-center justify-center">
                            <Search className="h-5 w-5 opacity-40" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Sin resultados</p>
                        <p className="text-xs max-w-[260px]">
                            Prueba buscando un movimiento, cuenta, presupuesto, o escribe &quot;Reportes&quot;.
                        </p>
                    </div>
                </CommandEmpty>

                {/* 1. Smart NLP / Quick Intent Actions */}
                {showSmart && (
                    <CommandGroup heading="Sugerencias Inteligentes">
                        {smartMatches.map((result) => (
                            <CommandItem
                                key={result.id}
                                value={result.id}
                                onSelect={() => onSelectAndClose(() => router.push(result.url))}
                                className="rounded-2xl px-3 py-2.5 cursor-pointer group data-[selected=true]:bg-primary/10"
                            >
                                <div
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-xl mr-3 shrink-0 transition-transform group-data-[selected=true]:scale-105",
                                        result.type === "ACTION"
                                            ? "bg-primary/15 text-primary"
                                            : "bg-muted text-foreground"
                                    )}
                                >
                                    {result.type === "ACTION" ? (
                                        <Zap className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpRight className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                        {result.title}
                                    </span>
                                    {result.subtitle && (
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {result.subtitle}
                                        </span>
                                    )}
                                </div>
                                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 2. Live Matching Transactions */}
                {showTx && (
                    <CommandGroup heading="Movimientos encontrados">
                        {txResults.map((tx: any) => {
                            const isIncome = tx.transactionType === "INCOME"
                            const isTransfer = tx.transactionType === "TRANSFER"
                            const currency =
                                tx.metadata?.originalCurrency ||
                                tx.currencyCode ||
                                tx.account?.currencyCode ||
                                "PEN"
                            const dateStr = tx.transactionDate
                                ? format(new Date(tx.transactionDate), "d MMM", { locale: es })
                                : ""
                            return (
                                <CommandItem
                                    key={tx.id}
                                    value={`tx-${tx.id}`}
                                    onSelect={() =>
                                        onSelectAndClose(() =>
                                            router.push(`/dashboard/transactions/${tx.id}`)
                                        )
                                    }
                                    className="rounded-2xl px-3 py-2.5 cursor-pointer data-[selected=true]:bg-primary/10"
                                >
                                    <div
                                        className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center mr-3 shrink-0",
                                            isIncome
                                                ? "bg-emerald-500/12 text-emerald-500"
                                                : isTransfer
                                                  ? "bg-indigo-500/12 text-indigo-500"
                                                  : "bg-rose-500/12 text-rose-500"
                                        )}
                                    >
                                        {isIncome ? (
                                            <TrendingUp className="h-4 w-4" />
                                        ) : isTransfer ? (
                                            <ArrowRightLeft className="h-4 w-4" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                            {tx.description || "Movimiento"}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {tx.account?.name || "Cuenta"}
                                            {dateStr ? ` · ${dateStr}` : ""}
                                        </span>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-xs sm:text-sm font-black tabular-nums shrink-0",
                                            isIncome
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : isTransfer
                                                  ? "text-indigo-600 dark:text-indigo-400"
                                                  : "text-rose-500"
                                        )}
                                    >
                                        {isIncome ? "+" : isTransfer ? "" : "-"}
                                        {isBalanceVisible
                                            ? formatMoney(Number(tx.amount || 0), currency)
                                            : "••••"}
                                    </span>
                                </CommandItem>
                            )
                        })}
                    </CommandGroup>
                )}

                {/* 3. Matching Accounts & Credit Cards */}
                {showAccounts && (
                    <CommandGroup heading="Cuentas y Tarjetas">
                        {filteredAccounts.map((acc: any) => {
                            const isCard = acc.accountType === "CREDIT_CARD"
                            const bal = isCard
                                ? Math.max(
                                      0,
                                      Number(acc.creditLimit || 0) - Math.abs(Number(acc.usedBalance || 0))
                                  )
                                : Number(acc.currentBalance ?? acc.balance ?? 0)
                            return (
                                <CommandItem
                                    key={acc.id}
                                    value={`acc-${acc.id}`}
                                    onSelect={() =>
                                        onSelectAndClose(() =>
                                            router.push(`/dashboard/accounts/${acc.id}`)
                                        )
                                    }
                                    className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                                >
                                    <div
                                        className="h-9 w-9 rounded-xl flex items-center justify-center mr-3 shrink-0 border border-border/50"
                                        style={{
                                            backgroundColor: `${acc.color || "#7c3aed"}18`,
                                            color: acc.color || "#7c3aed",
                                        }}
                                    >
                                        {isCard ? (
                                            <CreditCard className="h-4 w-4" />
                                        ) : (
                                            <Wallet className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                            {formatAccountPillName(acc.name, acc.currencyCode)}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {isCard ? "Tarjeta de Crédito · Disponible" : "Cuenta"}
                                        </span>
                                    </div>
                                    <span className="text-xs font-extrabold tabular-nums text-foreground shrink-0">
                                        {isBalanceVisible
                                            ? formatMoney(bal, acc.currencyCode)
                                            : "••••••"}
                                    </span>
                                </CommandItem>
                            )
                        })}
                    </CommandGroup>
                )}

                {/* 4. Matching Budgets, Savings Goals, and Loans */}
                {showEntities && (
                    <CommandGroup heading="Presupuestos, Metas y Préstamos">
                        {filteredBudgets.map((b: any) => {
                            const pct =
                                Number(b.amount) > 0
                                    ? Math.round((Number(b.stats?.spent || 0) / Number(b.amount)) * 100)
                                    : 0
                            return (
                                <CommandItem
                                    key={`b-${b.id}`}
                                    value={`budget-${b.id}`}
                                    onSelect={() =>
                                        onSelectAndClose(() => router.push("/dashboard/budgets"))
                                    }
                                    className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                                >
                                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mr-3 shrink-0">
                                        <Calculator className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-xs text-foreground truncate">
                                            {b.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Presupuesto · {pct}% usado
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums shrink-0">
                                        {isBalanceVisible
                                            ? formatMoney(Number(b.amount || 0), b.currencyCode || "PEN")
                                            : "••••"}
                                    </span>
                                </CommandItem>
                            )
                        })}

                        {filteredGoals.map((g: any) => {
                            const pct =
                                Number(g.target_amount) > 0
                                    ? Math.round((Number(g.current_amount || 0) / Number(g.target_amount)) * 100)
                                    : 0
                            return (
                                <CommandItem
                                    key={`g-${g.id}`}
                                    value={`goal-${g.id}`}
                                    onSelect={() =>
                                        onSelectAndClose(() =>
                                            router.push(`/dashboard/savings-goals/${g.id}`)
                                        )
                                    }
                                    className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                                >
                                    <div className="h-8 w-8 rounded-xl bg-amber-500/12 text-amber-500 flex items-center justify-center mr-3 shrink-0">
                                        <Target className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-bold text-xs text-foreground truncate">
                                            {g.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Meta · {pct}% completado
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums shrink-0">
                                        {isBalanceVisible
                                            ? formatMoney(Number(g.current_amount || 0), g.currency || "PEN")
                                            : "••••"}
                                    </span>
                                </CommandItem>
                            )
                        })}

                        {filteredLoans.map((l: any) => (
                            <CommandItem
                                key={`l-${l.id}`}
                                value={`loan-${l.id}`}
                                onSelect={() =>
                                    onSelectAndClose(() => router.push("/dashboard/loans"))
                                }
                                className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                            >
                                <div className="h-8 w-8 rounded-xl bg-emerald-500/12 text-emerald-500 flex items-center justify-center mr-3 shrink-0">
                                    <HandCoins className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold text-xs text-foreground truncate">
                                        {l.personName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Préstamo {l.loanType === "LENT" ? "por cobrar" : "por pagar"}
                                    </span>
                                </div>
                                <span className="text-xs font-bold tabular-nums shrink-0">
                                    {isBalanceVisible
                                        ? formatMoney(Number(l.amount || 0), l.currencyCode || "PEN")
                                        : "••••"}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 5. Quick Actions */}
                {showActions && (
                    <CommandGroup heading="Acciones Rápidas">
                        {quickActions.map((act) => (
                            <CommandItem
                                key={act.id}
                                value={act.id}
                                onSelect={() => onSelectAndClose(act.onRun)}
                                className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                            >
                                <div
                                    className={cn(
                                        "h-8 w-8 rounded-xl flex items-center justify-center mr-3 shrink-0",
                                        act.iconCls
                                    )}
                                >
                                    <act.icon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                                        {act.label}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate">
                                        {act.subtitle}
                                    </span>
                                </div>
                                {act.shortcut && <CommandShortcut>{act.shortcut}</CommandShortcut>}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* 6. System Modules */}
                {showModules && (
                    <>
                        {(showSmart || showTx || showAccounts || showActions) && (
                            <CommandSeparator className="my-1.5" />
                        )}
                        <CommandGroup heading="Módulos">
                            {filteredModules.map((mod) => (
                                <CommandItem
                                    key={mod.href}
                                    value={`mod-${mod.href}`}
                                    onSelect={() => onSelectAndClose(() => router.push(mod.href))}
                                    className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                                >
                                    <div className="h-8 w-8 rounded-xl bg-muted/70 text-foreground/80 flex items-center justify-center mr-3 shrink-0">
                                        <mod.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                            {mod.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            {mod.desc}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}

                {/* 7. Settings Shortcuts */}
                {showSettings && (
                    <CommandGroup heading="Configuración">
                        {filteredSettings.map((item) => (
                            <CommandItem
                                key={item.href}
                                value={`set-${item.href}`}
                                onSelect={() => onSelectAndClose(() => router.push(item.href))}
                                className="rounded-2xl px-3 py-2 cursor-pointer data-[selected=true]:bg-primary/10"
                            >
                                <item.icon className="mr-3 h-4 w-4 text-muted-foreground" />
                                <span className="text-xs sm:text-sm font-semibold">{item.label}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>

            {/* Footer Keyboard Hints */}
            <div className="border-t border-border/60 bg-muted/30 px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/60 font-mono text-[10px]">
                            ↑↓
                        </kbd>
                        Navegar
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/60 font-mono text-[10px]">
                            ↵
                        </kbd>
                        Abrir
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-background border border-border/60 font-mono text-[10px]">
                            Esc
                        </kbd>
                        Cerrar
                    </span>
                </div>
                <span className="font-bold text-primary/90 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Lumio Spotlight
                </span>
            </div>
        </div>
    )
}

export function CommandSearch({
    children,
    enableShortcut = true,
}: {
    children?: React.ReactNode
    enableShortcut?: boolean
}) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")

    React.useEffect(() => {
        if (!enableShortcut) return
        const down = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [enableShortcut])

    React.useEffect(() => {
        if (!open) setQuery("")
    }, [open])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            {children ? (
                <div onClick={() => setOpen(true)}>{children}</div>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="relative flex h-10 w-full items-center justify-between rounded-xl border border-transparent bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border/50 transition-all md:w-[240px] lg:w-[320px] shadow-sm hover:shadow-md"
                >
                    <div className="flex items-center gap-2.5">
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline-flex opacity-70">Buscar funciones...</span>
                        <span className="sm:hidden opacity-70">Buscar...</span>
                    </div>
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex shadow-sm">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            )}

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                shouldFilter={false}
                showCloseButton={false}
                title="Buscador inteligente Lumio"
                description="Busca movimientos, cuentas, metas, presupuestos o acciones rápidas"
                className="sm:max-w-[600px] rounded-3xl border border-border/70 bg-card/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden"
            >
                {open && (
                    <CommandSearchContent
                        query={query}
                        onQueryChange={setQuery}
                        onSelectAndClose={runCommand}
                    />
                )}
            </CommandDialog>
        </>
    )
}
