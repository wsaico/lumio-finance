"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWithdrawSavings } from "@/hooks/useSavingsGoals"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { getCurrencySymbol } from "@/lib/currencies"
import { cn, formatAccountPillName } from "@/lib/utils"
import { Loader2, ArrowRight, AlertTriangle, Wallet, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"
import { showAppToast } from "@/components/ui/app-alert-toast"

interface WithdrawModalProps {
    goal: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function WithdrawModal({ goal, open, onOpenChange }: WithdrawModalProps) {
    const { formatMoney } = useFormat()
    const { mutate: withdraw, isPending } = useWithdrawSavings()
    const { accounts: accountsData } = useAccounts()
    const accounts = accountsData || []

    const [amount, setAmount] = useState("")
    const [fromAccountId, setFromAccountId] = useState("")
    const [toAccountId, setToAccountId] = useState("")
    const [notes, setNotes] = useState("")

    const currency = goal?.currency || "PEN"
    const symbol = getCurrencySymbol(currency)
    const maxAmount = Number(goal?.current_amount || 0)
    const isGoalCompleted = goal?.status === "COMPLETED"

    useEffect(() => {
        if (open && goal) {
            setAmount("")
            setNotes("")
            const linkedFrom = goal.primary_account_id || accounts[0]?.id || ""
            setFromAccountId(linkedFrom)
            const defaultTo = accounts.find((a: any) => a.id !== linkedFrom)?.id || ""
            setToAccountId(defaultTo)
        }
    }, [open, goal, accounts])

    if (!goal) return null

    const parsedAmount = parseFloat(amount) || 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!accountsData || accountsData.length === 0) {
            showAppToast.warning({
                title: "Primero crea una cuenta",
                description: "Necesitas cuentas activas para retirar fondos de tu meta.",
                actionLabel: "Crear cuenta",
                onAction: () => {
                    onOpenChange(false)
                    if (typeof window !== "undefined") window.location.href = "/dashboard/accounts"
                },
            })
            return
        }
        if (!fromAccountId) {
            showAppToast.warning({
                title: "Selecciona una cuenta de origen",
                description: "Elige la cuenta desde donde retirarás el ahorro.",
            })
            return
        }
        if (!toAccountId) {
            showAppToast.warning({
                title: "Selecciona una cuenta de destino",
                description: "Elige la cuenta donde recibirás el dinero.",
            })
            return
        }
        if (fromAccountId === toAccountId) {
            toast.error("La cuenta de origen y destino deben ser diferentes")
            return
        }
        if (parsedAmount <= 0) {
            toast.error("Ingresa un monto válido")
            return
        }
        if (parsedAmount > maxAmount) {
            toast.error("Fondos insuficientes en la meta")
            return
        }

        withdraw(
            {
                goalId: goal.id,
                amount: parsedAmount,
                fromAccountId,
                toAccountId,
                date: new Date().toISOString().split("T")[0],
                notes: notes.trim() || undefined,
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                },
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-0 shadow-2xl bg-card rounded-[1.75rem] max-h-[90dvh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-orange-500 p-5 text-white shrink-0">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-xl font-black tracking-tight text-white">
                            Retirar Fondos
                        </DialogTitle>
                        <DialogDescription className="text-rose-100 text-xs mt-0.5">
                            Disponible en "{goal.name}":{" "}
                            <strong className="text-white">{formatMoney(maxAmount, currency)}</strong>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                    {!isGoalCompleted && (
                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-amber-700 dark:text-amber-400 leading-relaxed">
                                Esta meta aún <strong>no está completada</strong>. Retirar fondos reducirá tu progreso.
                            </p>
                        </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                Monto a retirar ({currency})
                            </Label>
                            {maxAmount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAmount(maxAmount.toFixed(2))}
                                    className="text-[11px] font-bold text-rose-500 hover:underline"
                                >
                                    Retirar todo ({formatMoney(maxAmount, currency)})
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-rose-500 pointer-events-none">
                                {symbol}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={maxAmount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                className="pl-12 h-14 text-2xl font-black tabular-nums rounded-2xl bg-muted/40 border-border/60"
                            />
                        </div>
                    </div>

                    {/* From Account Pills */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-rose-500" />
                            Retirar desde (cuenta donde está el ahorro)
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {accounts.map((acc: any) => {
                                const selected = fromAccountId === acc.id
                                return (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => {
                                            setFromAccountId(acc.id)
                                            if (toAccountId === acc.id) setToAccountId("")
                                        }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                                            selected
                                                ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                                : "bg-muted/40 text-foreground border-border/60 hover:border-rose-500/40"
                                        )}
                                    >
                                        {formatAccountPillName(acc.name, acc.currencyCode)}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* To Account Pills */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                            Depositar en (cuenta destino)
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                            {accounts
                                .filter((acc: any) => acc.id !== fromAccountId)
                                .map((acc: any) => {
                                    const selected = toAccountId === acc.id
                                    return (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => setToAccountId(acc.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                                                selected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                    : "bg-muted/40 text-foreground border-border/60 hover:border-primary/40"
                                            )}
                                        >
                                            {formatAccountPillName(acc.name, acc.currencyCode)}
                                        </button>
                                    )
                                })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Motivo (opcional)
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Uso del fondo de emergencia..."
                            rows={2}
                            className="rounded-2xl bg-muted/40 border-border/60 resize-none text-sm"
                        />
                    </div>

                    {/* Remaining Preview */}
                    {parsedAmount > 0 && parsedAmount <= maxAmount && (
                        <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-semibold">Saldo restante en meta</span>
                            <span className="font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatMoney(maxAmount - parsedAmount, currency)}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2.5 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-11 rounded-2xl font-bold flex-1"
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                parsedAmount <= 0 ||
                                !fromAccountId ||
                                !toAccountId ||
                                isPending ||
                                parsedAmount > maxAmount
                            }
                            className="h-11 rounded-2xl font-black flex-[1.5] bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 gap-1.5"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Retirando...
                                </>
                            ) : (
                                <>
                                    Retirar fondos
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
