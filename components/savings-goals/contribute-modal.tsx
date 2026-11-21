"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAddContribution, useTransferAndContribute } from "@/hooks/useSavingsGoals"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { getCurrencySymbol } from "@/lib/currencies"
import { cn, formatAccountPillName } from "@/lib/utils"
import { Loader2, Sparkles, ArrowRightLeft, Wallet, Check, Plus } from "lucide-react"
import { toast } from "sonner"
import { showAppToast } from "@/components/ui/app-alert-toast"

interface ContributeModalProps {
    goal: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ContributeModal({ goal, open, onOpenChange }: ContributeModalProps) {
    const { formatMoney } = useFormat()
    const { accounts = [] } = useAccounts()
    const { mutate: addContribution, isPending: isAdding } = useAddContribution()
    const { mutate: transferAndContribute, isPending: isTransferring } = useTransferAndContribute()

    const [mode, setMode] = useState<"direct" | "transfer">("direct")
    const [amount, setAmount] = useState("")
    const [fromAccountId, setFromAccountId] = useState("")
    const [toAccountId, setToAccountId] = useState("")
    const [notes, setNotes] = useState("")

    const isPending = isAdding || isTransferring
    const currency = goal?.currency || "PEN"
    const symbol = getCurrencySymbol(currency)
    const currentAmount = Number(goal?.current_amount || 0)
    const targetAmount = Number(goal?.target_amount || 0)
    const remainingToGoal = Math.max(0, targetAmount - currentAmount)

    useEffect(() => {
        if (open && goal) {
            setAmount("")
            setNotes("")
            const linkedTo = goal.primary_account_id || ""
            setToAccountId(linkedTo)
            const defaultFrom = accounts.find((a: any) => a.id !== linkedTo)?.id || ""
            setFromAccountId(defaultFrom)
            setMode(linkedTo && accounts.length >= 2 ? "transfer" : "direct")
        }
    }, [open, goal, accounts])

    if (!goal) return null

    const parsedAmount = parseFloat(amount) || 0
    const nextTotal = currentAmount + parsedAmount
    const currentPct = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0
    const nextPct = targetAmount > 0 ? Math.min(100, (nextTotal / targetAmount) * 100) : 0

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (parsedAmount <= 0) {
            toast.error("Ingresa un monto mayor a 0")
            return
        }

        const todayStr = new Date().toISOString().split("T")[0]

        if (mode === "transfer") {
            if (accounts.length === 0) {
                showAppToast.warning({
                    title: "Primero crea una cuenta",
                    description: "Necesitas al menos una cuenta activa para transferir fondos a tu meta.",
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
                    title: "Selecciona la cuenta de origen",
                    description: "Elige desde qué cuenta saldrá el dinero.",
                })
                return
            }
            if (!toAccountId) {
                showAppToast.warning({
                    title: "Selecciona la cuenta destino de ahorro",
                    description: "Elige en qué cuenta se guardará el aporte.",
                })
                return
            }
            if (fromAccountId === toAccountId) {
                toast.error("La cuenta origen y destino deben ser diferentes")
                return
            }
            transferAndContribute(
                {
                    goalId: goal.id,
                    amount: parsedAmount,
                    fromAccountId,
                    toAccountId,
                    date: todayStr,
                    notes: notes.trim() || undefined,
                },
                {
                    onSuccess: () => onOpenChange(false),
                }
            )
            return
        }

        addContribution(
            {
                goalId: goal.id,
                amount: parsedAmount,
                date: todayStr,
                notes: notes.trim() || undefined,
            },
            {
                onSuccess: () => onOpenChange(false),
            }
        )
    }

    const quickAmounts = [50, 100, 250].filter((v) => v <= Math.max(remainingToGoal, 250))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-0 shadow-2xl bg-card rounded-[1.75rem] max-h-[90dvh] flex flex-col">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shrink-0">
                    <DialogHeader className="text-left">
                        <div className="flex items-center gap-2 text-emerald-100 text-[11px] font-bold uppercase tracking-wider mb-1">
                            <Sparkles className="h-3.5 w-3.5" />
                            Aportar a meta
                        </div>
                        <DialogTitle className="text-xl font-black tracking-tight text-white truncate">
                            {goal.name}
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100/90 text-xs mt-0.5">
                            Progreso actual: {formatMoney(currentAmount, currency)} de{" "}
                            {formatMoney(targetAmount, currency)} ({currentPct.toFixed(0)}%)
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Switcher */}
                    {accounts.length >= 2 && (
                        <div className="grid grid-cols-2 gap-1 p-1 mt-4 rounded-2xl bg-black/20 backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={() => setMode("transfer")}
                                className={cn(
                                    "py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all",
                                    mode === "transfer"
                                        ? "bg-white text-emerald-700 shadow-sm"
                                        : "text-white/80 hover:text-white"
                                )}
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Desde cuenta
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("direct")}
                                className={cn(
                                    "py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all",
                                    mode === "direct"
                                        ? "bg-white text-emerald-700 shadow-sm"
                                        : "text-white/80 hover:text-white"
                                )}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Solo registrar
                            </button>
                        </div>
                    )}
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Amount Hero Input */}
                    <div className="space-y-2">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Monto del aporte ({currency})
                        </Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-600 pointer-events-none">
                                {symbol}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                                autoFocus
                                className="pl-12 h-14 text-2xl font-black tabular-nums rounded-2xl bg-muted/40 border-border/60 focus-visible:ring-emerald-500/30"
                            />
                        </div>

                        {/* Quick Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {quickAmounts.map((val) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setAmount(String(val))}
                                    className="px-3 py-1 rounded-full text-xs font-bold bg-muted/60 hover:bg-emerald-500/15 hover:text-emerald-600 transition-colors tabular-nums"
                                >
                                    +{symbol}{val}
                                </button>
                            ))}
                            {remainingToGoal > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAmount(remainingToGoal.toFixed(2))}
                                    className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors tabular-nums"
                                >
                                    Completar ({formatMoney(remainingToGoal, currency)})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Account Pills when transferring */}
                    {mode === "transfer" && (
                        <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Wallet className="h-3.5 w-3.5 text-primary" />
                                    Cuenta de origen (de donde sale)
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

                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-600" />
                                    Cuenta de ahorro (destino)
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
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                            : "bg-muted/40 text-foreground border-border/60 hover:border-emerald-500/40"
                                                    )}
                                                >
                                                    {formatAccountPillName(acc.name, acc.currencyCode)}
                                                </button>
                                            )
                                        })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Nota (opcional)
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Ahorro de quincena"
                            rows={2}
                            className="rounded-2xl bg-muted/40 border-border/60 resize-none text-sm"
                        />
                    </div>

                    {/* Live Progress Preview */}
                    {parsedAmount > 0 && (
                        <div className="p-3.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-muted-foreground">Nuevo acumulado</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {formatMoney(nextTotal, currency)} ({nextPct.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                    style={{ width: `${nextPct}%` }}
                                />
                            </div>
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
                            disabled={parsedAmount <= 0 || isPending}
                            className="h-11 rounded-2xl font-black flex-[1.6] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 gap-1.5"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    Confirmar aporte
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
