"use client"

import { useMemo } from "react"
import { useAccounts } from "@/hooks/use-accounts"
import { TrendingUp, CreditCard, DollarSign, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"

export function CreditCardsStats() {
    const { accounts } = useAccounts()

    const stats = useMemo(() => {
        const creditCards = accounts?.filter(a => a.accountType === 'CREDIT_CARD') || []

        const totalBalance = creditCards.reduce((sum, card) => {
            const limit = Number(card.creditLimit) || 0
            const used = Number(card.usedBalance) || 0
            return sum + (limit - used)
        }, 0)

        const activeCards = creditCards.filter(c => c.isActive).length
        const totalCards = creditCards.length

        const avgBalance = activeCards > 0 ? totalBalance / activeCards : 0

        const lockedCards = creditCards.filter(c => !c.isActive).length

        // Calculate percentage change (mock for now, could be calculated from historical data)
        const totalBalanceChange = 12.5
        const avgBalanceChange = 8.3

        return {
            totalBalance,
            totalBalanceChange,
            activeCards,
            totalCards,
            avgBalance,
            avgBalanceChange,
            lockedCards
        }
    }, [accounts])

    const statCards = [
        {
            icon: DollarSign,
            label: "Balance Total",
            value: `$${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
            change: `+${stats.totalBalanceChange}%`,
            changePositive: true
        },
        {
            icon: CreditCard,
            label: "Tarjetas Activas",
            value: `${stats.activeCards}/${stats.totalCards}`,
            change: null,
            changePositive: null
        },
        {
            icon: TrendingUp,
            label: "Balance Promedio",
            value: `$${stats.avgBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
            change: `+${stats.avgBalanceChange}%`,
            changePositive: true
        },
        {
            icon: Shield,
            label: "Estado de Seguridad",
            value: stats.lockedCards > 0 ? `${stats.lockedCards} Bloqueada${stats.lockedCards > 1 ? 's' : ''}` : "Todas Desbloqueadas",
            change: null,
            changePositive: null
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => {
                const Icon = stat.icon
                return (
                    <Card key={index} className="p-6 bg-card border-border hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Icon className="h-4 w-4" />
                                <span className="text-sm font-medium">{stat.label}</span>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-50">
                                    <circle cx="8" cy="3" r="1" fill="currentColor" />
                                    <circle cx="8" cy="8" r="1" fill="currentColor" />
                                    <circle cx="8" cy="13" r="1" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                            {stat.change && (
                                <div className={`text-sm font-medium ${stat.changePositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {stat.change}
                                </div>
                            )}
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
