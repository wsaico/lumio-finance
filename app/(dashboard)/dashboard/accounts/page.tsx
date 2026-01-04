"use client"

import { useState, useMemo } from "react"
import { AccountFormModal } from "@/components/accounts/account-form-modal"
import { CompactAccountCard } from "@/components/accounts/compact-account-card"
import { CreditCardsStats } from "@/components/accounts/credit-cards-stats"
import { CreditCardDetailPanel } from "@/components/accounts/credit-card-detail-panel"
import { useAccounts } from "@/hooks/use-accounts"
import { Loader2, CreditCard, Wallet, Banknote, Landmark, TrendingUp } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AccountType = 'ALL' | 'CREDIT_CARD' | 'BANK' | 'CASH' | 'DIGITAL' | 'INVESTMENT'

export default function AccountsPage() {
    const { accounts, isLoading, error } = useAccounts()
    const [activeTab, setActiveTab] = useState<AccountType>('ALL')
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

    const filteredAccounts = useMemo(() => {
        if (!accounts) return []
        if (activeTab === 'ALL') return accounts
        return accounts.filter(acc => acc.accountType === activeTab)
    }, [accounts, activeTab])

    const selectedAccount = useMemo(() => {
        if (!selectedAccountId || !accounts) return null
        return accounts.find(acc => acc.id === selectedAccountId) || null
    }, [selectedAccountId, accounts])

    // Auto-select first account when switching tabs
    const handleTabChange = (value: string) => {
        setActiveTab(value as AccountType)
        const filtered = value === 'ALL'
            ? accounts
            : accounts?.filter(a => a.accountType === value)

        if (filtered && filtered.length > 0) {
            setSelectedAccountId(filtered[0].id)
        } else {
            setSelectedAccountId(null)
        }
    }

    const tabs = [
        { value: 'ALL', label: 'Todas las Cuentas', icon: Wallet },
        { value: 'CREDIT_CARD', label: 'Tarjetas de Crédito', icon: CreditCard },
        { value: 'BANK', label: 'Bancos', icon: Landmark },
        { value: 'CASH', label: 'Efectivo', icon: Banknote },
        { value: 'DIGITAL', label: 'Digital', icon: Wallet },
        { value: 'INVESTMENT', label: 'Inversiones', icon: TrendingUp },
    ]

    return (
        <div className="space-y-6">
            {/* Header Toolbar - Only Action Buttons */}
            <div className="flex items-center justify-end">
                <AccountFormModal />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        const count = accounts?.filter(a =>
                            tab.value === 'ALL' ? true : a.accountType === tab.value
                        ).length || 0

                        return (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2"
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
                                {/* Accounts List - TODAS usan el mismo diseño compacto */}
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

                                {/* Detail Panel */}
                                <div className="hidden lg:block">
                                    <CreditCardDetailPanel card={selectedAccount} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Tabs>
        </div>
    )
}
