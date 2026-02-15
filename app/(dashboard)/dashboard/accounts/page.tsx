"use client"

import { useState, useMemo, useEffect } from "react"
import { AccountFormModal } from "@/components/accounts/account-form-modal"
import { CompactAccountCard } from "@/components/accounts/compact-account-card"
import { CreditCardsStats } from "@/components/accounts/credit-cards-stats"
import { CreditCardDetailPanel } from "@/components/accounts/credit-card-detail-panel"
import { useAccounts } from "@/hooks/useAccounts"
import { Loader2, CreditCard, Wallet, Banknote, Landmark, TrendingUp } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/useMediaQuery"

type AccountType = 'ALL' | 'CREDIT_CARD' | 'BANK' | 'CASH' | 'DIGITAL' | 'INVESTMENT'

export default function AccountsPage() {
    const { accounts, isLoading, error } = useAccounts()
    const [activeTab, setActiveTab] = useState<AccountType>('ALL')
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const isDesktop = useMediaQuery("(min-width: 1024px)")

    // Reset selection when switching to desktop if needed, or keep it sync
    // When on mobile, selection opens the sheet.
    // When on desktop, selection updates the side panel.

    const filteredAccounts = useMemo(() => {
        if (!accounts) return []
        if (activeTab === 'ALL') return accounts
        return accounts.filter(acc => acc.accountType === activeTab)
    }, [accounts, activeTab])

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId || !accounts) return null
        return accounts.find(acc => acc.id === selectedAccountId) || null
    }, [selectedAccountId, accounts])

    // Auto-select first account when switching tabs (Desktop only)
    const handleTabChange = (value: string) => {
        setActiveTab(value as AccountType)
        if (isDesktop) {
            const filtered = value === 'ALL'
                ? accounts
                : accounts?.filter(a => a.accountType === value)

            if (filtered && filtered.length > 0) {
                setSelectedAccountId(filtered[0].id)
            } else {
                setSelectedAccountId(null)
            }
        }
    }

    // Effect to select first account on load for Desktop
    useEffect(() => {
        if (isDesktop && accounts && accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id)
        }
    }, [isDesktop, accounts, selectedAccountId])

    const tabs = [
        { value: 'ALL', label: 'Todas', icon: Wallet },
        { value: 'CREDIT_CARD', label: 'Tarjetas', icon: CreditCard },
        { value: 'BANK', label: 'Bancos', icon: Landmark },
        { value: 'CASH', label: 'Efectivo', icon: Banknote },
        { value: 'DIGITAL', label: 'Digital', icon: Wallet },
        { value: 'INVESTMENT', label: 'Inversiones', icon: TrendingUp },
    ]

    return (
        <div className="space-y-6 pb-20 lg:pb-0">
            {/* Header Toolbar - Only Action Buttons */}
            <div className="flex items-center justify-between lg:justify-end">
                <h1 className="text-2xl font-bold lg:hidden">Mis Cuentas</h1>
                <AccountFormModal />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const count = accounts?.filter(a =>
                            tab.value === 'ALL' ? true : a.accountType === tab.value
                        ).length || 0

                        return (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2 min-w-fit"
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {isLoading ? (
                    <div className="flex h-[200px] w-full items-center justify-center mt-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <div className="text-center text-destructive mt-6">Error al cargar cuentas</div>
                ) : (
                    <div className="space-y-6 mt-6">
                        {/* Stats - Solo para Credit Cards */}
                        {activeTab === 'CREDIT_CARD' && <CreditCardsStats />}

                        {filteredAccounts.length === 0 ? (
                            <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 text-muted-foreground">
                                <p className="mb-4">No tienes cuentas de este tipo</p>
                                <AccountFormModal />
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-[1fr_400px] gap-6">
                                {/* Accounts List */}
                                <div className="space-y-3">
                                    {filteredAccounts.map((account) => (
                                        <CompactAccountCard
                                            key={account.id}
                                            account={account}
                                            isSelected={selectedAccountId === account.id}
                                            onClick={() => setSelectedAccountId(account.id)}
                                        />
                                    ))}
                                </div>

                                {/* Detail Panel - Desktop */}
                                <div className="hidden lg:block">
                                    <CreditCardDetailPanel card={selectedAccount} />
                                </div>

                                {/* Detail Sheet - Mobile */}
                                <Sheet
                                    open={!!selectedAccountId && !isDesktop}
                                    onOpenChange={(open) => !open && setSelectedAccountId(null)}
                                >
                                    <SheetContent
                                        side="bottom"
                                        className="h-[85vh] p-0 rounded-t-[2rem] overflow-hidden"
                                    >
                                        <div className="h-full overflow-y-auto p-4 pt-8 bg-zinc-50 dark:bg-zinc-950">
                                            {/* Drag Handle */}
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />

                                            <CreditCardDetailPanel card={selectedAccount} />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        )}
                    </div>
                )}
            </Tabs>
        </div>
    )
}
