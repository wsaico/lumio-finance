"use client"

import { useState } from "react"
import { CreditCard, Banknote, Landmark, Wallet, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Account {
    id: string
    name: string
    accountType: string
    currentBalance: any
    creditLimit?: any
    usedBalance?: any
    lastFourDigits?: string
    cardNetwork?: string
    expiryDate?: Date | string
    isActive: boolean
    currencyCode: string
    color?: string
}

interface EnhancedCreditCardProps {
    card: Account
    isSelected?: boolean
    onClick?: () => void
}

export function EnhancedCreditCard({ card, isSelected, onClick }: EnhancedCreditCardProps) {
    const availableBalance = Number(card.creditLimit || 0) - Number(card.usedBalance || 0)
    const cardNumber = card.lastFourDigits ? `•••• •••• •••• ${card.lastFourDigits}` : '•••• •••• •••• ••••'
    const expiryDate = card.expiryDate
        ? new Date(card.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
        : '••/••'

    // Gradientes específicos por red
    const getCardGradient = () => {
        if (!card.isActive) {
            return 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
        }

        const network = card.cardNetwork?.toUpperCase() || 'VISA'

        switch (network) {
            case 'VISA':
                return 'linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)'
            case 'MASTERCARD':
                return 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
            case 'AMEX':
                return 'linear-gradient(135deg, #0070BA 0%, #003087 100%)'
            default:
                return 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
        }
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative rounded-2xl p-6 cursor-pointer transition-all duration-300",
                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : "hover:scale-[1.01]"
            )}
        >
            {/* Card Visual */}
            <div
                className="relative aspect-[1.586/1] rounded-xl p-5 text-white shadow-xl overflow-hidden"
                style={{ background: getCardGradient() }}
            >
                {/* Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <span className="font-semibold text-sm uppercase tracking-wide">
                                {card.cardNetwork || 'VISA'}
                            </span>
                        </div>
                        <Badge
                            variant={card.isActive ? "default" : "secondary"}
                            className={cn(
                                "text-[10px] px-2 py-0.5",
                                card.isActive
                                    ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                                    : "bg-amber-500/20 text-amber-100 border-amber-400/30"
                            )}
                        >
                            {card.isActive ? 'Activa' : 'Bloqueada'}
                        </Badge>
                    </div>

                    {/* Chip */}
                    <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-600/50 relative overflow-hidden shadow-inner" />

                    {/* Card Number */}
                    <div>
                        <div className="text-[10px] text-white/60 font-mono tracking-widest mb-1">
                            NÚMERO DE TARJETA
                        </div>
                        <div className="font-mono text-lg tracking-widest text-white/90">
                            {cardNumber}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] text-white/60 mb-1">TITULAR</div>
                            <div className="text-sm font-medium">{card.name}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-white/60 mb-1">VENCE</div>
                            <div className="text-sm font-medium">{expiryDate}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Below Card */}
            <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Saldo</span>
                    <span className="font-semibold">
                        {card.currencyCode === 'PEN' ? 'S/' : '$'}{availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Número</span>
                    <span className="font-mono text-xs">•••• {card.lastFourDigits || '••••'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Vencimiento</span>
                    <span>{expiryDate}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Titular</span>
                    <span className="truncate max-w-[150px]">{card.name}</span>
                </div>
            </div>
        </div>
    )
}
