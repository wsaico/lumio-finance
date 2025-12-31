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

interface PaymentModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (data: PaymentFormData) => void
    loan: {
        id: string
        contactName: string
        outstandingBalance: number
        currencyCode: string
        type: 'RECEIVABLE' | 'PAYABLE'
    } | null
    isLoading?: boolean
}

export interface PaymentFormData {
    paymentAmount: number
    accountId: string
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK' | 'CARD' | 'OTHER'
    notes?: string
}

export function PaymentModal({ open, onClose, onSubmit, loan, isLoading }: PaymentModalProps) {
    const { formatMoney } = useFormat()
    const { accounts, isLoading: accountsLoading } = useAccounts()

    const [formData, setFormData] = useState<PaymentFormData>({
        paymentAmount: 0,
        accountId: '',
        paymentMethod: 'TRANSFER',
        notes: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset form when modal opens/closes or loan changes
    useEffect(() => {
        if (open && loan) {
            setFormData({
                paymentAmount: loan.outstandingBalance, // Default to full payment
                accountId: '',
                paymentMethod: 'TRANSFER',
                notes: '',
            })
            setErrors({})
        }
    }, [open, loan])

    if (!loan) return null

    const isReceivable = loan.type === 'RECEIVABLE'

    // Balance validation (only for PAYABLE - when paying debt, balance decreases)
    // For RECEIVABLE (collecting), balance increases so no validation needed
    const balanceValidation = useBalanceValidation(
        !isReceivable ? formData.accountId : undefined,
        !isReceivable ? formData.paymentAmount : 0,
        accounts?.map((a: any) => ({
            id: a.id,
            name: a.name,
            balance: a.currentBalance,
            currencyCode: a.currencyCode
        }))
    )

    // Get selected account for preview
    const selectedAccount = accounts?.find((a: any) => a.id === formData.accountId)

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.paymentAmount || formData.paymentAmount <= 0) {
            newErrors.paymentAmount = 'El monto debe ser mayor a 0'
        }

        if (formData.paymentAmount > loan.outstandingBalance) {
            newErrors.paymentAmount = 'El monto excede el saldo pendiente'
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (validate()) {
            onSubmit(formData)
        }
    }

    const isFullPayment = formData.paymentAmount === loan.outstandingBalance
    const remainingAfterPayment = loan.outstandingBalance - (formData.paymentAmount || 0)

    // Filter accounts by currency
    const filteredAccounts = (accounts as any)?.filter((acc: any) => acc.currencyCode === loan.currencyCode) || []

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {isReceivable ? '💰 Registrar Cobro' : '💸 Registrar Pago'}
                    </DialogTitle>
                    <DialogDescription>
                        {isReceivable
                            ? `Registrar pago recibido de ${loan.contactName}`
                            : `Registrar pago realizado a ${loan.contactName}`
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Outstanding balance info */}
                    <div className={cn(
                        "p-4 rounded-lg border",
                        isReceivable ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"
                    )}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                                Saldo pendiente:
                            </span>
                            <span className="text-xl font-bold">
                                {formatMoney(loan.outstandingBalance, loan.currencyCode)}
                            </span>
                        </div>
                    </div>

                    {/* Payment amount */}
                    <div className="space-y-2">
                        <Label htmlFor="paymentAmount">
                            Monto del pago <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground w-4 text-center">
                                {loan.currencyCode === 'PEN' ? 'S/.' : loan.currencyCode === 'USD' ? '$' : loan.currencyCode === 'EUR' ? '€' : '$'}
                            </div>
                            <Input
                                id="paymentAmount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={loan.outstandingBalance}
                                placeholder="0.00"
                                value={formData.paymentAmount || ''}
                                onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                                className={cn("pl-10", errors.paymentAmount && "border-red-500")}
                            />
                        </div>
                        {errors.paymentAmount && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.paymentAmount}
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, paymentAmount: loan.outstandingBalance / 2 })}
                            >
                                50%
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setFormData({ ...formData, paymentAmount: loan.outstandingBalance })}
                            >
                                Pago total
                            </Button>
                        </div>
                    </div>

                    {/* Account selector */}
                    <div className="space-y-2">
                        <Label htmlFor="accountId">
                            Cuenta {isReceivable ? 'de destino' : 'de origen'} <span className="text-red-500">*</span>
                        </Label>
                        <AccountSelect
                            value={formData.accountId}
                            onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                            currencyCode={loan.currencyCode}
                            className={cn(errors.accountId && "border-red-500")}
                            allowAdd={false}
                        />
                        {errors.accountId && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {errors.accountId}
                            </p>
                        )}
                    </div>

                    {/* Payment method */}
                    <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Método de pago</Label>
                        <Select
                            value={formData.paymentMethod}
                            onValueChange={(value: any) => setFormData({ ...formData, paymentMethod: value })}
                        >
                            <SelectTrigger>
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

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Input
                            id="notes"
                            placeholder="Agrega una nota sobre este pago..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Balance Validation & Preview (only for PAYABLE) */}
                    {!isReceivable && formData.paymentAmount > 0 && formData.accountId && selectedAccount && (
                        <div className="space-y-3">
                            {/* Balance Preview */}
                            <BalancePreview
                                currentBalance={selectedAccount.currentBalance}
                                amount={formData.paymentAmount}
                                balanceAfter={balanceValidation?.details.balanceAfter || 0}
                                currencyCode={loan.currencyCode}
                            />

                            {/* Balance Alert */}
                            <BalanceAlert
                                validation={balanceValidation}
                                currencyCode={loan.currencyCode}
                            />
                        </div>
                    )}

                    {/* Summary */}
                    {formData.paymentAmount > 0 && (
                        <div className={cn(
                            "p-4 rounded-lg border space-y-2",
                            isFullPayment ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                        )}>
                            <div className="flex items-center gap-2">
                                {isFullPayment ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <span className="font-medium text-green-700">Pago completo</span>
                                    </>
                                ) : (
                                    <span className="font-medium">Pago parcial</span>
                                )}
                            </div>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Saldo actual:</span>
                                    <span className="font-medium">{formatMoney(loan.outstandingBalance, loan.currencyCode)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Monto del pago:</span>
                                    <span className="font-medium text-blue-600">-{formatMoney(formData.paymentAmount, loan.currencyCode)}</span>
                                </div>
                                <div className="h-px bg-border my-2" />
                                <div className="flex justify-between">
                                    <span className="font-medium">Saldo restante:</span>
                                    <span className="font-bold">
                                        {formatMoney(remainingAfterPayment, loan.currencyCode)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || (!isReceivable && balanceValidation && !balanceValidation.valid) || false}
                        >
                            {isLoading
                                ? 'Procesando...'
                                : (!isReceivable && balanceValidation && !balanceValidation.valid)
                                    ? 'Saldo insuficiente'
                                    : isFullPayment
                                        ? 'Marcar como Pagado'
                                        : 'Registrar Pago'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
