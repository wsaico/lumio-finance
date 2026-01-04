"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { useWithdrawSavings } from "@/hooks/use-savings-goals"
import { useAccounts } from "@/hooks/use-accounts"
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface WithdrawModalProps {
    goal: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function WithdrawModal({ goal, open, onOpenChange }: WithdrawModalProps) {
    const [amount, setAmount] = useState('')
    const [fromAccountId, setFromAccountId] = useState(goal?.primary_account_id || '')
    const [toAccountId, setToAccountId] = useState('')
    const [notes, setNotes] = useState('')

    // Hooks
    const { mutate: withdraw, isPending } = useWithdrawSavings()
    const { accounts: accountsData } = useAccounts()
    const accounts = accountsData || []

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!fromAccountId) {
            toast.error("Selecciona una cuenta de origen")
            return
        }
        if (!toAccountId) {
            toast.error("Selecciona una cuenta de destino")
            return
        }
        if (fromAccountId === toAccountId) {
            toast.error("La cuenta de origen y destino deben ser diferentes")
            return
        }

        const withdrawAmount = parseFloat(amount)
        if (withdrawAmount > (goal?.current_amount || 0)) {
            toast.error("Fondos insuficientes en la meta")
            return
        }

        withdraw({
            goalId: goal.id,
            amount: withdrawAmount,
            fromAccountId,
            toAccountId,
            date: new Date().toISOString().split('T')[0],
            notes
        }, {
            onSuccess: () => {
                setAmount('')
                setNotes('')
                setToAccountId('')
                // Don't reset fromAccountId
                onOpenChange(false)
            }
        })
    }

    const maxAmount = goal?.current_amount || 0
    const isGoalCompleted = goal?.status === 'COMPLETED'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Retirar Fondos</DialogTitle>
                    <DialogDescription>
                        Retira dinero de tu meta "{goal?.name}" hacia otra cuenta
                    </DialogDescription>
                </DialogHeader>

                {!isGoalCompleted && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex gap-3 animated-pulse">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full h-fit text-amber-600 dark:text-amber-500">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-700 dark:text-amber-400">¡Advertencia!</h4>
                            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                                Esta meta aún <strong>no está completada</strong>. Retirar fondos afectará tu progreso y retrasará el cumplimiento de tu objetivo.
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Source Info (Visual only) */}
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Disponible para retirar:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-500 text-lg">
                            {goal?.currency || 'S/'} {maxAmount.toFixed(2)}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fromAccount">Retirar desde (Origen) *</Label>
                        <Select value={fromAccountId} onValueChange={setFromAccountId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona cuenta de origen" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc: any) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.currency_code || acc.currencyCode || 'S/'} {Number(acc.currentBalance).toFixed(2)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Cuenta donde está el dinero físico actualmente.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto a retirar ({goal?.currency || 'S/'}) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            max={maxAmount}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            className="text-lg font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="toAccount">Depositar en *</Label>
                        <Select value={toAccountId} onValueChange={setToAccountId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona cuenta de destino" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts
                                    .filter((acc: any) => acc.id !== fromAccountId)
                                    .map((acc: any) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({acc.currency_code || acc.currencyCode || 'PEN'} {Number(acc.currentBalance).toFixed(2)})
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Motivo del retiro..."
                            rows={3}
                        />
                    </div>

                    {/* Preview */}
                    {amount && parseFloat(amount) > 0 && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Saldo en meta después del retiro:</span>
                                <span className="font-bold text-amber-600">
                                    {goal?.currency || 'S/'} {(maxAmount - parseFloat(amount)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!amount || parseFloat(amount) <= 0 || !fromAccountId || !toAccountId || isPending || parseFloat(amount) > maxAmount}
                            className="flex-1"
                            variant="destructive"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Retirando...
                                </>
                            ) : (
                                <>
                                    Retirar Fondos
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
