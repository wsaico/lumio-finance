"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, CreditCard as CreditCardIcon, Edit, Trash, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AccountFormModal } from "./account-form-modal"
import { EditInitialBalanceModal } from "./edit-initial-balance-modal"
import { cn } from "@/lib/utils"
import { useAccounts } from "@/hooks/use-accounts"
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
}

interface CreditCardDetailPanelProps {
    card: Account | null
}

export function CreditCardDetailPanel({ card }: CreditCardDetailPanelProps) {
    const router = useRouter()
    const { deleteAccount } = useAccounts()
    const [copied, setCopied] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditBalance, setShowEditBalance] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    if (!card) {
        return (
            <Card className="p-6 h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                    <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">Selecciona una cuenta para ver detalles</p>
                </div>
            </Card>
        )
    }

    const availableBalance = card.accountType === 'CREDIT_CARD'
        ? Number(card.creditLimit || 0) - Number(card.usedBalance || 0)
        : Number(card.currentBalance || 0)

    const cardNumber = card.lastFourDigits ? `•••• •••• •••• ${card.lastFourDigits}` : '•••• •••• •••• ••••'
    const expiryDate = card.expiryDate
        ? new Date(card.expiryDate).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
        : '••/••'

    const handleCopy = () => {
        if (card.lastFourDigits) {
            navigator.clipboard.writeText(card.lastFourDigits)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleDelete = async () => {
        try {
            setDeleteError(null)
            await deleteAccount.mutateAsync(card.id)
            setShowDeleteDialog(false)
        } catch (error: any) {
            setDeleteError(error.message || 'Error al eliminar la cuenta')
        }
    }

    const handleViewTransactions = () => {
        router.push(`/dashboard/accounts/${card.id}`)
    }

    return (
        <>
            <Card className="p-6 space-y-6 sticky top-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Detalles de Cuenta</h3>
                    <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Current Balance - Destacado */}
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {card.accountType === 'CREDIT_CARD' ? 'Saldo Disponible' : 'Saldo Actual'}
                    </p>
                    <p className="text-4xl font-bold tracking-tight">
                        {card.currencyCode === 'PEN' ? 'S/' : '$'}{availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>

                <div className="h-px bg-border" />

                {/* Detalles de Ciclo y Vencimiento - NUEVO */}
                {card.accountType === 'CREDIT_CARD' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Próximo Cierre</p>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Día {card.closingDay}</span>
                                {(() => {
                                    const now = new Date()
                                    const closingDay = Number(card.closingDay)
                                    let daysLeft = closingDay - now.getDate()
                                    if (daysLeft < 0) daysLeft += new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

                                    return (
                                        <Badge variant="outline" className={cn(
                                            "text-[10px]",
                                            daysLeft <= 3 ? "text-orange-600 border-orange-200 bg-orange-50" : ""
                                        )}>
                                            {daysLeft} días
                                        </Badge>
                                    )
                                })()}
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50 border space-y-1">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Límite Pago</p>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold">Día {card.paymentDueDay}</span>
                                {(() => {
                                    const now = new Date()
                                    const dueDay = Number(card.paymentDueDay)
                                    let daysLeft = dueDay - now.getDate()
                                    if (daysLeft < 0) daysLeft += new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

                                    return (
                                        <Badge variant="outline" className={cn(
                                            "text-[10px]",
                                            daysLeft <= 3 ? "text-destructive border-destructive/20 bg-destructive/5" : ""
                                        )}>
                                            {daysLeft} días
                                        </Badge>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-px bg-border" />

                {/* Details Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tipo de Red</span>
                        <span className="text-sm font-medium">
                            {card.accountType === 'CREDIT_CARD'
                                ? (card.cardNetwork?.toUpperCase() || 'VISA')
                                : card.accountType.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Titular</span>
                        <span className="text-sm font-medium">{card.name}</span>
                    </div>

                    {card.lastFourDigits && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Número de Tarjeta</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">{cardNumber}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {card.accountType === 'CREDIT_CARD' && card.creditLimit && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Uso de Línea</span>
                                <span className="font-medium">
                                    {((Number(card.usedBalance || 0) / Number(card.creditLimit)) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all",
                                        (Number(card.usedBalance || 0) / Number(card.creditLimit)) > 0.8 ? "bg-destructive" : "bg-primary"
                                    )}
                                    style={{ width: `${Math.min(100, (Number(card.usedBalance || 0) / Number(card.creditLimit)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estatus de Cuenta</span>
                        <Badge variant={card.isActive ? "default" : "secondary"} className={card.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
                            {card.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                    </div>
                </div>

                <div className="h-px bg-border" />

                {/* Acciones Reales del Sistema */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold mb-3">Acciones</h4>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar Cuenta
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => setShowEditBalance(true)}
                    >
                        <CreditCardIcon className="h-4 w-4 mr-2" />
                        Ajustar Saldo
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        size="sm"
                        onClick={handleViewTransactions}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Transacciones
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash className="h-4 w-4 mr-2" />
                        Eliminar Cuenta
                    </Button>
                </div>
            </Card>

            {/* Modales Funcionales */}
            <AccountFormModal
                account={card as any}
                open={showEditModal}
                onOpenChange={setShowEditModal}
            />

            {card && (
                <EditInitialBalanceModal
                    account={{
                        id: card.id,
                        name: card.name,
                        initialBalance: Number(card.initialBalance || 0),
                        currentBalance: Number(card.currentBalance || 0),
                        currencyCode: card.currencyCode
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
                            Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta "{card.name}".
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
