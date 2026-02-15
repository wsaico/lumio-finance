"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CreditCard, Banknote, Landmark, Wallet, TrendingUp, Coins, MoreVertical, Edit, Trash, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AccountFormModal } from "./account-form-modal"
import { EditInitialBalanceModal } from "./edit-initial-balance-modal"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useRouter } from "next/navigation"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Account {
    id: string
    name: string
    accountType: string
    currentBalance: any
    initialBalance?: any
    creditLimit?: any
    usedBalance?: any
    lastFourDigits?: string
    cardNetwork?: string
    expiryDate?: Date | string
    isActive: boolean
    currencyCode: string
    color?: string
}

interface CompactAccountCardProps {
    account: Account
    isSelected?: boolean
    onClick?: () => void
}

export function CompactAccountCard({ account, isSelected, onClick }: CompactAccountCardProps) {
    const router = useRouter()
    const { deleteAccount } = useAccounts()
    const { formatMoney } = useFormat()
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditBalance, setShowEditBalance] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const availableBalance = account.accountType === 'CREDIT_CARD'
        ? Number(account.creditLimit || 0) - Number(account.usedBalance || 0)
        : Number(account.currentBalance || 0)

    const cardNumber = account.lastFourDigits ? `•••• ${account.lastFourDigits}` : null
    const expiryDate = account.expiryDate
        ? new Date(account.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
        : null

    const handleDelete = async () => {
        try {
            setDeleteError(null)
            await deleteAccount.mutateAsync(account.id)
            setShowDeleteDialog(false)
        } catch (error: any) {
            setDeleteError(error.message || 'Error al eliminar la cuenta')
        }
    }

    const handleViewTransactions = () => {
        router.push(`/dashboard/accounts/${account.id}`)
    }

    // Gradientes compactos por tipo
    const getCardGradient = () => {
        if (!account.isActive && account.accountType === 'CREDIT_CARD') {
            return 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
        }

        const network = account.cardNetwork?.toUpperCase() || 'VISA'

        switch (account.accountType) {
            case 'CREDIT_CARD':
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
            case 'CASH':
                return 'linear-gradient(135deg, #10b981, #047857)'
            case 'BANK':
                return 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
            case 'DIGITAL':
                return 'linear-gradient(135deg, #06b6d4, #0e7490)'
            case 'INVESTMENT':
                return 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
            case 'PETTY_CASH':
                return 'linear-gradient(135deg, #f97316, #c2410c)'
            default:
                return 'linear-gradient(135deg, #334155, #0f172a)'
        }
    }

    const getIcon = () => {
        switch (account.accountType) {
            case 'CREDIT_CARD': return CreditCard
            case 'CASH': return Banknote
            case 'BANK': return Landmark
            case 'DIGITAL': return Wallet
            case 'INVESTMENT': return TrendingUp
            case 'PETTY_CASH': return Coins
            default: return Wallet
        }
    }

    const Icon = getIcon()

    return (
        <>
            <div
                onClick={onClick}
                className={cn(
                    "group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden",
                    isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-accent/50"
                        : "hover:bg-accent/30 bg-card"
                )}
            >
                <div className="flex items-center gap-4 p-4">
                    {/* Card Visual - Compacto */}
                    <div
                        className="relative w-[280px] h-[160px] rounded-lg p-4 text-white shadow-lg flex-shrink-0"
                        style={{ background: getCardGradient() }}
                    >
                        {/* Texture */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                        {/* Content */}
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1.5">
                                    <Icon className="h-4 w-4" />
                                    <span className="font-semibold text-xs uppercase tracking-wide">
                                        {account.accountType === 'CREDIT_CARD'
                                            ? (account.cardNetwork || 'VISA')
                                            : account.accountType.replace('_', ' ')}
                                    </span>
                                </div>
                                <Badge
                                    variant={account.isActive ? "default" : "secondary"}
                                    className={cn(
                                        "text-[9px] px-1.5 py-0",
                                        account.isActive
                                            ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/30"
                                            : "bg-amber-500/20 text-amber-100 border-amber-400/30"
                                    )}
                                >
                                    {account.isActive ? 'Activa' : 'Bloqueada'}
                                </Badge>
                            </div>

                            {/* Card Number */}
                            {cardNumber && (
                                <div>
                                    <div className="text-[8px] text-white/60 font-mono tracking-widest mb-0.5">
                                        NÚMERO DE TARJETA
                                    </div>
                                    <div className="font-mono text-sm tracking-widest text-white/90">
                                        {cardNumber}
                                    </div>
                                </div>
                            )}

                            {/* Balance */}
                            <div>
                                <div className="text-[8px] text-white/60 mb-0.5">
                                    {account.accountType === 'CREDIT_CARD' ? 'DISPONIBLE' : 'SALDO'}
                                </div>
                                <div className="text-xl font-bold">
                                    {formatMoney(availableBalance, account.currencyCode)}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-end text-[10px]">
                                <div>
                                    <div className="text-white/60 mb-0.5">TITULAR</div>
                                    <div className="font-medium truncate max-w-[120px]">{account.name}</div>
                                </div>
                                {expiryDate && (
                                    <div>
                                        <div className="text-white/60 mb-0.5">VENCE</div>
                                        <div className="font-medium">{expiryDate}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Lateral - Compacta */}
                    <div className="flex-1 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                                {account.accountType === 'CREDIT_CARD' ? 'Disponible' : 'Saldo'}
                            </span>
                            <span className="font-semibold">
                                {formatMoney(availableBalance, account.currencyCode)}
                            </span>
                        </div>
                        {cardNumber && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Número</span>
                                <span className="font-mono text-xs">{cardNumber}</span>
                            </div>
                        )}
                        {expiryDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Vencimiento</span>
                                <span>{expiryDate}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Titular</span>
                            <span className="truncate max-w-[150px]">{account.name}</span>
                        </div>
                    </div>

                    {/* Menu Funcional */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditBalance(true); }}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Ajustar Saldo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewTransactions(); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Transacciones
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                            >
                                <Trash className="h-4 w-4 mr-2" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Modales Funcionales */}
            <AccountFormModal
                account={account as any}
                open={showEditModal}
                onOpenChange={setShowEditModal}
            />

            {account && (
                <EditInitialBalanceModal
                    account={{
                        id: account.id,
                        name: account.name,
                        initialBalance: Number(account.initialBalance || 0),
                        currentBalance: Number(account.currentBalance || 0),
                        currencyCode: account.currencyCode
                    }}
                    open={showEditBalance}
                    onOpenChange={setShowEditBalance}
                />
            )}

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta "{account.name}".
                            {deleteError && (
                                <p className="mt-2 text-destructive text-sm">{deleteError}</p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
