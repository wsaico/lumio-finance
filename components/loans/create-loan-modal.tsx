"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { AccountSelect } from "@/components/accounts/account-select"
import { useCreateAccountReceivable } from "@/hooks/use-accounts-receivable"
import { useCreateAccountPayable } from "@/hooks/use-accounts-payable"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useFormat } from "@/hooks/use-format"
import { useBalanceValidation } from "@/hooks/use-balance-validation"
import { BalanceAlert } from "@/components/ui/balance-alert"
import {
    ArrowUpRight,
    ArrowDownLeft,
    User,
    Mail,
    Calendar,
    ChevronRight,
    ArrowLeft,
    Loader2,
    Receipt,
    Wallet,
    CalendarClock,
    Percent,
    CheckCircle2,
    DollarSign,
    PiggyBank,
    Banknote
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths, addWeeks, addDays } from "date-fns"
import { es } from "date-fns/locale"

interface CreateLoanModalProps {
    open: boolean
    onClose: () => void
}

type LoanType = 'RECEIVABLE' | 'PAYABLE'
type WizardStep = 'basics' | 'schedule'

interface LoanFormData {
    type: LoanType
    contactName: string
    contactEmail: string
    amount: number
    currencyCode: string
    accountId: string
    dueDate: string
    notes: string
    interestRate: number
    interestType: 'SIMPLE' | 'COMPOUND'
    paymentFrequency: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'SINGLE'
    totalInstallments: number
}

