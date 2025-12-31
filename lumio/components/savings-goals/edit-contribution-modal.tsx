"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EditContributionModalProps {
    contribution: {
        id: string
        amount: number
        contribution_date: string
        notes?: string
    }
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: (id: string, data: { amount: number; contributionDate: string; notes: string }) => void
    isPending?: boolean
}

export function EditContributionModal({
    contribution,
    open,
    onOpenChange,
    onUpdate,
    isPending = false
}: EditContributionModalProps) {
    const [amount, setAmount] = useState(contribution.amount)
    const [date, setDate] = useState(contribution.contribution_date)
    const [notes, setNotes] = useState(contribution.notes || '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onUpdate(contribution.id, {
            amount,
            contributionDate: date,
            notes
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Contribución</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto (S/) *</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(parseFloat(e.target.value))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="date">Fecha *</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas opcionales..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
