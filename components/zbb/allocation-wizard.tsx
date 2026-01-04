"use client"

import { useState, useEffect } from "react"
import { useSWRConfig } from "swr"
import { Plus, Wallet, HelpCircle, Target } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import useSWR from "swr"
import { CategorySelector } from "@/components/transactions/category-selector"
import { useSavingsGoals } from "@/hooks/use-savings-goals"
import { cn } from "@/lib/utils"

// Types
interface Category {
    id: string
    name: string
    icon: string
}

interface AllocationWizardProps {
    cycleId: string
    trigger?: React.ReactNode
    onSuccess?: () => void
    editingAllocation?: any // NEW PROP
}

// Fetcher
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function AllocationWizard({ cycleId, trigger, onSuccess, editingAllocation }: AllocationWizardProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { mutate } = useSWRConfig()

    // Tabs State
    const [tab, setTab] = useState<'expenses' | 'savings'>('expenses')

    // Form State
    const [categoryId, setCategoryId] = useState("")
    const [goalId, setGoalId] = useState("") // NEW
    const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined)
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState("PEN")
    const [justification, setJustification] = useState("")
    const [priority, setPriority] = useState("")
    const [frequency, setFrequency] = useState("monthly")

    // Initialize from editingAllocation
    useEffect(() => {
        if (open && editingAllocation) {
            // Can be category or goal
            // Assuming editingAllocation has goal_id if applicable. TODO: Check backend schema if goal_id exists in zbb_allocations
            // For now, let's assume standard expense editing.
            if (editingAllocation.category_id) {
                setTab('expenses')
                setCategoryId(editingAllocation.category_id)
                setSubcategoryId(editingAllocation.subcategory_id)
            } else if (editingAllocation.goal_id) {
                setTab('savings')
                setGoalId(editingAllocation.goal_id)
            }

            const isPen = editingAllocation.allocated_amount_pen > 0
            setAmount(isPen ? editingAllocation.allocated_amount_pen : editingAllocation.allocated_amount_usd)
            setCurrency(isPen ? 'PEN' : 'USD')
            setJustification(editingAllocation.justification)
            setPriority(String(editingAllocation.priority))
            setFrequency("monthly")
        } else if (open && !editingAllocation) {
            resetForm()
        }
    }, [open, editingAllocation])

    // Combobox State
    const [openCombobox, setOpenCombobox] = useState(false)

    // Load Categories
    const { data: categories } = useSWR('/api/categories?type=EXPENSE', fetcher)

    // Load Active Savings Goals
    // const { goals } = useSavingsGoals('ACTIVE') 
    // Removed to fix lint error and redundancy. Using fetcher below.
    // Let's use the fetcher pattern directly if hook is not imported or complex to mock here without import
    const { data: goalsData } = useSWR('/api/savings-goals?status=ACTIVE', fetcher)
    const activeGoals = goalsData?.goals || []

    // Calculate Final Monthly Amount
    const getMonthlyAmount = () => {
        const val = parseFloat(amount) || 0
        switch (frequency) {
            case 'daily': return val * 30.41
            case 'weekly': return val * 4.33
            case 'biweekly': return val * 2.16
            default: return val
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!justification || justification.length < 5) {
            toast.error("ZBB requiere que justifiques este gasto (min 5 letras).")
            return
        }

        setIsSubmitting(true)

        // Validation based on Tab
        if (tab === 'expenses' && !categoryId) {
            toast.error("Selecciona una categoría")
            setIsSubmitting(false)
            return
        }
        if (tab === 'savings' && !goalId) {
            toast.error("Selecciona una meta de ahorro")
            setIsSubmitting(false)
            return
        }

        // Auto-append frequency context if not monthly
        let finalJustification = justification
        if (frequency !== 'monthly') {
            const freqMap: Record<string, string> = { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal' }
            const label = freqMap[frequency]
            finalJustification = `[Planificado: ${currency === 'PEN' ? 'S/' : '$'} ${amount} ${label}] ${justification}`
        }

        try {
            const url = '/api/zbb/allocations'
            const method = editingAllocation ? 'PUT' : 'POST'

            const body: any = {
                cycleId,
                categoryId: tab === 'expenses' ? categoryId : null,
                subcategoryId: tab === 'expenses' ? subcategoryId : null,
                goalId: tab === 'savings' ? goalId : null, // Send Goal ID
                amount: getMonthlyAmount(),
                currency,
                justification: finalJustification,
                priority: parseInt(priority)
            }

            if (editingAllocation) {
                body.id = editingAllocation.id
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || "Error al guardar")

            toast.success(editingAllocation ? "Asignación actualizada" : "Asignación registrada")
            setOpen(false)
            resetForm()
            mutate('/api/zbb/planning-cycle')
            onSuccess?.()

        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setCategoryId("")
        setGoalId("")
        setSubcategoryId(undefined)
        setAmount("")
        setJustification("")
        setPriority("")
        setFrequency("monthly")
        setTab('expenses')
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" /> Asignar Dinero
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] overflow-visible">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        {editingAllocation ? 'Editar Asignación' : 'Nueva Asignación ZBB'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingAllocation ? 'Modifica los detalles de tu decisión.' : 'Planifica tu dinero. Elige entre Gasto Inmediato o Ahorro Futuro.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-2">

                    {/* TABS SWITCHER */}
                    <div className="grid grid-cols-2 bg-muted p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setTab('expenses')}
                            className={cn(
                                "py-1.5 text-sm font-medium rounded-md transition-all",
                                tab === 'expenses' ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Gastos y Facturas
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('savings')}
                            className={cn(
                                "py-1.5 text-sm font-medium rounded-md transition-all",
                                tab === 'savings' ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Metas de Ahorro
                        </button>
                    </div>

                    {/* 1. SELECTION (Conditional) */}
                    <div className="space-y-2">
                        <Label>
                            {tab === 'expenses' ? '¿En qué vas a gastar?' : '¿Para qué meta estás ahorrando?'}
                        </Label>

                        {tab === 'expenses' ? (
                            <CategorySelector
                                categories={categories?.expense || []}
                                categoryId={categoryId}
                                subcategoryId={subcategoryId}
                                onChange={(catId: string, subId?: string) => {
                                    setCategoryId(catId)
                                    setSubcategoryId(subId)
                                }}
                                enableTabs={true}
                            />
                        ) : (
                            <Select value={goalId} onValueChange={setGoalId}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Selecciona una meta activa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeGoals.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">No hay metas activas</div>
                                    ) : (
                                        activeGoals.map((g: any) => (
                                            <SelectItem key={g.id} value={g.id}>
                                                <span className="flex items-center gap-2">
                                                    <Target className="w-4 h-4 text-emerald-600" />
                                                    <span>{g.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (Meta: {g.target_amount})
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* 2. Amount, Currency & Frequency */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Monto a Asignar</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-muted-foreground font-bold">
                                    {currency === 'PEN' ? 'S/' : '$'}
                                </span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-9 h-11 text-lg font-bold"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Frecuencia</Label>
                            {/* Frequency only makes sense for Expenses usually, but let's keep it for recurrent savings too */}
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="biweekly">Quincenal (x2)</SelectItem>
                                    <SelectItem value="weekly">Semanal (x4)</SelectItem>
                                    <SelectItem value="daily">Diario (x30)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Moneda</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PEN">PEN</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Live Calculation Preview */}
                    {frequency !== 'monthly' && amount && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3 text-sm text-primary animate-in fade-in slide-in-from-top-2">
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <div>
                                <span className="font-bold">Cálculo Automático:</span> Estás asignando
                                <span className="font-mono font-bold mx-1">
                                    {currency === 'PEN' ? 'S/' : '$'} {getMonthlyAmount().toFixed(2)}
                                </span>
                                al plan mensual.
                            </div>
                        </div>
                    )}

                    {/* 3. Priority + Justification Grid */}
                    <div className="grid gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-muted-foreground">
                                Prioridad
                            </Label>
                            <Select value={priority} onValueChange={setPriority} required>
                                <SelectTrigger className="bg-card border-border">
                                    <SelectValue placeholder="Seleccionar nivel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">🔴 Esencial (Supervivencia)</SelectItem>
                                    <SelectItem value="2">🟠 Importante (Calidad de Vida)</SelectItem>
                                    <SelectItem value="3">🔵 Deseable (Gustos)</SelectItem>
                                    <SelectItem value="4">⚪ Opcional (Si sobra)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex justify-between items-center text-xs uppercase tracking-wider font-bold text-muted-foreground">
                                Justificación
                                <span className="text-[10px] normal-case bg-card px-2 py-0.5 rounded border text-muted-foreground">Requerido</span>
                            </Label>
                            <Textarea
                                placeholder={tab === 'expenses' ? "¿Por qué es necesario este gasto?" : "¿Por qué priorizas esta meta ahora?"}
                                className="min-h-[60px] bg-card border-border resize-none text-sm"
                                value={justification}
                                onChange={e => setJustification(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base shadow-md">
                            {isSubmitting ? "Guardando..." : (editingAllocation ? "Guardar Cambios" : "Confirmar Asignación")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
