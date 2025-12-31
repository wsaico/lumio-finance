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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAccounts } from "@/hooks/use-accounts"
import { AccountSelect } from "@/components/accounts/account-select"
import { useCreateAccountReceivable } from "@/hooks/use-accounts-receivable"
import { useCreateAccountPayable } from "@/hooks/use-accounts-payable"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useFormat } from "@/hooks/use-format"
import { useBalanceValidation } from "@/hooks/use-balance-validation"
import { BalanceAlert } from "@/components/ui/balance-alert"
import { BalancePreview } from "@/components/ui/balance-preview"
import { DollarSign, Wallet, Calendar, AlertCircle, User, Mail, Phone, ArrowUpRight, ArrowDownLeft, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CreateLoanModalProps {
    open: boolean
    onClose: () => void
}

type LoanType = 'RECEIVABLE' | 'PAYABLE'

interface LoanFormData {
    type: LoanType
    contactName: string
    contactEmail: string
    contactPhone: string
    amount: number
    currencyCode: string
    accountId: string
    dueDate: string
    notes: string
    interestRate: number
}

export function CreateLoanModal({ open, onClose }: CreateLoanModalProps) {
    const { currencyCode: systemCurrency } = useSettingsStore()
    const { formatMoney } = useFormat()
    const { accounts, isLoading: accountsLoading } = useAccounts()
    const createReceivable = useCreateAccountReceivable()
    const createPayable = useCreateAccountPayable()

    const [formData, setFormData] = useState<LoanFormData>({
        type: 'RECEIVABLE',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        amount: 0,
        currencyCode: systemCurrency || 'PEN',
        accountId: '',
        dueDate: '',
        notes: '',
        interestRate: 0,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            setFormData({
                type: 'RECEIVABLE',
                contactName: '',
                contactEmail: '',
                contactPhone: '',
                amount: 0,
                currencyCode: systemCurrency || 'PEN',
                accountId: '',
                dueDate: '',
                notes: '',
                interestRate: 0,
            })
            setErrors({})
        }
    }, [open, systemCurrency])

    const isReceivable = formData.type === 'RECEIVABLE'

    // Balance validation for RECEIVABLE (lending money - account balance decreases)
    // For PAYABLE (borrowing money), balance increases so no validation needed
    const balanceValidation = useBalanceValidation(
        isReceivable ? formData.accountId : undefined,
        isReceivable ? formData.amount : 0,
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

        if (!formData.contactName.trim()) {
            newErrors.contactName = 'El nombre es requerido'
        }

        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Email inválido'
        }

        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = 'El monto debe ser mayor a 0'
        }

        if (!formData.accountId) {
            newErrors.accountId = 'Debes seleccionar una cuenta'
        }

        // Balance validation for RECEIVABLE (lending money)
        if (isReceivable && balanceValidation && !balanceValidation.valid) {
            newErrors.amount = balanceValidation.message || 'Saldo insuficiente'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        try {
            const payload = {
                contactName: formData.contactName,
                contactEmail: formData.contactEmail || undefined,
                contactPhone: formData.contactPhone || undefined,
                amount: formData.amount,
                currencyCode: formData.currencyCode,
                accountId: formData.accountId,
                dueDate: formData.dueDate || undefined,
                notes: formData.notes || undefined,
                interestRate: formData.interestRate || 0,
            }

            if (formData.type === 'RECEIVABLE') {
                await createReceivable.mutateAsync(payload)
            } else {
                await createPayable.mutateAsync(payload)
            }

            onClose()
        } catch (error) {
            console.error('Error creating loan:', error)
        }
    }

    const isLoading = createReceivable.isPending || createPayable.isPending

    // Filter accounts by currency
    const filteredAccounts = accounts?.filter((acc: any) => acc.currencyCode === formData.currencyCode) || []

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Préstamo</DialogTitle>
                    <DialogDescription>
                        Registra un préstamo que otorgaste o una deuda que recibiste
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Loan Type Tabs */}
                    <Tabs
                        value={formData.type}
                        onValueChange={(v) => setFormData({ ...formData, type: v as LoanType })}
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="RECEIVABLE" className="gap-2">
                                <ArrowUpRight className="h-4 w-4" />
                                Prestado (Por Cobrar)
                            </TabsTrigger>
                            <TabsTrigger value="PAYABLE" className="gap-2">
                                <ArrowDownLeft className="h-4 w-4" />
                                Recibido (Por Pagar)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="RECEIVABLE" className="mt-4">
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 flex items-start gap-2">
                                <ArrowUpRight className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <strong>Préstamo otorgado:</strong> Registra dinero que prestaste a alguien
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="PAYABLE" className="mt-4">
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-700 flex items-start gap-2">
                                <ArrowDownLeft className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <strong>Préstamo recibido:</strong> Registra dinero que te prestaron
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground">Información del Contacto</h4>

                        <div className="space-y-2">
                            <Label htmlFor="contactName">
                                Nombre completo <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="contactName"
                                    placeholder={isReceivable ? "A quién le prestaste" : "De quién recibiste"}
                                    value={formData.contactName}
                                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                    className={cn("pl-10", errors.contactName && "border-red-500")}
                                />
                            </div>
                            {errors.contactName && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {errors.contactName}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contactEmail">Email (opcional)</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="contactEmail"
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className={cn("pl-10", errors.contactEmail && "border-red-500")}
                                    />
                                </div>
                                {errors.contactEmail && (
                                    <p className="text-xs text-red-500">{errors.contactEmail}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactPhone">Teléfono (opcional)</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="contactPhone"
                                        placeholder="999 999 999"
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground">Detalles Financieros</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">
                                    Monto <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground w-4 text-center">
                                        {formData.currencyCode === 'PEN' ? 'S/.' : formData.currencyCode === 'USD' ? '$' : formData.currencyCode === 'EUR' ? '€' : '$'}
                                    </div>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                        className={cn("pl-10", errors.amount && "border-red-500")}
                                    />
                                </div>
                                {errors.amount && (
                                    <p className="text-xs text-red-500">{errors.amount}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accountId">
                                    Cuenta {isReceivable ? 'de origen (Desde donde sale)' : 'de destino (Donde ingresa)'} <span className="text-red-500">*</span>
                                </Label>
                                <AccountSelect
                                    value={formData.accountId}
                                    onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                                    currencyCode={formData.currencyCode}
                                    className={cn(errors.accountId && "border-red-500")}
                                    allowAdd={false}
                                />
                                {errors.accountId && (
                                    <p className="text-xs text-red-500">{errors.accountId}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {isReceivable
                                        ? "Cuenta desde donde sale el dinero"
                                        : "Cuenta donde ingresa el dinero"
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Fecha de vencimiento (opcional)</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="interestRate">Tasa de interés % (opcional)</Label>
                                <Input
                                    id="interestRate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    placeholder="0.00"
                                    value={formData.interestRate || ''}
                                    onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Input
                            id="notes"
                            placeholder="Agrega detalles adicionales sobre el préstamo..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Balance Validation & Preview (only for RECEIVABLE) */}
                    {isReceivable && formData.amount > 0 && formData.accountId && selectedAccount && (
                        <div className="space-y-3">
                            {/* Balance Preview */}
                            <BalancePreview
                                currentBalance={selectedAccount.currentBalance}
                                amount={formData.amount}
                                balanceAfter={balanceValidation?.details.balanceAfter || 0}
                                currencyCode={formData.currencyCode}
                            />

                            {/* Balance Alert */}
                            <BalanceAlert
                                validation={balanceValidation}
                                currencyCode={formData.currencyCode}
                            />
                        </div>
                    )}

                    {/* Summary Preview */}
                    {formData.amount > 0 && (
                        <div className={cn(
                            "p-4 rounded-lg border",
                            isReceivable ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"
                        )}>
                            <h4 className="font-semibold mb-2">Resumen</h4>
                            <div className="text-sm space-y-1">
                                <p>
                                    {isReceivable
                                        ? `Prestarás ${formatMoney(formData.amount, formData.currencyCode)} a ${formData.contactName || '...'}`
                                        : `Recibirás ${formatMoney(formData.amount, formData.currencyCode)} de ${formData.contactName || '...'}`
                                    }
                                </p>
                                {formData.dueDate && (
                                    <p className="text-muted-foreground">
                                        Vencimiento: {new Date(formData.dueDate).toLocaleDateString('es-PE')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || (isReceivable && balanceValidation && !balanceValidation.valid) || false}
                        >
                            {isLoading
                                ? 'Creando...'
                                : (isReceivable && balanceValidation && !balanceValidation.valid)
                                    ? 'Saldo insuficiente'
                                    : 'Crear Préstamo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent >
        </Dialog >
    )
}
