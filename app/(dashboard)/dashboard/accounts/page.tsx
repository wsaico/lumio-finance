"use client"

import { useState, useMemo, useEffect } from "react"
import {
    CreditCard,
    Wallet,
    Banknote,
    Landmark,
    TrendingUp,
    ShieldCheck,
    AlertCircle,
} from "lucide-react"
import { AccountFormModal } from "@/components/accounts/account-form-modal"
import { CompactAccountCard } from "@/components/accounts/compact-account-card"
import { CreditCardDetailPanel } from "@/components/accounts/credit-card-detail-panel"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useSubscription } from "@/hooks/useSubscription"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { Crown, Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type AccountFilter = "ALL" | "BANK" | "CREDIT_CARD" | "CASH" | "DIGITAL" | "INVESTMENT"

const FILTER_TABS: { value: AccountFilter; label: string; icon: any }[] = [
    { value: "ALL", label: "Todas", icon: Wallet },
    { value: "BANK", label: "Bancos", icon: Landmark },
    { value: "CREDIT_CARD", label: "Tarjetas", icon: CreditCard },
    { value: "CASH", label: "Efectivo", icon: Banknote },
    { value: "DIGITAL", label: "Digital", icon: Wallet },
    { value: "INVESTMENT", label: "Inversiones", icon: TrendingUp },
]

export default function AccountsPage() {
    const {
        accounts,
        isLoading,
        error,
        liquidBalanceConverted,
        totalCreditDebtConverted,
        totalCreditLimitConverted,
        totalCreditAvailableConverted,
        netWorthConverted,
        balancesByCurrency,
    } = useAccounts()
    const { formatMoney } = useFormat()
    const { currencyCode: baseCurrency, isBalanceVisible } = useSettingsStore()

    const [activeTab, setActiveTab] = useState<AccountFilter>("ALL")
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const isDesktop = useMediaQuery("(min-width: 1024px)")
    const { isFree, maxAccounts } = useSubscription()
    const realAccountsCount = useMemo(
        () => (accounts || []).filter((a: any) => !a.isDemo).length,
        [accounts]
    )
    const isAccountLimitReached = isFree && realAccountsCount >= maxAccounts

    const money = (val: number, cur?: string) =>
        isBalanceVisible ? formatMoney(val, cur || baseCurrency) : "••••••"

    const filteredAccounts = useMemo(() => {
        if (!accounts) return []
        if (activeTab === "ALL") return accounts
        return accounts.filter((acc) => acc.accountType === activeTab)
    }, [accounts, activeTab])

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId || !accounts) return null
        return accounts.find((acc) => acc.id === selectedAccountId) || null
    }, [selectedAccountId, accounts])

    // Auto-select first visible account on desktop
    useEffect(() => {
        if (isDesktop && filteredAccounts.length > 0) {
            const existsInFiltered = filteredAccounts.some((a) => a.id === selectedAccountId)
            if (!existsInFiltered) {
                setSelectedAccountId(filteredAccounts[0].id)
            }
        } else if (isDesktop && filteredAccounts.length === 0) {
            setSelectedAccountId(null)
        }
    }, [isDesktop, filteredAccounts, selectedAccountId])

    const creditUsagePct =
        totalCreditLimitConverted > 0
            ? Math.min(100, (totalCreditDebtConverted / totalCreditLimitConverted) * 100)
            : 0

    const currencyEntries = Object.entries(balancesByCurrency || {})

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                        Mis Cuentas
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Tu patrimonio líquido, tarjetas de crédito y saldos en un solo lugar.
                    </p>
                </div>
                {isAccountLimitReached ? (
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full h-10 px-4 border-primary/35 bg-primary/10 text-primary hover:bg-primary/15 font-extrabold text-xs gap-2"
                    >
                        <Link href="/dashboard/billing">
                            <Lock className="h-3.5 w-3.5" />
                            <span>1/1 cuenta (Gratis) · Ampliar a Premium</span>
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </Link>
                    </Button>
                ) : (
                    <AccountFormModal />
                )}
            </div>

            {/* EXECUTIVE PORTFOLIO SUMMARY */}
            {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-3xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    {/* 1. Patrimonio Neto (Violet Hero) */}
                    <div className="col-span-2 lg:col-span-1 rounded-[1.75rem] bg-gradient-to-br from-[#7C5CFC] via-[#6D4DF6] to-[#5B3CE6] text-white p-5 shadow-xl shadow-primary/25 flex flex-col justify-between min-h-[120px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                                Patrimonio Neto
                            </span>
                            <ShieldCheck className="h-4 w-4 text-white/80" />
                        </div>
                        <div className="mt-2">
                            <p className="text-2xl font-black tracking-tight tabular-nums leading-none">
                                {money(netWorthConverted)}
                            </p>
                            <p className="text-[11px] text-white/75 mt-1.5">
                                Liquidez menos deuda en tarjetas
                            </p>
                        </div>
                    </div>

                    {/* 2. Saldo Líquido Total */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Saldo Líquido
                        </span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black tracking-tight text-foreground tabular-nums leading-none">
                                {money(liquidBalanceConverted)}
                            </p>
                            {currencyEntries.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {currencyEntries.map(([cur, amt]) => (
                                        <span
                                            key={cur}
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums"
                                        >
                                            {money(amt, cur)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Deuda en Tarjetas */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Deuda Tarjetas
                            </span>
                            {creditUsagePct >= 75 && <AlertCircle className="h-4 w-4 text-rose-500" />}
                        </div>
                        <div className="mt-2">
                            <p
                                className={cn(
                                    "text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none",
                                    totalCreditDebtConverted > 0
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-foreground"
                                )}
                            >
                                {money(totalCreditDebtConverted)}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-semibold mt-1.5 tabular-nums">
                                Uso de línea: {creditUsagePct.toFixed(0)}%
                            </p>
                        </div>
                    </div>

                    {/* 4. Crédito Disponible */}
                    <div className="card-modern p-4 sm:p-5 flex flex-col justify-between min-h-[120px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Crédito Disponible
                        </span>
                        <div className="mt-2">
                            <p className="text-xl sm:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                                {money(totalCreditAvailableConverted)}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-semibold mt-1.5 tabular-nums">
                                Línea total: {money(totalCreditLimitConverted)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTER PILLS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {FILTER_TABS.map((tab) => {
                    const Icon = tab.icon
                    const count =
                        tab.value === "ALL"
                            ? accounts.length
                            : accounts.filter((a) => a.accountType === tab.value).length
                    const active = activeTab === tab.value

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setActiveTab(tab.value)}
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all shrink-0 active:scale-95",
                                active
                                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                    : "bg-card text-muted-foreground border-border/70 hover:text-foreground hover:border-primary/40"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                            <span
                                className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                                    active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* CONTENT GRID */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-48 rounded-[1.75rem]" />
                    ))}
                </div>
            ) : error ? (
                <div className="card-modern p-10 text-center text-destructive font-semibold">
                    Error al cargar tus cuentas. Intenta recargar la página.
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="card-modern p-12 flex flex-col items-center justify-center text-center border-dashed">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Wallet className="h-7 w-7" />
                    </div>
                    <p className="text-base font-extrabold text-foreground">
                        No tienes cuentas en esta categoría
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-xs">
                        Agrega una cuenta bancaria, tarjeta de crédito o billetera para llevar el control exacto.
                    </p>
                    {isAccountLimitReached ? (
                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full h-10 px-4 border-primary/35 bg-primary/10 text-primary hover:bg-primary/15 font-extrabold text-xs gap-2"
                    >
                        <Link href="/dashboard/billing">
                            <Lock className="h-3.5 w-3.5" />
                            <span>1/1 cuenta (Gratis) · Ampliar a Premium</span>
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </Link>
                    </Button>
                ) : (
                    <AccountFormModal />
                )}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Cards Grid */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredAccounts.map((account) => (
                            <CompactAccountCard
                                key={account.id}
                                account={account}
                                isSelected={selectedAccountId === account.id}
                                onClick={() => setSelectedAccountId(account.id)}
                            />
                        ))}
                    </div>

                    {/* Sticky Detail Panel — Desktop */}
                    <div className="hidden lg:block lg:col-span-4">
                        <CreditCardDetailPanel card={selectedAccount} />
                    </div>

                    {/* Detail Bottom Sheet — Mobile */}
                    <Sheet
                        open={!!selectedAccountId && !isDesktop}
                        onOpenChange={(open) => !open && setSelectedAccountId(null)}
                    >
                        <SheetContent
                            side="bottom"
                            className="h-[85vh] p-0 rounded-t-[2rem] overflow-hidden border-t-0"
                        >
                            <SheetTitle className="sr-only">Detalles de la cuenta</SheetTitle>
                            <div className="h-full overflow-y-auto p-4 pt-6 bg-background">
                                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
                                <CreditCardDetailPanel card={selectedAccount} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            )}
        </div>
    )
}
