"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { Play, DollarSign, Calendar, Plus, Trash2, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface IncomeSource {
    id: string
    name: string
    amount: string
    currency: 'PEN' | 'USD'
}

interface IncomeWizardProps {
    existingData?: {
        cycleId: string
        sources: IncomeSource[]
    }
}

export function IncomeWizard({ existingData }: IncomeWizardProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { mutate } = useSWRConfig()

    // Default to current month
    const now = new Date()
    const currentMonthName = format(now, "MMMM yyyy", { locale: es })

    // State: List of Sources
    const [sources, setSources] = useState<IncomeSource[]>(
        existingData?.sources?.length
            ? existingData.sources
            : [{ id: '1', name: 'Sueldo Principal', amount: '', currency: 'PEN' }]
    )

    // Totals
    const totalPEN = sources
        .filter(s => s.currency === 'PEN')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

    const totalUSD = sources
        .filter(s => s.currency === 'USD')
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

    const addSource = () => {
        setSources([...sources, {
            id: crypto.randomUUID(),
            name: '',
            amount: '',
            currency: 'PEN'
        }])
    }

    const removeSource = (id: string) => {
        setSources(sources.filter(s => s.id !== id))
    }

    const updateSource = (id: string, field: keyof IncomeSource, value: string) => {
        setSources(sources.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const isUpdate = !!existingData?.cycleId
            const payload = {
                id: existingData?.cycleId,
                incomeUSD: totalUSD,
                incomePEN: totalPEN,
                incomeBreakdown: sources,
                period: isUpdate ? undefined : {
                    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
                    name: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
                }
            }

            const url = '/api/zbb/planning-cycle'
            const method = isUpdate ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Error al guardar")

            toast.success(isUpdate ? "Ingresos Actualizados" : "¡Planificación Iniciada!", {
                description: `Pool: S/ ${totalPEN.toFixed(2)} y $ ${totalUSD.toFixed(2)}`
            })

            setOpen(false)
            mutate('/api/zbb/planning-cycle')

        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {existingData ? (
                    <Button variant="outline" size="sm" className="h-8 border-dashed rounded-full px-4 hover:bg-neutral-100 bg-white">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Editar Ingresos
                    </Button>
                ) : (
                    <Button size="lg" className="w-full bg-primary font-bold text-lg h-12 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all">
                        <Play className="w-5 h-5 mr-2" /> Iniciar Planificación de {currentMonthName}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-primary" />
                        {existingData ? "Editar Ingresos" : "Calculadora de Ingresos"}
                    </DialogTitle>
                    <DialogDescription>
                        {existingData ? "Ajusta tus fuentes de ingreso. El Money Pool se recalculará." : "Lista todas tus fuentes de ingreso para este mes. Nosotros sumaremos el total."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-1 space-y-4">
                    <div className="space-y-3">
                        {sources.map((source, index) => (
                            <div key={source.id} className="flex gap-2 items-end animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="flex-1 space-y-1">
                                    {index === 0 && <Label>Fuente de Ingreso</Label>}
                                    <Input
                                        placeholder="Ej. Sueldo, Freelance, Venta..."
                                        value={source.name}
                                        onChange={e => updateSource(source.id, 'name', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    {index === 0 && <Label>Moneda</Label>}
                                    <Select
                                        value={source.currency}
                                        onValueChange={(val: 'PEN' | 'USD') => updateSource(source.id, 'currency', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PEN">PEN</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-32 space-y-1">
                                    {index === 0 && <Label>Monto</Label>}
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={source.amount}
                                        onChange={e => updateSource(source.id, 'amount', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="pb-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSource(source.id)}
                                        disabled={sources.length === 1}
                                        className="text-muted-foreground hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={addSource} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-2" /> Agregar otra fuente
                    </Button>
                </form>

                <div className="border-t pt-4 bg-neutral-50 -mx-6 px-6 pb-6 mt-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Calculado:</span>
                        <div className="flex gap-4 font-mono font-bold">
                            {totalPEN > 0 && <span className="text-slate-900">S/ {totalPEN.toFixed(2)}</span>}
                            {totalUSD > 0 && <span className="text-green-700">$ {totalUSD.toFixed(2)}</span>}
                            {totalPEN === 0 && totalUSD === 0 && <span className="text-muted-foreground">--</span>}
                        </div>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (totalPEN === 0 && totalUSD === 0)}
                        className="w-full font-bold bg-slate-900 hover:bg-slate-800"
                    >
                        {isLoading ? "Guardando..." : (existingData ? "Actualizar Ingresos" : "Confirmar Ingresos Totales")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
