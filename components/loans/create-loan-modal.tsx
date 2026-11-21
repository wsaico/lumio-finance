"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAccounts } from "@/hooks/useAccounts"
import { AccountSelect } from "@/components/accounts/account-select"
import { useCreateAccountReceivable } from "@/hooks/useAccountsReceivable"
import { useCreateAccountPayable } from "@/hooks/useAccountsPayable"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useFormat } from "@/hooks/useFormat"
import { useBalanceValidation } from "@/hooks/useBalanceValidation"
import { BalanceAlert } from "@/components/ui/balance-alert"
import { PremiumDatePicker } from "@/components/ui/premium-date-picker"
import { DEFAULT_CURRENCY, getCurrencySymbol } from "@/lib/currencies"
import {
    buildInstallmentSchedule,
    toLocalDateString,
    type LoanPaymentFrequency,
} from "@/lib/loans"
import {
    ArrowUpRight,
    ArrowDownLeft,
    User,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CalendarClock,
    Percent,
    CheckCircle2,
    Banknote,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths } from "date-fns"
import { es } from "date-fns/locale"

interface CreateLoanModalProps {
    open: boolean
    onClose: () => void
    defaultType?: "RECEIVABLE" | "PAYABLE"
}

type LoanType = "RECEIVABLE" | "PAYABLE"
type WizardStep = "basics" | "schedule"

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
    interestType: "SIMPLE" | "COMPOUND"
    paymentFrequency: LoanPaymentFrequency
    totalInstallments: number
}

