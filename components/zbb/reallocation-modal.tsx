"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { ArrowRightLeft, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { CategoryIcon } from "@/components/icons/category-icon"

interface ReallocationModalProps {
    cycleId: string
    allocations: any[]
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function ReallocationModal({ cycleId, allocations, onSuccess, trigger }: ReallocationModalProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { mutate } = useSWRConfig()

    const [fromId, setFromId] = useState("")
    const [toId, setToId] = useState("")
    const [amount, setAmount] = useState("")

    // Filter Logic
    const fromAllocation = allocations.find(a => a.id === fromId)
    // const toAllocation = allocations.find(a => a.id === toId)

    const maxAmount = fromAllocation
        ? Math.max(fromAllocation.allocated_amount_pen, fromAllocation.allocated_amount_usd)
        : 0

    const currency = fromAllocation
        ? (fromAllocation.allocated_amount_pen > 0 ? 'PEN' : 'USD')
        : 'PEN'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fromId || !toId || !amount) {
            toast.error("Completa todos los campos")
            return
        }

        if (parseFloat(amount) > maxAmount) {
            toast.error("Saldo insuficiente en el origen")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/zbb/reallocate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cycleId,
                    fromId,
                    toId,
                    amount: parseFloat(amount)
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error al mover dinero")

            toast.success("Dinero movido con éxito")
            setOpen(false)
            setFromId("")
            setToId("")
            setAmount("")
            mutate('/api/zbb/planning-cycle')
            onSuccess?.()

        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                        <ArrowRightLeft className="w-4 h-4" /> Mover Dinero
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        Mover Dinero (Reasignar)
                    </DialogTitle>
                    <DialogDescription>
                        Ajusta tu plan moviendo fondos de una categoría a otra sin romper tu presupuesto.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    {/* FROM */}
                    <div className="space-y-2">
                        <Label>Mover desde (Origen)</Label>
                        <Select value={fromId} onValueChange={setFromId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona origen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allocations
                                    .filter(a => a.id !== toId && (a.allocated_amount_pen > 0 || a.allocated_amount_usd > 0))
                                    .map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <div className="flex items-center justify-between w-full gap-4">
                                                <span className="flex items-center gap-2 truncate">
                                                    {a.goal
                                                        ? <Target className="w-4 h-4 text-emerald-600" />
                                                        : <CategoryIcon name={a.category?.icon} className="w-4 h-4 text-muted-foreground" />
                                                    }
                                                    <span className="truncate max-w-[150px]">{a.category?.name || a.goal?.name}</span>
                                                </span>
                                                <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded">
                                                    {a.allocated_amount_pen > 0 ? `S/ ${a.allocated_amount_pen}` : `$ ${a.allocated_amount_usd}`}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TO */}
                    <div className="space-y-2">
                        <Label>Hacia (Destino)</Label>
                        <Select value={toId} onValueChange={setToId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona destino..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allocations
                                    .filter(a => a.id !== fromId)
                                    // Should we limit to same currency? Yes, for Phase 2 simplicity.
                                    .filter(a => {
                                        if (!fromId) return true;
                                        // If source has PEN, only show PEN compatible destinations (or empty ones we assume will become PEN)
                                        // Logic: if destination has amount > 0, currency must match.
                                        const destCurrency = a.allocated_amount_pen > 0 ? 'PEN' : (a.allocated_amount_usd > 0 ? 'USD' : null)
                                        return !destCurrency || destCurrency === currency
                                    })
                                    .map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <span className="flex items-center gap-2">
                                                {a.goal
                                                    ? <Target className="w-4 h-4 text-emerald-600" />
                                                    : <CategoryIcon name={a.category?.icon} className="w-4 h-4 text-muted-foreground" />
                                                }
                                                <span>{a.category?.name || a.goal?.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* AMOUNT */}
                    <div className="space-y-2">
                        <Label>Monto a Mover</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-sm">
                                {currency === 'PEN' ? 'S/' : '$'}
                            </span>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={maxAmount}
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="pl-8 font-bold"
                                placeholder="0.00"
                            />
                        </div>
                        {maxAmount > 0 && (
                            <p className="text-xs text-muted-foreground text-right">
                                Disponible: {currency === 'PEN' ? 'S/' : '$'} {maxAmount.toFixed(2)}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || !fromId || !toId || !amount}>
                            {isSubmitting ? "Moviendo..." : "Confirmar Movimiento"}
                        </Button>
                    </DialogFooter>

                </form>
            </DialogContent>
        </Dialog>
    )
}
