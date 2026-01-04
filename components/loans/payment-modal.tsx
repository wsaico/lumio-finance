"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AccountSelect } from "@/components/accounts/account-select"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
import { useBalanceValidation } from "@/hooks/use-balance-validation"
import { BalanceAlert } from "@/components/ui/balance-alert"
import { BalancePreview } from "@/components/ui/balance-preview"
import { DollarSign, Wallet, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface PaymentModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (data: PaymentFormData) => void
    loan: {
        id: string
        contactName: string
        outstandingBalance: number
        totalPendingAmount?: number
        currencyCode: string
        type: 'RECEIVABLE' | 'PAYABLE'
        paymentFrequency?: string
        nextInstallment?: {
            number: number
            amount: number
            dueDate: string
            principal: number
            interest: number
        } | null
    } | null
    isLoading?: boolean
}

export interface PaymentFormData {
    paymentAmount: number
    principalAmount: number
    interestAmount: number
    accountId: string
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER'
    notes?: string
}

export function PaymentModal({ open, onClose, onSubmit, loan, isLoading }: PaymentModalProps) {
    const { formatMoney } = useFormat()
    const { accounts, isLoading: accountsLoading } = useAccounts()

    const [formData, setFormData] = useState<PaymentFormData>({
        paymentAmount: 0,
        principalAmount: 0,
        interestAmount: 0,
        accountId: '',
        paymentMethod: 'TRANSFER',
        notes: '',
    })

    const [showDetails, setShowDetails] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset form when modal opens/closes or loan changes
    useEffect(() => {
        if (open && loan) {
            // Smart Logic: If there is a next installment, suggest that amount
            // Otherwise, suggest full balance
            const suggestedAmount = loan.nextInstallment
                ? loan.nextInstallment.amount
                : loan.outstandingBalance

            setFormData({
                paymentAmount: suggestedAmount,
                principalAmount: loan.nextInstallment ? loan.nextInstallment.principal : loan.outstandingBalance,
                interestAmount: loan.nextInstallment ? loan.nextInstallment.interest : 0,
                accountId: '',
                paymentMethod: 'TRANSFER',
                notes: loan.nextInstallment ? `Cuota #${loan.nextInstallment.number}` : '',
            })
            setShowDetails(false)
            setErrors({})
        }
    }, [open, loan])

    // Balance validation (only for PAYABLE - when paying debt, balance decreases)
    // For RECEIVABLE (collecting), balance increases so no validation needed
    const balanceValidation = useBalanceValidation(
        loan && loan.type !== 'RECEIVABLE' ? formData.accountId : undefined,
        loan && loan.type !== 'RECEIVABLE' ? formData.paymentAmount : 0,
        accounts?.map((a: any) => ({
            id: a.id,
            name: a.name,
            balance: a.currentBalance,
            currencyCode: a.currencyCode
        }))
    )

    if (!loan) return null

    const isReceivable = loan.type === 'RECEIVABLE'

    // Get selected account for preview
    const selectedAccount = accounts?.find((a: any) => a.id === formData.accountId)

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (formData.paymentAmount <= 0) {
            newErrors.paymentAmount = 'El monto debe ser mayor a 0'
        }

        // Fix: Allow paymentAmount to exceed outstandingBalance IF it's due to interest.
        // The real limit is: Principal Component <= Outstanding Balance
        const principalComponent = formData.principalAmount || formData.paymentAmount

        if (principalComponent > (loan.outstandingBalance + 0.01)) { // Small buffer
            newErrors.paymentAmount = 'El abono a capital excede el saldo pendiente'
        }

        if (!formData.accountId) {
            newErrors.accountId = 'Debes seleccionar una cuenta'
        }

        // Balance validation for PAYABLE (paying debt)
        if (!isReceivable && balanceValidation && !balanceValidation.valid) {
            newErrors.paymentAmount = balanceValidation.message || 'Saldo insuficiente'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!formData.accountId) {
            toast.error("Por favor selecciona una cuenta")
            setErrors(prev => ({ ...prev, accountId: "Por favor selecciona una cuenta" }));
            return
        }

        if (formData.paymentAmount <= 0) {
            toast.error("El monto debe ser mayor a 0")
            setErrors(prev => ({ ...prev, paymentAmount: "El monto debe ser mayor a 0" }));
            return
        }

        if (validate()) {
            onSubmit(formData)
        }
    }

    const isFullPayment = formData.paymentAmount === loan.outstandingBalance
    // Fix: Remaining balance should strictly subtract PRINCIPAL, not total payment (which may include interest)
    const remainingAfterPayment = loan.outstandingBalance - (formData.principalAmount || 0)

    // Filter accounts by currency
    const filteredAccounts = (accounts as any)?.filter((acc: any) => acc.currencyCode === loan.currencyCode) || []

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl bg-zinc-50 dark:bg-zinc-950 flex flex-col max-h-[90vh]">
                <DialogHeader className={cn(
                    "p-6 text-white bg-gradient-to-r shrink-0",
                    isReceivable
                        ? "from-blue-600 to-cyan-600"
                        : "from-orange-500 to-amber-600"
                )}>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        {isReceivable ? <Wallet className="h-6 w-6" /> : <DollarSign className="h-6 w-6" />}
                        {isReceivable ? 'Registrar Cobro' : 'Registrar Pago'}
                    </DialogTitle>
                    <DialogDescription className="text-blue-100/90 text-sm mt-1">
                        {isReceivable
                            ? `Registrando ingreso de ${loan.contactName}`
                            : `Registrando egreso para ${loan.contactName}`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">

                    {/* Smart Context Banner */}
                    {loan.paymentFrequency && loan.paymentFrequency !== 'SINGLE' && (
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-xl flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Frecuencia de Pago</span>
                                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                    {loan.paymentFrequency === 'WEEKLY' ? 'Semanal' :
                                        loan.paymentFrequency === 'BIWEEKLY' ? 'Quincenal' :
                                            loan.paymentFrequency === 'MONTHLY' ? 'Mensual' : loan.paymentFrequency}
                                </span>
                            </div>
                            {loan.nextInstallment && (
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Siguiente Cuota</span>
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0">
                                        Cuota #{loan.nextInstallment.number}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount Input Section */}
                    <div className="space-y-4">
                        <div className="relative">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 flex justify-between">
                                <span>Monto a {isReceivable ? 'Cobrar' : 'Pagar'}</span>
                                {loan.nextInstallment && (
                                    <span className="text-primary font-bold animate-pulse">
                                        Cuota #{loan.nextInstallment.number}
                                    </span>
                                )}
                            </Label>
                            <div className="relative group">
                                <span className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold transition-colors",
                                    isReceivable ? "text-blue-600" : "text-orange-500"
                                )}>
                                    {loan.currencyCode === 'PEN' ? 'S/.' : loan.currencyCode === 'USD' ? '$' : loan.currencyCode === 'EUR' ? '€' : '$'}
                                </span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={loan.outstandingBalance * 2}
                                    value={formData.paymentAmount || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0
                                        setFormData({
                                            ...formData,
                                            paymentAmount: val,
                                            principalAmount: Math.min(val, loan.outstandingBalance),
                                            interestAmount: Math.max(0, val - loan.outstandingBalance)
                                        })
                                    }}
                                    className="pl-12 h-16 text-3xl font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm focus-visible:ring-0 focus-visible:border-primary transition-all rounded-xl"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Use totalPendingAmount if available, else standard balance
                                    // 50% of the TOTAL DEBT (Principal + Interest)
                                    const baseAmount = loan.totalPendingAmount || loan.outstandingBalance
                                    const amount = parseFloat((baseAmount / 2).toFixed(2))

                                    setFormData({
                                        ...formData,
                                        paymentAmount: amount,
                                        principalAmount: Math.min(amount, loan.outstandingBalance),
                                        interestAmount: Math.max(0, parseFloat((amount - loan.outstandingBalance).toFixed(2)))
                                    })
                                }}
                                className="flex-1 rounded-lg border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground text-muted-foreground font-medium"
                            >
                                50%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    // Total Payment covers EVERYTHING (Principal + Interest)
                                    const totalAmount = loan.totalPendingAmount || loan.outstandingBalance

                                    setFormData({
                                        ...formData,
                                        paymentAmount: totalAmount,
                                        principalAmount: Math.min(totalAmount, loan.outstandingBalance),
                                        interestAmount: Math.max(0, parseFloat((totalAmount - loan.outstandingBalance).toFixed(2)))
                                    })
                                }}
                                className={cn(
                                    "flex-1 rounded-lg border-zinc-200 dark:border-zinc-800 font-medium transition-colors",
                                    (formData.paymentAmount === (loan.totalPendingAmount || loan.outstandingBalance))
                                        ? isReceivable ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground"
                                )}
                            >
                                Pago Total
                            </Button>
                        </div>

                        {/* Advanced Toggle */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                            >
                                {showDetails ? 'Ocultar desglose' : 'Opciones avanzadas'}
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", showDetails ? "bg-primary" : "bg-muted-foreground group-hover:bg-primary")} />
                            </button>
                        </div>

                        {/* Expert Fields */}
                        {showDetails && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 animate-in slide-in-from-top-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground pl-1">Abono a Capital</Label>
                                    <Input
                                        type="number"
                                        value={formData.principalAmount}
                                        onChange={(e) => setFormData({ ...formData, principalAmount: parseFloat(e.target.value) || 0 })}
                                        className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground pl-1">Interés / Ganancia</Label>
                                    <Input
                                        type="number"
                                        value={formData.interestAmount}
                                        onChange={(e) => setFormData({ ...formData, interestAmount: parseFloat(e.target.value) || 0 })}
                                        className="h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-semibold text-emerald-600"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Cuenta</Label>
                            <AccountSelect
                                value={formData.accountId}
                                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                                currencyCode={loan.currencyCode}
                                className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                allowAdd={false}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Método</Label>
                                <Select
                                    value={formData.paymentMethod}
                                    onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
                                >
                                    <SelectTrigger className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Efectivo</SelectItem>
                                        <SelectItem value="TRANSFER">Transferencia</SelectItem>
                                        <SelectItem value="CHECK">Cheque</SelectItem>
                                        <SelectItem value="CARD">Tarjeta</SelectItem>
                                        <SelectItem value="OTHER">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Nota</Label>
                                <Input
                                    placeholder="Opcional..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="h-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Ticket */}
                    {formData.paymentAmount > 0 && (
                        <div className={cn(
                            "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
                            isFullPayment
                                ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                                : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800"
                        )}>
                            {isFullPayment && (
                                <div className="absolute right-0 top-0 p-2">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-500/20" />
                                </div>
                            )}

                            <div className="space-y-1 relative z-10">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Saldo Pendiente (Capital)</span>
                                    <span className="font-medium text-foreground">{formatMoney(loan.outstandingBalance, loan.currencyCode)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">
                                        {formData.principalAmount < formData.paymentAmount ? "Abono a Capital" : "Nuevo Pago"}
                                    </span>
                                    <span className={cn(
                                        "font-bold",
                                        isReceivable ? "text-blue-600" : "text-orange-600"
                                    )}>
                                        - {formatMoney(formData.principalAmount, loan.currencyCode)}
                                    </span>
                                </div>

                                {formData.interestAmount > 0 && (
                                    <div className="flex justify-between items-center text-xs opacity-70 mt-1 pl-2 border-l-2 border-emerald-500/30">
                                        <span className="text-muted-foreground">Interés / Ganancia</span>
                                        <span className="text-emerald-600 font-medium">
                                            {formatMoney(formData.interestAmount, loan.currencyCode)}
                                        </span>
                                    </div>
                                )}

                                <div className="my-2 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">Saldo Restante</span>
                                    <span className={cn(
                                        "text-lg font-black",
                                        remainingAfterPayment <= 0.01 ? "text-emerald-600" : "text-foreground"
                                    )}>
                                        {formatMoney(remainingAfterPayment, loan.currencyCode)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-2 gap-2 sm:gap-0 shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl h-12">
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
                        disabled={isLoading || (!isReceivable && balanceValidation && !balanceValidation.valid) || false}
                        className={cn(
                            "flex-1 rounded-xl h-12 text-base font-semibold shadow-lg transition-all hover:scale-[1.02]",
                            isReceivable
                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-blue-500/25"
                                : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-orange-500/25"
                        )}
                    >
                        {isLoading ? 'Procesando...' : isFullPayment ? 'Confirmar Pago Total' : 'Registrar Pago'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