export function CreateLoanModal({
    open,
    onClose,
    defaultType = "RECEIVABLE",
}: CreateLoanModalProps) {
    const { currencyCode: systemCurrency } = useSettingsStore()
    const { formatMoney } = useFormat()
    const { accounts = [] } = useAccounts()
    const createReceivable = useCreateAccountReceivable()
    const createPayable = useCreateAccountPayable()

    const defaultCurrency = systemCurrency || DEFAULT_CURRENCY
    const [step, setStep] = useState<WizardStep>("basics")

    const [formData, setFormData] = useState<LoanFormData>({
        type: defaultType,
        contactName: "",
        contactEmail: "",
        amount: 0,
        currencyCode: defaultCurrency,
        accountId: "",
        dueDate: toLocalDateString(addMonths(new Date(), 1)),
        notes: "",
        interestRate: 0,
        interestType: "SIMPLE",
        paymentFrequency: "MONTHLY",
        totalInstallments: 1,
    })

    const wasOpenRef = useRef(false)

    // Reset cleanly ONLY when modal transitions from closed -> open (prevents wiping user input on refetch)
    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setStep("basics")
            const preferredAccount =
                (accounts as any[]).find((a) => a.currencyCode === defaultCurrency) ||
                (accounts as any[])[0]

            setFormData({
                type: defaultType,
                contactName: "",
                contactEmail: "",
                amount: 0,
                currencyCode: preferredAccount?.currencyCode || defaultCurrency,
                accountId: preferredAccount?.id || "",
                dueDate: toLocalDateString(addMonths(new Date(), 1)),
                notes: "",
                interestRate: 0,
                interestType: "SIMPLE",
                paymentFrequency: "MONTHLY",
                totalInstallments: 1,
            })
        }
        wasOpenRef.current = open
    }, [open, defaultType, defaultCurrency, accounts])

    // If accounts finish loading while modal is open and no account is selected yet, pre-pick default
    useEffect(() => {
        if (open && !formData.accountId && (accounts as any[]).length > 0) {
            const preferred =
                (accounts as any[]).find((a) => a.currencyCode === defaultCurrency) ||
                (accounts as any[])[0]
            if (preferred) {
                setFormData((prev) => ({
                    ...prev,
                    accountId: preferred.id,
                    currencyCode: preferred.currencyCode || prev.currencyCode,
                }))
            }
        }
    }, [open, formData.accountId, accounts, defaultCurrency])

    const isReceivable = formData.type === "RECEIVABLE"
    const isLoading = createReceivable.isPending || createPayable.isPending
    const currencySymbol = getCurrencySymbol(formData.currencyCode)

    const balanceValidation = useBalanceValidation(
        isReceivable ? formData.accountId : undefined,
        isReceivable ? formData.amount : 0,
        (accounts as any[]).map((a) => ({
            id: a.id,
            name: a.name,
            currentBalance: Number(a.currentBalance ?? 0),
            accountType: a.accountType || "BANK",
            creditLimit: a.creditLimit,
            usedBalance: a.usedBalance,
            currencyCode: a.currencyCode,
        }))
    )

    // Schedule preview using the exact same generator as the backend
    const schedulePreview = useMemo(() => {
        return buildInstallmentSchedule({
            amount: formData.amount,
            interestRate: formData.interestRate,
            totalInstallments: formData.totalInstallments,
            paymentFrequency: formData.paymentFrequency,
            firstDueDate: formData.dueDate,
        })
    }, [
        formData.amount,
        formData.totalInstallments,
        formData.interestRate,
        formData.dueDate,
        formData.paymentFrequency,
    ])

    const handleAccountChange = (accountId: string) => {
        const selected = (accounts as any[]).find((a) => a.id === accountId)
        setFormData((prev) => ({
            ...prev,
            accountId,
            currencyCode: selected?.currencyCode || prev.currencyCode,
        }))
    }

    const canProceed =
        formData.amount > 0 &&
        formData.contactName.trim().length > 0 &&
        Boolean(formData.accountId) &&
        !(isReceivable && balanceValidation && !balanceValidation.valid)

    const handleSubmit = async () => {
        try {
            const payload = {
                contactName: formData.contactName.trim(),
                contactEmail: formData.contactEmail || undefined,
                amount: formData.amount,
                currencyCode: formData.currencyCode,
                accountId: formData.accountId,
                dueDate: formData.dueDate,
                notes: formData.notes.trim() || undefined,
                interestRate: formData.interestRate || 0,
                interestType: formData.interestType,
                paymentFrequency: formData.paymentFrequency,
                totalInstallments:
                    formData.paymentFrequency === "SINGLE" ? 1 : formData.totalInstallments,
            }

            if (isReceivable) {
                await createReceivable.mutateAsync(payload)
            } else {
                await createPayable.mutateAsync(payload)
            }
            onClose()
        } catch (error) {
            console.error("Loan submission failed:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-card border border-border/60 shadow-2xl rounded-3xl max-h-[90dvh] flex flex-col">
                {/* Top Accent Bar */}
                <div
                    className={cn(
                        "h-1.5 w-full shrink-0 bg-gradient-to-r",
                        isReceivable
                            ? "from-indigo-500 via-blue-500 to-cyan-500"
                            : "from-orange-500 via-amber-500 to-rose-500"
                    )}
                />

                <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/50 shrink-0">
                    <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2.5 text-foreground">
                        {step === "basics" ? (
                            <>
                                <Banknote
                                    className={cn(
                                        "w-5 h-5",
                                        isReceivable ? "text-indigo-500" : "text-amber-500"
                                    )}
                                />
                                Nuevo Préstamo
                            </>
                        ) : (
                            <>
                                <CalendarClock
                                    className={cn(
                                        "w-5 h-5",
                                        isReceivable ? "text-indigo-500" : "text-amber-500"
                                    )}
                                />
                                Configurar Cronograma
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-card">
                    {/* STEP 1: BASICS */}
                    {step === "basics" && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Type Selector (Compact horizontal cards — fits without scrolling) */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: "RECEIVABLE" })}
                                    className={cn(
                                        "relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                                        isReceivable
                                            ? "border-indigo-500 bg-indigo-500/8 dark:bg-indigo-500/15"
                                            : "border-border bg-muted/30 opacity-75 hover:opacity-100"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                            isReceivable
                                                ? "bg-indigo-600 text-white"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <ArrowUpRight className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <span
                                            className={cn(
                                                "font-extrabold text-sm block leading-tight",
                                                isReceivable
                                                    ? "text-indigo-700 dark:text-indigo-300"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            Yo Presté
                                        </span>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                                            Salida de dinero
                                        </span>
                                    </div>
                                    {isReceivable && (
                                        <CheckCircle2 className="w-4 h-4 absolute top-2.5 right-2.5 text-indigo-500" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: "PAYABLE" })}
                                    className={cn(
                                        "relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                                        !isReceivable
                                            ? "border-amber-500 bg-amber-500/8 dark:bg-amber-500/15"
                                            : "border-border bg-muted/30 opacity-75 hover:opacity-100"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                            !isReceivable
                                                ? "bg-amber-500 text-white"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        <ArrowDownLeft className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <span
                                            className={cn(
                                                "font-extrabold text-sm block leading-tight",
                                                !isReceivable
                                                    ? "text-amber-700 dark:text-amber-300"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            Me Prestaron
                                        </span>
                                        <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                                            Ingreso de dinero
                                        </span>
                                    </div>
                                    {!isReceivable && (
                                        <CheckCircle2 className="w-4 h-4 absolute top-2.5 right-2.5 text-amber-500" />
                                    )}
                                </button>
                            </div>

                            {/* Contact Name */}
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider ml-1">
                                    {isReceivable ? "¿A quién le prestaste?" : "¿Quién te prestó?"}
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        value={formData.contactName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contactName: e.target.value })
                                        }
                                        placeholder="Nombre de la persona o entidad"
                                        className="h-12 pl-10 rounded-xl text-base font-semibold bg-muted/40 border-border/70"
                                    />
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <Label className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider">
                                        Monto ({formData.currencyCode})
                                    </Label>
                                </div>
                                <div className="relative">
                                    <span
                                        className={cn(
                                            "absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black pointer-events-none",
                                            isReceivable ? "text-indigo-600" : "text-amber-500"
                                        )}
                                    >
                                        {currencySymbol}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.amount || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                amount: Math.max(0, parseFloat(e.target.value) || 0),
                                            })
                                        }
                                        placeholder="0.00"
                                        className={cn(
                                            "h-16 pl-14 pr-4 rounded-2xl text-3xl font-black tabular-nums bg-muted/40 border-2 transition-all",
                                            isReceivable
                                                ? "focus:border-indigo-500/60"
                                                : "focus:border-amber-500/60"
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Account & First Due Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 min-w-0">
                                    <Label className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider ml-1">
                                        Cuenta {isReceivable ? "Origen" : "Destino"}
                                    </Label>
                                    <AccountSelect
                                        value={formData.accountId}
                                        onValueChange={handleAccountChange}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <Label className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider ml-1">
                                        Primer Vencimiento
                                    </Label>
                                    <PremiumDatePicker
                                        value={formData.dueDate}
                                        onChange={(d) =>
                                            setFormData({
                                                ...formData,
                                                dueDate: toLocalDateString(d),
                                            })
                                        }
                                        label="Primer Vencimiento"
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {isReceivable && formData.accountId && formData.amount > 0 && (
                                <BalanceAlert
                                    validation={balanceValidation}
                                    currencyCode={formData.currencyCode}
                                />
                            )}
                        </div>
                    )}

                    {/* STEP 2: SCHEDULE */}
                    {step === "schedule" && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            {/* Summary Card */}
                            <div
                                className={cn(
                                    "p-4 rounded-2xl flex items-center justify-between text-white shadow-sm",
                                    isReceivable
                                        ? "bg-gradient-to-r from-indigo-600 to-blue-600"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                                )}
                            >
                                <div>
                                    <p className="text-white/75 text-[11px] font-bold uppercase tracking-wider">
                                        Monto Principal
                                    </p>
                                    <p className="text-xl font-black tabular-nums">
                                        {formatMoney(formData.amount, formData.currencyCode)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/75 text-[11px] font-bold uppercase tracking-wider">
                                        Total a {isReceivable ? "Cobrar" : "Pagar"}
                                    </p>
                                    <p className="text-2xl font-black tabular-nums">
                                        {formatMoney(
                                            formData.amount +
                                                formData.amount * (formData.interestRate / 100),
                                            formData.currencyCode
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Controls + Preview */}
                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                            Frecuencia de Pagos
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(["MONTHLY", "WEEKLY", "BIWEEKLY", "SINGLE"] as const).map(
                                                (freq) => (
                                                    <button
                                                        key={freq}
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData({
                                                                ...formData,
                                                                paymentFrequency: freq,
                                                                totalInstallments:
                                                                    freq === "SINGLE"
                                                                        ? 1
                                                                        : formData.totalInstallments,
                                                            })
                                                        }
                                                        className={cn(
                                                            "px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                                                            formData.paymentFrequency === freq
                                                                ? isReceivable
                                                                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                                                    : "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                                                : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {freq === "MONTHLY"
                                                            ? "Mensual"
                                                            : freq === "WEEKLY"
                                                              ? "Semanal"
                                                              : freq === "BIWEEKLY"
                                                                ? "Quincenal"
                                                                : "Un solo pago"}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {formData.paymentFrequency !== "SINGLE" && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                                    Número de Cuotas
                                                </Label>
                                                <span className="text-sm font-black text-foreground tabular-nums">
                                                    {formData.totalInstallments}
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="48"
                                                step="1"
                                                value={formData.totalInstallments}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        totalInstallments: parseInt(e.target.value, 10),
                                                    })
                                                }
                                                className={cn(
                                                    "w-full h-2 rounded-full appearance-none cursor-pointer",
                                                    isReceivable
                                                        ? "accent-indigo-600 bg-indigo-500/20"
                                                        : "accent-amber-500 bg-amber-500/20"
                                                )}
                                            />
                                            <div className="flex gap-1.5">
                                                {[2, 6, 12, 24].map((n) => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData({
                                                                ...formData,
                                                                totalInstallments: n,
                                                            })
                                                        }
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors",
                                                            formData.totalInstallments === n
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {n}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                            Interés Total (%)
                                        </Label>
                                        <div className="relative">
                                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                value={formData.interestRate}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        interestRate: Math.min(
                                                            100,
                                                            Math.max(0, parseFloat(e.target.value) || 0)
                                                        ),
                                                    })
                                                }
                                                className="pl-9 h-11 rounded-xl text-base font-bold bg-muted/40"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            Interés simple calculado sobre el monto total.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                            Nota (opcional)
                                        </Label>
                                        <Input
                                            value={formData.notes}
                                            onChange={(e) =>
                                                setFormData({ ...formData, notes: e.target.value })
                                            }
                                            placeholder="Motivo o referencia..."
                                            className="h-10 rounded-xl text-sm bg-muted/40"
                                        />
                                    </div>
                                </div>

                                {/* Preview List */}
                                <div className="bg-muted/40 rounded-2xl border border-border flex flex-col h-[310px] overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-border bg-muted/70 flex justify-between items-center">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                            Cronograma
                                        </span>
                                        <span className="text-xs font-bold text-foreground bg-card px-2 py-0.5 rounded-md shadow-xs">
                                            {schedulePreview.length}{" "}
                                            {schedulePreview.length === 1 ? "cuota" : "cuotas"}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {schedulePreview.map((inst) => (
                                            <div
                                                key={inst.installmentNumber}
                                                className="flex justify-between items-center p-2 rounded-lg hover:bg-card transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                                            isReceivable
                                                                ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                        )}
                                                    >
                                                        {inst.installmentNumber}
                                                    </div>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {format(inst.dueDate, "d MMM yyyy", {
                                                            locale: es,
                                                        })}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-bold tabular-nums text-foreground">
                                                    {formatMoney(
                                                        inst.totalAmount,
                                                        formData.currencyCode
                                                    )}
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
                <div className="p-4 bg-card border-t border-border/70 flex justify-between items-center gap-3 shrink-0">
                    {step === "basics" ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setStep("schedule")}
                                disabled={!canProceed}
                                className={cn(
                                    "px-7 h-11 rounded-xl text-sm font-extrabold transition-all shadow-lg",
                                    isReceivable
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                )}
                            >
                                Continuar
                                <ChevronRight className="w-4 h-4 ml-1.5" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("basics")}
                                className="h-11 rounded-xl px-4"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Atrás
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={cn(
                                    "flex-1 h-11 rounded-xl text-sm font-extrabold transition-all shadow-lg",
                                    isReceivable
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Confirmar Préstamo
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