export function CreateLoanModal({ open, onClose }: CreateLoanModalProps) {
    const { currencyCode: systemCurrency } = useSettingsStore()
    const { formatMoney } = useFormat()
    const { accounts } = useAccounts()
    const createReceivable = useCreateAccountReceivable()
    const createPayable = useCreateAccountPayable()

    const [step, setStep] = useState<WizardStep>('basics')

    // Initial State
    const [formData, setFormData] = useState<LoanFormData>({
        type: 'RECEIVABLE',
        contactName: '',
        contactEmail: '',
        amount: 0,
        currencyCode: systemCurrency || 'PEN',
        accountId: '',
        dueDate: '',
        notes: '',
        interestRate: 0,
        interestType: 'SIMPLE',
        paymentFrequency: 'MONTHLY',
        totalInstallments: 1,
    })

    // Reset on Open
    useEffect(() => {
        if (open) {
            setStep('basics')
            setFormData({
                type: 'RECEIVABLE',
                contactName: '',
                contactEmail: '',
                amount: 0,
                currencyCode: systemCurrency || 'PEN',
                accountId: '',
                dueDate: new Date().toISOString().split('T')[0], // Default to today
                notes: '',
                interestRate: 0,
                interestType: 'SIMPLE',
                paymentFrequency: 'MONTHLY',
                totalInstallments: 1,
            })
        }
    }, [open, systemCurrency])

    const isReceivable = formData.type === 'RECEIVABLE'
    const isLoading = createReceivable.isPending || createPayable.isPending

    // Balance Validation
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

    // Schedule Preview Calculation
    const schedulePreview = useMemo(() => {
        if (formData.amount <= 0 || formData.totalInstallments < 1) return []

        const installments = []
        const principalPart = formData.amount / formData.totalInstallments

        // Simple Interest logic for preview
        const totalInterest = formData.amount * (formData.interestRate / 100)
        const interestPart = totalInterest / formData.totalInstallments
        const totalPart = principalPart + interestPart

        let currentDate = formData.dueDate ? new Date(formData.dueDate) : new Date()

        for (let i = 0; i < formData.totalInstallments; i++) {
            installments.push({
                number: i + 1,
                date: new Date(currentDate),
                amount: totalPart
            })

            // Advance date
            if (formData.paymentFrequency === 'MONTHLY') currentDate = addMonths(currentDate, 1)
            else if (formData.paymentFrequency === 'WEEKLY') currentDate = addWeeks(currentDate, 1)
            else if (formData.paymentFrequency === 'BIWEEKLY') currentDate = addDays(currentDate, 14)
        }
        return installments
    }, [formData.amount, formData.totalInstallments, formData.interestRate, formData.dueDate, formData.paymentFrequency])


    const handleSubmit = async () => {
        try {
            const payload = {
                contactName: formData.contactName,
                contactEmail: formData.contactEmail || undefined,
                amount: formData.amount,
                currencyCode: formData.currencyCode,
                accountId: formData.accountId,
                dueDate: formData.dueDate, // Start Date for schedule
                notes: formData.notes || undefined,
                interestRate: formData.interestRate || 0,
                interestType: formData.interestType,
                paymentFrequency: formData.paymentFrequency,
                totalInstallments: formData.totalInstallments,
            }

            if (isReceivable) {
                await createReceivable.mutateAsync(payload)
            } else {
                await createPayable.mutateAsync(payload)
            }
            onClose()
        } catch (error) {
            console.error('Submission failed', error)
        }
    }

    // Render Steps
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-none shadow-2xl rounded-3xl">

                {/* Header Gradient */}
                <div className={cn(
                    "h-2 w-full bg-gradient-to-r",
                    isReceivable ? "from-blue-500 via-cyan-400 to-blue-600" : "from-orange-500 via-amber-400 to-orange-600"
                )} />

                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {step === 'basics' ? (
                            <>
                                <Banknote className={cn("w-6 h-6", isReceivable ? "text-blue-500" : "text-orange-500")} />
                                Nuevo Préstamo
                            </>
                        ) : (
                            <>
                                <CalendarClock className={cn("w-6 h-6", isReceivable ? "text-blue-500" : "text-orange-500")} />
                                Configurar Pagos
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* STEP 1: BASICS */}
                    {step === 'basics' && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">

                            {/* Visual Type Selector */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'RECEIVABLE' })}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02]",
                                        isReceivable
                                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors",
                                        isReceivable ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                        <ArrowUpRight className="w-6 h-6" />
                                    </div>
                                    <span className={cn("font-bold text-sm", isReceivable ? "text-blue-700 dark:text-blue-300" : "text-zinc-500")}>
                                        Yo Presté
                                    </span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Salida de dinero</span>

                                    {isReceivable && <div className="absolute top-3 right-3 text-blue-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'PAYABLE' })}
                                    className={cn(
                                        "relative group flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02]",
                                        !isReceivable
                                            ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors",
                                        !isReceivable ? "bg-orange-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                        <ArrowDownLeft className="w-6 h-6" />
                                    </div>
                                    <span className={cn("font-bold text-sm", !isReceivable ? "text-orange-700 dark:text-orange-300" : "text-zinc-500")}>
                                        Me Prestaron
                                    </span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Ingreso de dinero</span>

                                    {!isReceivable && <div className="absolute top-3 right-3 text-orange-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                </button>
                            </div>

                            {/* Who & Amount */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                                        {isReceivable ? "¿A quién le prestaste?" : "¿Quién te prestó?"}
                                    </Label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                        <Input
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                            placeholder="Nombre de la persona o entidad"
                                            className="h-14 pl-12 rounded-xl text-lg font-medium bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 ring-offset-0 focus:ring-opacity-50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                                        Monto
                                    </Label>
                                    <div className="relative group">
                                        <span className={cn(
                                            "absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black transition-colors",
                                            isReceivable ? "text-blue-500" : "text-orange-500"
                                        )}>
                                            {formData.currencyCode === 'PEN' ? 'S/' : '$'}
                                        </span>
                                        <Input
                                            type="number"
                                            value={formData.amount || ''}
                                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                            className={cn(
                                                "h-20 pl-14 pr-4 rounded-2xl text-4xl font-black bg-white dark:bg-zinc-900 border-2 transition-all",
                                                !formData.amount && "text-muted-foreground/30",
                                                isReceivable
                                                    ? "focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                                                    : "focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Cuenta {isReceivable ? 'Origen' : 'Destino'}</Label>
                                        <AccountSelect
                                            value={formData.accountId}
                                            onValueChange={(v) => setFormData({ ...formData, accountId: v })}
                                            currencyCode={formData.currencyCode}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Fecha {isReceivable ? 'Entrega' : 'Recepción'}</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="date"
                                                value={formData.dueDate}
                                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                                className="pl-10 rounded-xl bg-white dark:bg-zinc-900 h-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isReceivable && formData.accountId && (
                                    <BalanceAlert validation={balanceValidation} currencyCode={formData.currencyCode} />
                                )}
                            </div>
                        </div>
                    )}


                    {/* STEP 2: SCHEDULE */}
                    {step === 'schedule' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                            {/* Summary Card */}
                            <div className={cn(
                                "p-4 rounded-2xl flex items-center justify-between shadow-sm",
                                isReceivable ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                            )}>
                                <div>
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Monto Principal</p>
                                    <p className="text-2xl font-black">{formatMoney(formData.amount, formData.currencyCode)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Total a {isReceivable ? 'Cobrar' : 'Pagar'}</p>
                                    <p className="text-3xl font-black">
                                        {formatMoney(
                                            formData.amount + (formData.amount * (formData.interestRate / 100)),
                                            formData.currencyCode
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-muted-foreground">Frecuencia de Pagos</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'SINGLE'].map((freq) => (
                                                <button
                                                    key={freq}
                                                    type="button"
                                                    onClick={() => {
                                                        const isSingle = freq === 'SINGLE'
                                                        setFormData({
                                                            ...formData,
                                                            paymentFrequency: freq as any,
                                                            totalInstallments: isSingle ? 1 : formData.totalInstallments
                                                        })
                                                    }}
                                                    className={cn(
                                                        "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                                                        formData.paymentFrequency === freq
                                                            ? (isReceivable ? "border-blue-500 bg-blue-50 text-blue-700" : "border-orange-500 bg-orange-50 text-orange-700")
                                                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50"
                                                    )}
                                                >
                                                    {freq === 'MONTHLY' ? 'Mensual' : freq === 'WEEKLY' ? 'Semanal' : freq === 'BIWEEKLY' ? 'Quincenal' : 'Un solo pago'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.paymentFrequency !== 'SINGLE' && (
                                        <div className="space-y-3 animate-in fade-in-0 duration-300">
                                            <div className="flex justify-between">
                                                <Label className="text-sm font-bold text-muted-foreground">Número de Cuotas</Label>
                                                <span className="text-sm font-black text-foreground">{formData.totalInstallments}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="48"
                                                step="1"
                                                value={formData.totalInstallments}
                                                onChange={(e) => setFormData({ ...formData, totalInstallments: parseInt(e.target.value) })}
                                                className={cn(
                                                    "w-full h-2 rounded-full appearance-none cursor-pointer",
                                                    isReceivable ? "accent-blue-500 bg-blue-100" : "accent-orange-500 bg-orange-100"
                                                )}
                                            />
                                            <div className="flex gap-2">
                                                {[2, 6, 12, 24].map(n => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, totalInstallments: n })}
                                                        className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-muted-foreground hover:bg-zinc-200"
                                                    >
                                                        {n}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-muted-foreground">Interés Total (%)</Label>
                                        <div className="relative">
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                value={formData.interestRate}
                                                onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })}
                                                className="pl-10 h-12 rounded-xl text-lg font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Interés simple calculado sobre el total.
                                        </p>
                                    </div>
                                </div>

                                {/* Preview List */}
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[320px] overflow-hidden">
                                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900 flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cronograma</span>
                                        <span className="text-xs font-bold text-foreground bg-white dark:bg-zinc-800 px-2 py-1 rounded-md shadow-sm">
                                            {schedulePreview.length} cuotas
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {schedulePreview.map((inst) => (
                                            <div key={inst.number} className="flex justify-between items-center p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                                        isReceivable ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                                                    )}>
                                                        {inst.number}
                                                    </div>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {format(inst.date, "d MMM yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold">
                                                    {formatMoney(inst.amount, formData.currencyCode)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900 flex justify-between items-center gap-4">
                    {step === 'basics' ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => setStep('schedule')}
                                disabled={!formData.amount || !formData.contactName || !formData.accountId}
                                className={cn(
                                    "px-8 h-12 rounded-xl text-md font-bold transition-all shadow-lg shadow-blue-500/20",
                                    isReceivable
                                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                                        : "bg-orange-500 hover:bg-orange-600 text-white"
                                )}
                            >
                                Continuar
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep('basics')}
                                className="h-12 rounded-xl px-4 border-2"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Atrás
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={cn(
                                    "flex-1 h-12 rounded-xl text-md font-bold transition-all shadow-lg hover:scale-[1.02]",
                                    isReceivable
                                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
                                        : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/25"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 mr-2" />
                                        Confirmar Préstamo
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>

            </DialogContent>
        </Dialog >
    )
}
