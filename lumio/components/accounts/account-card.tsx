"use client"

import { Card } from "@/components/ui/card"
import { Wallet, CreditCard, Banknote, Landmark, TrendingUp, MoreVertical, Edit, Trash, Signal, Cpu, EyeOff, Archive, Eye, ArchiveRestore, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { AccountFormModal } from "./account-form-modal"
import { EditInitialBalanceModal } from "./edit-initial-balance-modal"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
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
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Account {
    id: string
    userId: string
    name: string
    accountType: string
    currencyCode: string
    currentBalance: any
    initialBalance: any
    bankName: string | null
    accountNumber: string | null
    icon: string
    color: string
    isActive: boolean
    includeInTotal: boolean
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}

interface AccountCardProps {
    account: Account
    onEdit?: () => void
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
    const router = useRouter()
    const { deleteAccount, updateAccount } = useAccounts()
    const { formatMoney } = useFormat()
    const [showDetails, setShowDetails] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showEditBalance, setShowEditBalance] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on the dropdown menu
        if ((e.target as HTMLElement).closest('[role="button"]') ||
            (e.target as HTMLElement).closest('[role="menu"]')) {
            return
        }
        router.push(`/dashboard/accounts/${account.id}`)
    }

    // Icons Mapping
    const getIcon = (type: string) => {
        switch (type) {
            case 'CASH': return Banknote
            case 'INVESTMENT': return TrendingUp
            case 'BANK': return Landmark
            case 'DIGITAL': return Wallet
            case 'PETTY_CASH': return Wallet
            case 'CREDIT_CARD': return CreditCard
            default: return Wallet
        }
    }
    const Icon = getIcon(account.accountType)

    // Smart Gradient Generation
    // If account has a custom color (from presets), we build a gradient from it.
    // Otherwise fallback to Type presets.
    const getGradientStyle = () => {
        if (account.color && account.color.startsWith('#')) {
            // Generate a gradient based on the hex color (Simple dark to light shift)
            // Ideally we'd calculate lighter/darker shades, but for now we can use the color as base 
            // and overlay a black gradient or similar.
            // A simple trick: Linear gradient from the Color to a Darker version of it.
            return {
                background: `linear-gradient(135deg, ${account.color}, ${adjustBrightness(account.color, -40)})`
            }
        }

        switch (account.accountType) {
            case 'CASH': return { background: "linear-gradient(135deg, #10b981, #047857)" } // Emerald
            case 'INVESTMENT': return { background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" } // Blue
            case 'BANK': return { background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" } // Violet
            case 'PETTY_CASH': return { background: "linear-gradient(135deg, #f97316, #c2410c)" } // Orange
            case 'DIGITAL': return { background: "linear-gradient(135deg, #06b6d4, #0e7490)" } // Cyan
            case 'CREDIT_CARD': return { background: "linear-gradient(135deg, #6366f1, #4338ca)" } // Indigo
            default: return { background: "linear-gradient(135deg, #334155, #0f172a)" } // Slate
        }
    }

    // Hex Brightness Helper
    function adjustBrightness(col: string, amt: number) {
        var usePound = false;
        if (col[0] == "#") {
            col = col.slice(1);
            usePound = true;
        }
        var num = parseInt(col, 16);
        var r = (num >> 16) + amt;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        var b = ((num >> 8) & 0x00FF) + amt;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        var g = (num & 0x0000FF) + amt;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
    }

    const cardStyle = getGradientStyle()

    // Currency Formatting
    const balance = Number(account.currentBalance) || 0
    const formattedBalance = balance.toLocaleString('en-US', {
        style: 'currency',
        currency: account.currencyCode
    })

    return (
        <>
            <div
                onClick={handleCardClick}
                className="group relative w-full aspect-[1.586/1] rounded-[1.25rem] p-5 text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl overflow-hidden select-none cursor-pointer"
                style={cardStyle}
            >
                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-125 brightness-100 mix-blend-overlay"></div>
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/10 to-transparent rotate-12 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                    {/* Header: Bank/Name + Menu */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-white drop-shadow-md" strokeWidth={2.5} />
                            <span className="font-semibold text-base tracking-wide text-white drop-shadow-md uppercase">
                                {(account as any).customBankName || account.name}
                            </span>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10 -mr-2 -mt-2">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowDetails(true)}>
                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowEditBalance(true)}>
                                    <DollarSign className="mr-2 h-4 w-4" /> Ajustar Saldo Inicial
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    updateAccount.mutate({
                                        id: account.id,
                                        data: { excludeFromStats: !(account as any).excludeFromStats }
                                    })
                                }}>
                                    {(account as any).excludeFromStats ? (
                                        <><Eye className="mr-2 h-4 w-4" /> Incluir en Estadísticas</>
                                    ) : (
                                        <><EyeOff className="mr-2 h-4 w-4" /> Excluir de Estadísticas</>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    updateAccount.mutate({
                                        id: account.id,
                                        data: { archived: !(account as any).archived }
                                    })
                                }}>
                                    {(account as any).archived ? (
                                        <><ArchiveRestore className="mr-2 h-4 w-4" /> Desarchivar</>
                                    ) : (
                                        <><Archive className="mr-2 h-4 w-4" /> Archivar</>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Chip & Signal - To look like a real card */}
                    <div className="flex items-center gap-3 mt-4 opacity-90">
                        <div className="w-10 h-8 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-600/50 relative overflow-hidden shadow-inner flex items-center justify-center">
                            <Cpu className="h-6 w-6 text-yellow-800/60 opacity-80" strokeWidth={1.5} />
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/30 to-black/0" />
                        </div>
                        <Signal className="h-6 w-6 rotate-90 text-white/60" />
                    </div>

                    {/* Balance / Card Number */}
                    <div className="mt-auto space-y-4">
                        {/* Número de cuenta/tarjeta - SOLO si existe */}
                        {account.accountType === 'CREDIT_CARD' && (account as any).lastFourDigits ? (
                            <div>
                                <div className="text-[10px] text-white/60 font-mono tracking-widest mb-1">
                                    NÚMERO DE TARJETA
                                </div>
                                <div className="font-mono text-lg tracking-widest text-white/90 drop-shadow-sm">
                                    **** **** **** {(account as any).lastFourDigits}
                                </div>
                            </div>
                        ) : account.accountNumber ? (
                            <div>
                                <div className="text-[10px] text-white/60 font-mono tracking-widest mb-1">
                                    NÚMERO DE CUENTA
                                </div>
                                <div className="font-mono text-lg tracking-widest text-white/90 drop-shadow-sm">
                                    **** **** **** {account.accountNumber}
                                </div>
                            </div>
                        ) : null}

                        {/* Monto - SIEMPRE en el mismo lugar */}
                        <div>
                            <div className="text-[10px] text-white/60 font-mono tracking-widest mb-1">
                                {account.accountType === 'CREDIT_CARD' ? 'DISPONIBLE' : 'SALDO ACTUAL'}
                            </div>
                            <div className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
                                {account.currencyCode === 'PEN' ? 'S/' : '$'} {account.accountType === 'CREDIT_CARD' ? ((account as any).creditLimit - (account as any).usedBalance).toFixed(2) : balance.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Footer: Details */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                            <span className="text-xs font-bold text-white uppercase tracking-wide">
                                {account.accountType === 'CREDIT_CARD' ? 'CRÉDITO' :
                                    account.accountType === 'BANK' ? 'DÉBITO' :
                                        account.accountType === 'DIGITAL' ? 'DIGITAL' :
                                            account.accountType === 'CASH' ? 'EFECTIVO' :
                                                account.accountType === 'PETTY_CASH' ? 'CAJA CHICA' :
                                                    account.accountType === 'INVESTMENT' ? 'INVERSIÓN' : 'CUENTA'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                            <span className="text-sm font-bold text-white">{account.currencyCode === 'PEN' ? 'S/' : '$'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal controlled by state */}
            <AccountFormModal
                account={account}
                open={showDetails}
                onOpenChange={setShowDetails}
            />

            {/* Adjust Initial Balance Modal */}
            <EditInitialBalanceModal
                account={{
                    id: account.id,
                    name: account.name,
                    initialBalance: Number(account.initialBalance),
                    currentBalance: Number(account.currentBalance),
                    currencyCode: account.currencyCode
                }}
                open={showEditBalance}
                onOpenChange={setShowEditBalance}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                // Don't allow closing if there's an error - user must read it
                if (!open && deleteError) return
                setShowDeleteDialog(open)
                if (!open) setDeleteError(null)
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteError ? '⚠️ No se puede eliminar' : '¿Eliminar cuenta?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                {deleteError ? (
                                    <div className="space-y-3">
                                        <div className="text-rose-600 font-medium">{deleteError}</div>
                                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                            <div className="font-semibold mb-2">Para eliminar esta cuenta:</div>
                                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                                <li>Ve a la página de Transacciones</li>
                                                <li>Filtra por la cuenta "{account.name}"</li>
                                                <li>Elimina todas las transacciones</li>
                                                <li>Regresa e intenta eliminar la cuenta nuevamente</li>
                                            </ol>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta "{account.name}".
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDeleteError(null)
                            setShowDeleteDialog(false)
                        }}>
                            {deleteError ? 'Entendido' : 'Cancelar'}
                        </AlertDialogCancel>
                        {!deleteError && (
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    try {
                                        await deleteAccount.mutateAsync(account.id)
                                        setShowDeleteDialog(false)
                                        setDeleteError(null)
                                    } catch (error: any) {
                                        // Show error in dialog instead of toast
                                        setDeleteError(error.message || 'Error al eliminar la cuenta')
                                    }
                                }}
                                className="bg-rose-500 hover:bg-rose-600"
                            >
                                Eliminar
                            </Button>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
