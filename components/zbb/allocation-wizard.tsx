"use client"

import { useState, useEffect, useRef } from "react"
import { useSWRConfig } from "swr"
import { Plus, Wallet, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    editingAllocation?: any
}

// Fetcher
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function AllocationWizard({ cycleId, trigger, onSuccess, editingAllocation }: AllocationWizardProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { mutate } = useSWRConfig()

    // Tabs State
    const [tab, setTab] = useState<'expenses' | 'savings'>('expenses')

    // Focus Refs
    const amountInputRef = useRef<HTMLInputElement>(null)

    // Form State
    const [categoryId, setCategoryId] = useState("")
    const [goalId, setGoalId] = useState("")
    const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined)
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState("PEN")
    const [justification, setJustification] = useState("")
    const [priority, setPriority] = useState("1") // SMART DEFAULT: 1 (Essential)
    const [frequency, setFrequency] = useState("monthly")

    // Load Categories
    const { data: categories } = useSWR('/api/categories?type=EXPENSE', fetcher)

    // Load Active Savings Goals
    const { data: goalsData } = useSWR('/api/savings-goals?status=ACTIVE', fetcher)
    const activeGoals = goalsData?.goals || []

    // Load Plan for Duplicate Detection
    const { data: cycleData } = useSWR('/api/zbb/planning-cycle', fetcher)
    const existingAllocations = cycleData?.cycle?.allocations || []

    // Duplicate Check
    const getExistingAllocation = () => {
        if (editingAllocation) return null // If editing, we don't care about "finding" it
        if (tab === 'expenses') {
            return existingAllocations.find((a: any) => a.category_id === categoryId)
        } else {
            return existingAllocations.find((a: any) => a.goal_id === goalId)
        }
    }

    const duplicate = getExistingAllocation()

    // Initialize from editingAllocation
    useEffect(() => {
        if (open && editingAllocation) {
            if (editingAllocation.category_id) {
                setTab('expenses')
                setCategoryId(editingAllocation.category_id)
                setSubcategoryId(editingAllocation.subcategory_id)
            } else if (editingAllocation.goal_id) {
                setTab('savings')
                setGoalId(editingAllocation.goal_id)
            }

            const isPen = editingAllocation.allocated_amount_pen > 0
            const rawAmount = isPen ? editingAllocation.allocated_amount_pen : editingAllocation.allocated_amount_usd
            const justText = editingAllocation.justification || ""

            setCurrency(isPen ? 'PEN' : 'USD')
            setPriority(String(editingAllocation.priority))

            // SMART RESTORE: Check if justification has [Frequency] tag
            let restoredFreq = 'monthly'
            let validAmount = rawAmount

            if (justText.includes('[Diario]')) {
                restoredFreq = 'daily'
                validAmount = rawAmount / 30.41
            } else if (justText.includes('[Semanal]')) {
                restoredFreq = 'weekly'
                validAmount = rawAmount / 4.33
            } else if (justText.includes('[Quincenal]')) {
                restoredFreq = 'biweekly'
                validAmount = rawAmount / 2.16
            }

            // Clean justification for UI
            const cleanJust = justText.replace(/\[.*?\]\s*/g, '')

            setAmount(parseFloat(validAmount).toFixed(2))
            setFrequency(restoredFreq)
            setJustification(cleanJust)

        } else if (open && !editingAllocation) {
            resetForm()
        }
    }, [open, editingAllocation])

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

        // SMART JUSTIFICATION: Auto-fill if empty
        let finalJustification = justification
        if (!finalJustification || finalJustification.trim().length === 0) {
            if (tab === 'expenses') {
                const cat = categories?.expense?.find((c: any) => c.id === categoryId)
                const sub = cat?.subcategories?.find((s: any) => s.id === subcategoryId)
                const name = sub ? `${cat?.name}: ${sub.name}` : cat?.name || "Gasto General"
                finalJustification = `Planificado: ${name}`
            } else {
                const goal = activeGoals.find((g: any) => g.id === goalId)
                finalJustification = `Ahorro: ${goal?.name || 'Meta'}`
            }
        }

        setIsSubmitting(true)

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

        // Auto-append frequency context
        if (frequency !== 'monthly') {
            const freqMap: Record<string, string> = { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal' }
            const label = freqMap[frequency]
            if (!finalJustification.includes(`[${label}]`)) {
                finalJustification = `[${label}] ${finalJustification}`
            }
        }

        try {
            const url = '/api/zbb/allocations'
            const isUpdating = !!editingAllocation || !!duplicate
            const method = isUpdating ? 'PUT' : 'POST'

            const body: any = {
                cycleId,
                categoryId: tab === 'expenses' ? categoryId : null,
                subcategoryId: tab === 'expenses' ? subcategoryId : null,
                goalId: tab === 'savings' ? goalId : null,
                amount: getMonthlyAmount(),
                currency,
                justification: finalJustification,
                priority: parseInt(priority)
            }

            if (isUpdating) body.id = editingAllocation?.id || duplicate?.id

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
        setPriority("1")
        setFrequency("monthly")
        setTab('expenses')
    }

    const handleCategoryChange = (catId: string, subId?: string) => {
        setCategoryId(catId)
        setSubcategoryId(subId)
        setTimeout(() => amountInputRef.current?.focus(), 100)
    }

    const [showJustification, setShowJustification] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 h-10 px-6 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95">
                        <Plus className="w-5 h-5 mr-2" /> Asignar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl bg-card rounded-3xl">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                            <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg shadow-primary/20">
                                <Wallet className="w-6 h-6" />
                            </div>
                            {editingAllocation ? 'Editar Asignación' : 'Nueva Asignación'}
                        </DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground/80 font-medium ml-1">
                            {editingAllocation ? 'Ajusta los detalles.' : 'Define el destino de tu dinero.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 bg-background/50 backdrop-blur-sm p-1.5 rounded-2xl mt-6 border border-border/50 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setTab('expenses')}
                            className={cn(
                                "py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                                tab === 'expenses'
                                    ? "bg-white dark:bg-zinc-800 shadow-md text-primary scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            Gastos y Facturas
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('savings')}
                            className={cn(
                                "py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                                tab === 'savings'
                                    ? "bg-white dark:bg-zinc-800 shadow-md text-emerald-600 scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            Metas de Ahorro
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {duplicate && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 p-3 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <div className="bg-amber-500 text-white p-1 rounded-full">
                                    <Plus className="w-3 h-3 rotate-45" />
                                </div>
                                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-tight">
                                    Ya está en tu plan
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // Reset and switch to edit mode simulation or just close and open edit?
                                    // Better: Redirect form state to match existing one
                                    const alloc = duplicate
                                    if (alloc.category_id) setCategoryId(alloc.category_id)
                                    if (alloc.subcategory_id) setSubcategoryId(alloc.subcategory_id)
                                    if (alloc.goal_id) setGoalId(alloc.goal_id)

                                    const isPen = alloc.allocated_amount_pen > 0
                                    setCurrency(isPen ? 'PEN' : 'USD')
                                    setAmount(String(isPen ? alloc.allocated_amount_pen : alloc.allocated_amount_usd))
                                    setPriority(String(alloc.priority))
                                    setJustification(alloc.justification || "")

                                    // Force "Edit" perspective (though technically we are still "New" in the wizard prop)
                                    // But since validation will fail on server if we use POST, we should warn.
                                    toast.info("Cargada asignación existente.")
                                }}
                                className="h-7 text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-lg px-2"
                            >
                                CARGAR DATOS
                            </Button>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                            {tab === 'expenses' ? 'Categoría' : 'Meta de Ahorro'}
                        </Label>

                        <div className="relative group">
                            {tab === 'expenses' ? (
                                <CategorySelector
                                    categories={categories?.expense || []}
                                    categoryId={categoryId}
                                    subcategoryId={subcategoryId}
                                    onChange={handleCategoryChange}
                                    enableTabs={true}
                                    autoFocus={!editingAllocation}
                                    defaultOpen={!editingAllocation && tab === 'expenses'}
                                />
                            ) : (
                                <Select value={goalId} onValueChange={setGoalId}>
                                    <SelectTrigger className="h-14 rounded-2xl border-input/60 bg-muted/20 hover:bg-muted/30 transition-all text-base px-4 font-medium shadow-sm">
                                        <SelectValue placeholder="Selecciona una meta..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeGoals.length === 0 ? (
                                            <div className="p-4 text-sm text-center text-muted-foreground font-medium">No hay metas activas</div>
                                        ) : (
                                            activeGoals.map((g: any) => (
                                                <SelectItem key={g.id} value={g.id} className="py-3 font-medium">
                                                    {g.name}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Monto</Label>
                        <div className="flex gap-4">
                            <div className="flex-1 relative group transition-all focus-within:ring-2 focus-within:ring-primary/20 rounded-2xl">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg pointer-events-none">
                                    {currency === 'PEN' ? 'S/' : '$'}
                                </span>
                                <Input
                                    ref={amountInputRef}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-12 h-14 text-xl font-bold rounded-2xl border-input/60 bg-muted/20 hover:bg-muted/30 focus-visible:bg-background transition-all shadow-sm w-full"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                />
                                {frequency !== 'monthly' && amount && (
                                    <div className="absolute -bottom-6 left-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                                            Calculado: {currency === 'PEN' ? 'S/' : '$'} {getMonthlyAmount().toLocaleString('es-PE', { minimumFractionDigits: 2 })} al mes
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="w-32">
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="w-full h-14 rounded-2xl border-input/60 bg-muted/20 hover:bg-muted/30 transition-all font-bold text-base text-center px-4 shadow-sm focus:ring-2 focus:ring-primary/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PEN" className="font-bold py-3 pl-8">PEN (S/)</SelectItem>
                                        <SelectItem value="USD" className="font-bold py-3 pl-8">USD ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Frecuencia</Label>
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger className="w-full h-14 rounded-2xl border-input/60 bg-muted/20 hover:bg-muted/30 transition-all font-medium text-base px-4 shadow-sm focus:ring-2 focus:ring-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly" className="py-3 font-medium">Mensual</SelectItem>
                                    <SelectItem value="biweekly" className="py-3 font-medium">Quincenal</SelectItem>
                                    <SelectItem value="weekly" className="py-3 font-medium">Semanal</SelectItem>
                                    <SelectItem value="daily" className="py-3 font-medium">Diario</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Prioridad</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className={cn(
                                    "w-full h-14 rounded-2xl border-input/60 bg-muted/20 hover:bg-muted/30 transition-all font-medium text-base px-4 shadow-sm focus:ring-2 focus:ring-primary/20",
                                    priority === '1' && "text-red-600 bg-red-50/50 dark:bg-red-900/10 border-red-200/50",
                                    priority === '2' && "text-orange-600 bg-orange-50/50 dark:bg-orange-900/10 border-orange-200/50",
                                    priority === '3' && "text-blue-600 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50"
                                )}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1" className="text-red-600 font-medium py-3">Esencial</SelectItem>
                                    <SelectItem value="2" className="text-orange-600 font-medium py-3">Importante</SelectItem>
                                    <SelectItem value="3" className="text-blue-600 font-medium py-3">Deseable</SelectItem>
                                    <SelectItem value="4" className="text-slate-500 font-medium py-3">Opcional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowJustification(!showJustification)}
                            className="text-xs text-muted-foreground hover:text-primary w-full flex items-center justify-between group h-auto py-2 hover:bg-transparent"
                        >
                            <span className="font-medium text-muted-foreground/60">{showJustification ? 'Ocultar Nota' : 'Añadir Nota / Justificación'}</span>
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
                                {justification ? 'Editado' : 'Auto'}
                            </span>
                        </Button>

                        {showJustification && (
                            <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                <Textarea
                                    placeholder={tab === 'expenses' ? "Motivo del gasto..." : "Motivo del ahorro..."}
                                    className="min-h-[80px] rounded-2xl border-input/60 bg-muted/20 resize-none focus-visible:ring-primary/20 text-sm p-4"
                                    value={justification}
                                    onChange={e => setJustification(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]",
                                duplicate && !editingAllocation
                                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/30"
                            )}
                        >
                            {isSubmitting ? "Guardando..." : (duplicate && !editingAllocation ? "Actualizar Existente" : (editingAllocation ? "Guardar Cambios" : "Confirmar Asignación"))}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
