"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useBalanceValidation } from "@/hooks/useBalanceValidation"
import { getCurrencySymbol } from "@/lib/currencies"
import { cn, formatAccountPillName } from "@/lib/utils"
import { DollarSign, Wallet, AlertCircle, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { showAppToast } from "@/components/ui/app-alert-toast"

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
        type: "RECEIVABLE" | "PAYABLE"
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
    paymentMethod?: "CASH" | "TRANSFER" | "CHECK" | "CARD" | "OTHER"
    notes?: string
}

const PAYMENT_METHODS = [
    { id: "TRANSFER", label: "Transferencia" },
    { id: "CASH", label: "Efectivo" },
    { id: "CARD", label: "Tarjeta" },
    { id: "OTHER", label: "Otro" },
] as const

function inferMethodFromAccount(acc?: any): "CASH" | "TRANSFER" | "CARD" | "OTHER" {
    const type = String(acc?.accountType || "").toUpperCase()
    if (type === "CASH" || type === "WALLET" || type === "PETTY_CASH") return "CASH"
    if (type === "CREDIT_CARD" || type === "DEBIT_CARD" || type === "CARD") return "CARD"
    return "TRANSFER"
}

export function PaymentModal({ open, onClose, onSubmit, loan, isLoading }: PaymentModalProps) {
    const { formatMoney } = useFormat()
    const { accounts = [] } = useAccounts()
    const initializedKeyRef = useRef<string | null>(null)
    const userPickedMethodRef = useRef(false)

    const [formData, setFormData] = useState<PaymentFormData>({
        paymentAmount: 0,
        principalAmount: 0,
        interestAmount: 0,
        accountId: "",
        paymentMethod: "TRANSFER",
        notes: "",
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const filteredAccounts = (accounts as any[]).filter(
        (acc) => acc.currencyCode === loan?.currencyCode
    )
    const displayAccounts = filteredAccounts.length > 0 ? filteredAccounts : (accounts as any[])

    // Initialize ONCE per modal open + loan.id (never resets on parent re-render or isLoading change!)
    useEffect(() => {
        if (!open) {
            initializedKeyRef.current = null
            userPickedMethodRef.current = false
            return
        }
        if (!loan) return

        const key = `${loan.id}:${loan.nextInstallment?.number ?? "none"}:${loan.outstandingBalance}`
        if (initializedKeyRef.current === key) return
        initializedKeyRef.current = key
        userPickedMethodRef.current = false

        const suggestedAmount = loan.nextInstallment
            ? loan.nextInstallment.amount
            : loan.outstandingBalance
        const matchingAcc =
            (accounts as any[]).find((acc) => acc.currencyCode === loan.currencyCode) ||
            (accounts as any[])[0]

        setFormData({
            paymentAmount: suggestedAmount,
            principalAmount: loan.nextInstallment
                ? loan.nextInstallment.principal
                : loan.outstandingBalance,
            interestAmount: loan.nextInstallment ? loan.nextInstallment.interest : 0,
            accountId: matchingAcc?.id || "",
            paymentMethod: inferMethodFromAccount(matchingAcc),
            notes: loan.nextInstallment ? `Cuota #${loan.nextInstallment.number}` : "",
        })
        setErrors({})
    }, [open, loan, accounts])

    // If accounts load slightly after modal opens and no accountId was selected yet
    useEffect(() => {
        if (open && loan && !formData.accountId && (accounts as any[]).length > 0) {
            const matchingAcc =
                (accounts as any[]).find((acc) => acc.currencyCode === loan.currencyCode) ||
                (accounts as any[])[0]
            if (matchingAcc) {
                setFormData((prev) => ({
                    ...prev,
                    accountId: matchingAcc.id,
                    paymentMethod: userPickedMethodRef.current
                        ? prev.paymentMethod
                        : inferMethodFromAccount(matchingAcc),
                }))
            }
        }
    }, [open, loan, formData.accountId, accounts])

    const balanceValidation = useBalanceValidation(
        loan && loan.type !== "RECEIVABLE" ? formData.accountId : undefined,
        loan && loan.type !== "RECEIVABLE" ? formData.paymentAmount : 0,
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

    if (!loan) return null

    const isReceivable = loan.type === "RECEIVABLE"
    const symbol = getCurrencySymbol(loan.currencyCode)
    const selectedAccount = (accounts as any[]).find((a) => a.id === formData.accountId)
    const currentAccBal = Number(selectedAccount?.currentBalance ?? 0)
    const projectedAccBal = isReceivable
        ? currentAccBal + formData.paymentAmount
        : currentAccBal - formData.paymentAmount
    const remainingAfterPayment = Math.max(
        0,
        loan.outstandingBalance - (formData.principalAmount || 0)
    )

    const setAmountSmart = (val: number, customPrincipal?: number, customInterest?: number) => {
        const safe = Math.max(0, Number(val) || 0)
        setFormData((prev) => ({
            ...prev,
            paymentAmount: safe,
            principalAmount:
                customPrincipal !== undefined
                    ? customPrincipal
                    : Math.min(safe, loan.outstandingBalance),
            interestAmount:
                customInterest !== undefined
                    ? customInterest
                    : Math.max(0, safe - loan.outstandingBalance),
        }))
        setErrors((prev) => ({ ...prev, paymentAmount: "" }))
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (formData.paymentAmount <= 0) {
            newErrors.paymentAmount = "El monto debe ser mayor a 0"
        }

        const principalComponent = formData.principalAmount || formData.paymentAmount
        if (principalComponent > loan.outstandingBalance + 0.01) {
            newErrors.paymentAmount = "El abono a capital excede el saldo pendiente"
        }

        if (!formData.accountId) {
            newErrors.accountId = "Selecciona una cuenta"
        }

        if (!isReceivable && balanceValidation && !balanceValidation.valid) {
            newErrors.paymentAmount = balanceValidation.message || "Saldo insuficiente"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (accounts.length === 0) {
            showAppToast.warning({
                title: "Primero crea una cuenta",
                description: "Necesitas al menos una cuenta activa para registrar un pago.",
                actionLabel: "Crear cuenta",
                onAction: () => {
                    onClose()
                    if (typeof window !== "undefined") window.location.href = "/dashboard/accounts"
                },
            })
            return
        }
        if (!formData.accountId) {
            showAppToast.warning({
                title: "Selecciona una cuenta",
                description: "Elige la cuenta donde se aplicará este pago.",
            })
            return
        }
        if (validate()) {
            onSubmit(formData)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[470px] p-0 overflow-hidden border-0 shadow-2xl bg-card rounded-[1.75rem] max-h-[90dvh] flex flex-col">
                {/* Gradient Header */}
                <div
                    className={cn(
                        "p-5 text-white shrink-0 bg-gradient-to-br",
                        isReceivable
                            ? "from-indigo-600 via-blue-600 to-indigo-700"
                            : "from-amber-500 via-orange-500 to-rose-500"
                    )}
                >
                    <DialogHeader className="text-left">
                        <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-bold uppercase tracking-wider mb-1">
                            {isReceivable ? (
                                <Wallet className="h-3.5 w-3.5" />
                            ) : (
                                <DollarSign className="h-3.5 w-3.5" />
                            )}
                            {isReceivable ? "Cobro de préstamo" : "Pago de deuda"}
                        </div>
                        <DialogTitle className="text-xl font-black tracking-tight text-white truncate">
                            {loan.contactName}
                        </DialogTitle>
                        <DialogDescription className="text-white/85 text-xs mt-0.5">
                            Saldo pendiente:{" "}
                            <strong className="text-white">
                                {formatMoney(loan.outstandingBalance, loan.currencyCode)}
                            </strong>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Amount Input + Quick Chips */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Monto a {isReceivable ? "cobrar" : "pagar"} ({loan.currencyCode})
                        </Label>
                        <div className="relative">
                            <span
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black pointer-events-none",
                                    isReceivable ? "text-indigo-600" : "text-amber-500"
                                )}
                            >
                                {symbol}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.paymentAmount || ""}
                                onChange={(e) => setAmountSmart(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="pl-12 h-14 text-2xl font-black tabular-nums rounded-2xl bg-muted/40 border-border/60"
                            />
                        </div>

                        {/* Quick Chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {loan.nextInstallment && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAmountSmart(
                                            loan.nextInstallment!.amount,
                                            loan.nextInstallment!.principal,
                                            loan.nextInstallment!.interest
                                        )
                                    }
                                    className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors tabular-nums"
                                >
                                    Cuota #{loan.nextInstallment.number} (
                                    {formatMoney(loan.nextInstallment.amount, loan.currencyCode)})
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() =>
                                    setAmountSmart(
                                        Math.round((loan.outstandingBalance / 2) * 100) / 100
                                    )
                                }
                                className="px-3 py-1 rounded-full text-xs font-bold bg-muted/60 hover:bg-muted text-foreground/80 transition-colors"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setAmountSmart(
                                        loan.outstandingBalance,
                                        loan.outstandingBalance,
                                        0
                                    )
                                }
                                className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors tabular-nums"
                            >
                                Liquidar todo
                            </button>
                        </div>

                        {errors.paymentAmount && (
                            <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {errors.paymentAmount}
                            </p>
                        )}
                    </div>

                    {/* Account Pills */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-primary" />
                            {isReceivable ? "Cuenta donde ingresa" : "Cuenta desde donde pagas"}
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {displayAccounts.map((acc: any) => {
                                const selected = formData.accountId === acc.id
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                accountId: acc.id,
                                                paymentMethod: userPickedMethodRef.current
                                                    ? prev.paymentMethod
                                                    : inferMethodFromAccount(acc),
                                            }))
                                            setErrors((prev) => ({ ...prev, accountId: "" }))
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                                            selected
                                                ? isReceivable
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                    : "bg-amber-500 text-white border-amber-500 shadow-sm"
                                                : "bg-muted/40 text-foreground border-border/60 hover:border-primary/40"
                                        )}
                                    >
                                        {formatAccountPillName(acc.name, acc.currencyCode)}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedAccount && (
                            <div className="rounded-2xl bg-muted/40 border border-border/60 px-3.5 py-2.5 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-semibold">
                                    Saldo: {formatMoney(currentAccBal, selectedAccount.currencyCode)}
                                </span>
                                <span className="font-black tabular-nums">
                                    Proyectado:{" "}
                                    <span
                                        className={
                                            projectedAccBal < 0 ? "text-rose-500" : "text-primary"
                                        }
                                    >
                                        {formatMoney(projectedAccBal, selectedAccount.currencyCode)}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Payment Method Pills */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Método
                        </Label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                        userPickedMethodRef.current = true
                                        setFormData((prev) => ({ ...prev, paymentMethod: m.id }))
                                    }}
                                    className={cn(
                                        "py-2 rounded-xl text-[11px] font-bold border transition-all",
                                        formData.paymentMethod === m.id
                                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                            : "bg-muted/40 text-muted-foreground border-border/50 hover:text-foreground"
                                    )}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Nota (opcional)
                        </Label>
                        <Textarea
                            value={formData.notes || ""}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            placeholder="Referencia del cobro/pago..."
                            rows={2}
                            className="rounded-2xl bg-muted/40 border-border/60 resize-none text-sm"
                        />
                    </div>

                    {/* Remaining Loan Preview */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">
                            Saldo restante del préstamo
                        </span>
                        <span className="font-black text-foreground tabular-nums">
                            {remainingAfterPayment <= 0.01
                                ? "Liquidado 🎉"
                                : formatMoney(remainingAfterPayment, loan.currencyCode)}
                        </span>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-2.5 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="h-11 rounded-2xl font-bold flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={Boolean(
                                isLoading ||
                                    formData.paymentAmount <= 0 ||
                                    !formData.accountId ||
                                    (!isReceivable && balanceValidation && !balanceValidation.valid)
                            )}
                            className={cn(
                                "h-11 rounded-2xl font-black flex-[1.6] text-white shadow-lg gap-1.5",
                                isReceivable
                                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
                                    : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    {isReceivable ? "Confirmar cobro" : "Confirmar pago"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
