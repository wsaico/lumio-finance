"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useAddContribution } from "@/hooks/use-savings-goals"
import { Loader2 } from "lucide-react"

interface ContributeModalProps {
    goal: any
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ContributeModal({ goal, open, onOpenChange }: ContributeModalProps) {
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const { mutate: addContribution, isPending } = useAddContribution()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        addContribution({
            goalId: goal.id,
            amount: parseFloat(amount),
            date: new Date().toISOString().split('T')[0],
            notes
        }, {
            onSuccess: () => {
                setAmount('')
                setNotes('')
                onOpenChange(false)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agregar Contribución</DialogTitle>
                    <DialogDescription>
                        Registra un aporte a tu meta "{goal?.name}"
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto (S/) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100.00"
                            required
                            className="text-lg font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Ahorro del mes de enero"
                            rows={3}
                        />
                    </div>

                    {/* Preview */}
                    {amount && parseFloat(amount) > 0 && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progreso actual:</span>
                                <span className="font-medium">
                                    S/ {Number(goal?.current_amount || 0).toFixed(2)} / S/ {Number(goal?.target_amount || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Después de contribuir:</span>
                                <span className="font-bold text-emerald-600">
                                    S/ {(Number(goal?.current_amount || 0) + parseFloat(amount)).toFixed(2)} / S/ {Number(goal?.target_amount || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Nuevo progreso:</span>
                                <span className="font-bold text-emerald-600">
                                    {(((Number(goal?.current_amount || 0) + parseFloat(amount)) / Number(goal?.target_amount || 1)) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
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
                            disabled={!amount || parseFloat(amount) <= 0 || isPending}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                'Agregar Contribución'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
