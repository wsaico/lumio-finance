"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
    RefreshCw,
    ArrowLeft,
    ArrowLeftRight,
    Loader2,
    Pencil,
    Check,
    X,
    RotateCcw,
    Search,
    Globe,
    Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { useAccounts } from "@/hooks/useAccounts"
import { CURRENCIES, getCurrencySymbol } from "@/lib/currencies"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function ExchangeRatesPage() {
    const { currencyCode } = useSettingsStore()
    const { accounts = [] } = useAccounts()
    const { rates, isLoading, syncRates, saveManualRate, convert, getRate } = useExchangeRates()

    // Live Converter State
    const [convAmount, setConvAmount] = useState("100")
    const [fromCurr, setFromCurr] = useState("USD")
    const [toCurr, setToCurr] = useState(currencyCode === "USD" ? "EUR" : currencyCode)

    // List search & inline manual edit state
    const [search, setSearch] = useState("")
    const [editingCode, setEditingCode] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")

    // Map latest DB record per USD -> CODE
    const dbUsdMap = useMemo(() => {
        const map: Record<string, { rate: number; source: string; effective_date: string }> = {}
        for (const r of rates) {
            if (r.from_currency === "USD" && !map[r.to_currency]) {
                map[r.to_currency] = {
                    rate: Number(r.rate),
                    source: r.source || "API",
                    effective_date: r.effective_date,
                }
            }
        }
        return map
    }, [rates])

    // Currencies actively used by user (primary + accounts)
    const userCurrencySet = useMemo(() => {
        const set = new Set<string>([currencyCode])
        accounts.forEach((a: any) => {
            if (a.currencyCode) set.add(a.currencyCode)
        })
        return set
    }, [currencyCode, accounts])

    // Sorted & filtered currencies (excluding USD since hub is 1 USD = X)
    const currencyRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return CURRENCIES.filter((c) => c.code !== "USD")
            .filter((c) => {
                if (!q) return true
                return (
                    c.code.toLowerCase().includes(q) ||
                    c.name.toLowerCase().includes(q) ||
                    c.region.toLowerCase().includes(q)
                )
            })
            .sort((a, b) => {
                const aUser = userCurrencySet.has(a.code) ? 0 : 1
                const bUser = userCurrencySet.has(b.code) ? 0 : 1
                if (aUser !== bUser) return aUser - bUser
                if (a.code === currencyCode) return -1
                if (b.code === currencyCode) return 1
                return a.code.localeCompare(b.code)
            })
    }, [search, userCurrencySet, currencyCode])

    const parsedConvAmount = parseFloat(convAmount) || 0
    const convertedVal = convert(parsedConvAmount, fromCurr, toCurr)
    const { rate: effectiveConvRate, isFallback: isConvFallback } = getRate(fromCurr, toCurr)

    const handleSwapConverter = () => {
        setFromCurr(toCurr)
        setToCurr(fromCurr)
    }

    const startEdit = (code: string, currentRate: number) => {
        setEditingCode(code)
        setEditValue(String(Number(currentRate.toFixed(4))))
    }

    const handleSaveEdit = async (code: string) => {
        const num = parseFloat(editValue)
        if (!num || !isFinite(num) || num <= 0) {
            toast.error("Ingresa una tasa válida mayor a 0")
            return
        }
        await saveManualRate.mutateAsync({
            from_currency: "USD",
            to_currency: code,
            rate: num,
        })
        setEditingCode(null)
    }

    const formatRateNumber = (val: number) => {
        if (val >= 100) return val.toLocaleString("es-PE", { maximumFractionDigits: 2 })
        if (val >= 1) return val.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
        return val.toFixed(5)
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-10 animate-in fade-in duration-300">
            {/* TOP HEADER */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link
                        href="/dashboard/settings?tab=regional"
                        className="h-10 w-10 rounded-2xl bg-card border border-border/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground truncate">
                            Tipos de Cambio
                        </h1>
                        <p className="text-xs text-muted-foreground truncate">
                            Hub global USD · compatible con tasas oficiales y paralelas
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    size="sm"
                    onClick={() => syncRates.mutate({})}
                    disabled={syncRates.isPending}
                    className="h-10 px-4 rounded-full font-extrabold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 shrink-0"
                >
                    {syncRates.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span>Sincronizar</span>
                </Button>
            </div>

            {/* LIVE CONVERTER HERO CARD */}
            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 sm:p-6 text-white shadow-xl shadow-indigo-900/15 space-y-4">
                <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

                <div className="relative flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                        <Globe className="h-3.5 w-3.5" />
                        Conversor en vivo
                    </span>
                    <span className="text-xs font-bold text-white/85 tabular-nums">
                        1 {fromCurr} = {formatRateNumber(effectiveConvRate)} {toCurr}
                        {isConvFallback && " (ref.)"}
                    </span>
                </div>

                {/* Amount & Result */}
                <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
                    {/* From Box */}
                    <div className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/15 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                                De
                            </span>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[190px]">
                                {["USD", currencyCode, "EUR", "COP", "BOB"]
                                    .filter((v, i, arr) => arr.indexOf(v) === i)
                                    .slice(0, 4)
                                    .map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFromCurr(c)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all",
                                                fromCurr === c
                                                    ? "bg-white text-indigo-700"
                                                    : "bg-white/10 text-white/80 hover:bg-white/20"
                                            )}
                                        >
                                            {c}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-white/75">
                                {getCurrencySymbol(fromCurr)}
                            </span>
                            <input
                                type="number"
                                step="any"
                                value={convAmount}
                                onChange={(e) => setConvAmount(e.target.value)}
                                className="w-full bg-transparent text-2xl font-black tabular-nums text-white placeholder:text-white/50 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Swap Button */}
                    <button
                        type="button"
                        onClick={handleSwapConverter}
                        aria-label="Invertir monedas"
                        className="h-10 w-10 mx-auto rounded-full bg-white text-indigo-700 hover:bg-white/95 shadow-lg flex items-center justify-center transition-transform active:scale-90 shrink-0"
                    >
                        <ArrowLeftRight className="h-4 w-4 stroke-[2.5]" />
                    </button>

                    {/* To Box */}
                    <div className="rounded-2xl bg-white/12 backdrop-blur-md border border-white/15 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                                A
                            </span>
                            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[190px]">
                                {[currencyCode, "USD", "COP", "BOB", "EUR"]
                                    .filter((v, i, arr) => arr.indexOf(v) === i)
                                    .slice(0, 4)
                                    .map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setToCurr(c)}
                                            className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-all",
                                                toCurr === c
                                                    ? "bg-white text-indigo-700"
                                                    : "bg-white/10 text-white/80 hover:bg-white/20"
                                            )}
                                        >
                                            {c}
                                        </button>
                                    ))}
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-bold text-white/75">
                                {getCurrencySymbol(toCurr)}
                            </span>
                            <p className="text-2xl font-black tabular-nums text-white truncate">
                                {convertedVal.toLocaleString("es-PE", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* INFO TIP FOR PARALLEL MARKET COUNTRIES */}
            <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3 flex items-start gap-2.5 text-xs">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground/85 leading-relaxed">
                    <strong>¿Usas tasa paralela o bancaria?</strong> (ej. Bolivia, Argentina o tipo de cambio preferencial): toca el lápiz en cualquier moneda para fijar tu tasa personalizada. Las tasas{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-400">Manuales</span>{" "}
                    se conservan aunque sincronices con la API.
                </p>
            </div>

            {/* SEARCH + RATES LIST */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar país o moneda (ej. Colombia, Bolivia, COP, BOB)..."
                        className="pl-10 h-11 rounded-2xl bg-card border-border/60 text-sm"
                    />
                </div>

                {isLoading ? (
                    <div className="card-modern p-10 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/40 overflow-hidden shadow-xs">
                        {currencyRows.map((curr) => {
                            const dbEntry = dbUsdMap[curr.code]
                            const { rate: effectiveRate, isFallback } = getRate("USD", curr.code)
                            const isManual = dbEntry?.source === "MANUAL"
                            const isUserCurr = userCurrencySet.has(curr.code)
                            const isEditing = editingCode === curr.code

                            return (
                                <div
                                    key={curr.code}
                                    className="px-3.5 py-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                                >
                                    {/* Left: Currency Badge + Name + Region */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className={cn(
                                                "h-10 w-12 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border",
                                                isUserCurr
                                                    ? "bg-primary/12 text-primary border-primary/25"
                                                    : "bg-muted/60 text-foreground/80 border-border/60"
                                            )}
                                        >
                                            {curr.code}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-bold text-foreground truncate">
                                                    {curr.name}
                                                </p>
                                                {curr.code === currencyCode && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/12 text-primary text-[9px] font-black uppercase shrink-0">
                                                        Principal
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                                <span className="truncate">{curr.region}</span>
                                                <span className="opacity-40">·</span>
                                                <span
                                                    className={cn(
                                                        "font-bold shrink-0",
                                                        isManual
                                                            ? "text-amber-600 dark:text-amber-400"
                                                            : isFallback
                                                              ? "text-muted-foreground"
                                                              : "text-emerald-600 dark:text-emerald-400"
                                                    )}
                                                >
                                                    {isManual
                                                        ? "Manual"
                                                        : isFallback
                                                          ? "Referencial"
                                                          : "Oficial API"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Rate Display or Inline Manual Editor */}
                                    {isEditing ? (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0.0001"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleSaveEdit(curr.code)
                                                    if (e.key === "Escape") setEditingCode(null)
                                                }}
                                                autoFocus
                                                className="h-9 w-24 text-right font-bold tabular-nums rounded-xl text-sm"
                                            />
                                            <Button
                                                type="button"
                                                size="icon"
                                                disabled={saveManualRate.isPending}
                                                onClick={() => handleSaveEdit(curr.code)}
                                                className="h-9 w-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setEditingCode(null)}
                                                className="h-9 w-9 rounded-xl"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-black tabular-nums text-foreground">
                                                    {curr.symbol} {formatRateNumber(effectiveRate)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-semibold">
                                                    por 1 USD
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => startEdit(curr.code, effectiveRate)}
                                                title={`Editar tasa manual USD → ${curr.code}`}
                                                className="h-8 w-8 rounded-xl bg-muted/60 hover:bg-primary/15 hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>

                                            {isManual && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        syncRates.mutate({
                                                            currency: curr.code,
                                                            forceOverwriteManual: true,
                                                        })
                                                    }
                                                    disabled={syncRates.isPending}
                                                    title="Restaurar tasa oficial API"
                                                    className="h-8 w-8 rounded-xl bg-amber-500/12 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-colors"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
