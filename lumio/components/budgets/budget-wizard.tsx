"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Check, Calendar as CalendarIcon } from "lucide-react"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { cn } from "@/lib/utils"
import { CategoryGridSelector } from "./category-grid-selector"
import { AccountSelector } from "./account-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const budgetSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
    period: z.enum(["MONTHLY", "CUSTOM"]),
    type: z.enum(["EXPENSE", "SAVINGS"]),
    color: z.string(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    accountIds: z.array(z.string()).default([]),
    includeCategories: z.array(z.string()).default([]),
    excludeCategories: z.array(z.string()).default([])
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetWizardProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => void
    editingBudget?: any
}

const STEPS = ['Básico', 'Color', 'Cuentas', 'Categorías']

const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
]

export function BudgetWizard({ open, onOpenChange, onComplete, editingBudget }: BudgetWizardProps) {
    const [step, setStep] = useState(0)
    const { currencyCode } = useSettingsStore()
    const isEditing = !!editingBudget

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: {
            name: "",
            amount: 0,
            period: "MONTHLY",
            type: "EXPENSE",
            color: "#3b82f6",
            startDate: undefined,
            endDate: undefined,
            accountIds: [],
            includeCategories: [],
            excludeCategories: []
        }
    })

    const currentType = form.watch('type')
    const currentPeriod = form.watch('period')

    useEffect(() => {
        if (!open) {
            setStep(0)
            form.reset()
        } else if (editingBudget) {
            form.reset({
                name: editingBudget.name,
                amount: Number(editingBudget.amount),
                period: editingBudget.period,
                type: editingBudget.type,
                color: editingBudget.color,
                startDate: editingBudget.startDate ? new Date(editingBudget.startDate) : undefined,
                endDate: editingBudget.endDate ? new Date(editingBudget.endDate) : undefined,
                accountIds: editingBudget.accountIds || [],
                includeCategories: editingBudget.includeCategories || [],
                excludeCategories: editingBudget.excludeCategories || []
            })
        }
    }, [open, editingBudget, form])

    const toggleAccount = (id: string) => {
        const current = form.getValues('accountIds')
        form.setValue('accountIds', current.includes(id)
            ? current.filter(accountId => accountId !== id)
            : [...current, id], { shouldValidate: false })
    }

    const toggleIncludeCategory = (id: string) => {
        const included = form.getValues('includeCategories')
        const excluded = form.getValues('excludeCategories')
        if (excluded.includes(id)) {
            form.setValue('excludeCategories', excluded.filter(catId => catId !== id), { shouldValidate: false })
        }
        form.setValue('includeCategories', included.includes(id)
            ? included.filter(catId => catId !== id)
            : [...included, id], { shouldValidate: false })
    }

    const toggleExcludeCategory = (id: string) => {
        const included = form.getValues('includeCategories')
        const excluded = form.getValues('excludeCategories')
        if (included.includes(id)) {
            form.setValue('includeCategories', included.filter(catId => catId !== id), { shouldValidate: false })
        }
        form.setValue('excludeCategories', excluded.includes(id)
            ? excluded.filter(catId => catId !== id)
            : [...excluded, id], { shouldValidate: false })
    }

    const handleSubmit = async () => {
        const data = form.getValues()
        const isValid = await form.trigger()
        if (!isValid) return

        try {
            const url = isEditing ? `/api/budgets/${editingBudget.id}` : '/api/budgets'
            const method = isEditing ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, currencyCode })
            })
            if (res.ok) {
                form.reset()
                setStep(0)
                onOpenChange(false)
                onComplete()
            }
        } catch (error) {
            // Error handling
        }
    }

    const nextStep = async () => {
        const fields = getFieldsForStep(step)
        const valid = await form.trigger(fields as any)
        if (valid) setStep(s => Math.min(s + 1, STEPS.length - 1))
    }

    const prevStep = () => setStep(s => Math.max(s - 1, 0))

    const getFieldsForStep = (currentStep: number) => {
        switch (currentStep) {
            case 0: return currentPeriod === 'CUSTOM'
                ? ['name', 'amount', 'type', 'period', 'startDate', 'endDate']
                : ['name', 'amount', 'type', 'period']
            case 1: return ['color']
            case 2: return ['accountIds']
            case 3: return ['includeCategories', 'excludeCategories']
            default: return []
        }
    }

    const symbolMap: Record<string, string> = { 'PEN': 'S/.', 'USD': '$', 'EUR': '€', 'MXN': '$' }
    const symbol = symbolMap[currencyCode] || '$'

    return (
        <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onOpenChange(false)}>
            <DialogContent
                className="sm:max-w-[550px] max-h-[85vh] p-0 gap-0"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="px-5 pt-5 pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">
                            {isEditing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                        </DialogTitle>
                        <span className="text-xs text-muted-foreground">
                            {step + 1}/{STEPS.length}
                        </span>
                    </div>
                    <div className="flex gap-1 mt-3">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "h-1 flex-1 rounded-full transition-all",
                                    idx <= step ? "bg-primary" : "bg-muted"
                                )}
                            />
                        ))}
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {step === 0 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="EXPENSE">Gastos</SelectItem>
                                                        <SelectItem value="SAVINGS">Ahorros</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="period"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Periodo</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="MONTHLY">Mensual</SelectItem>
                                                        <SelectItem value="CUSTOM">Personalizado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {currentPeriod === 'CUSTOM' && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-md">
                                        <FormField
                                            control={form.control}
                                            name="startDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="text-xs">Inicio</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "h-9 pl-3 text-left font-normal text-xs",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar"}
                                                                    <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                locale={es}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="endDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="text-xs">Fin</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "h-9 pl-3 text-left font-normal text-xs",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? format(field.value, "dd/MM/yyyy") : "Seleccionar"}
                                                                    <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) => date < (form.getValues('startDate') || new Date())}
                                                                locale={es}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Ej: Comida Mensual"
                                                    className="h-9"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {currentType === 'EXPENSE' ? 'Límite' : 'Meta'} ({currencyCode})
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                        {symbol}
                                                    </span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...field}
                                                        className="h-10 pl-8 text-lg font-semibold"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color</FormLabel>
                                            <FormControl>
                                                <div className="grid grid-cols-4 gap-2.5">
                                                    {COLORS.map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => field.onChange(color)}
                                                            className={cn(
                                                                "h-12 rounded-lg transition-all relative",
                                                                field.value === color && "ring-2 ring-offset-2 ring-primary"
                                                            )}
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            {field.value === color && (
                                                                <Check className="absolute inset-0 m-auto w-5 h-5 text-white" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="accountIds"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cuentas</FormLabel>
                                            <AccountSelector
                                                selectedIds={field.value}
                                                onToggle={toggleAccount}
                                            />
                                            {field.value.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => field.onChange([])}
                                                    className="w-full h-8"
                                                >
                                                    Limpiar
                                                </Button>
                                            )}
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3">
                                <Tabs defaultValue="include">
                                    <TabsList className="grid w-full grid-cols-2 h-9">
                                        <TabsTrigger value="include" className="text-xs">Incluir</TabsTrigger>
                                        <TabsTrigger value="exclude" className="text-xs">Excluir</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="include" className="mt-3">
                                        <FormField
                                            control={form.control}
                                            name="includeCategories"
                                            render={({ field }) => (
                                                <CategoryGridSelector
                                                    selectedIds={field.value}
                                                    onToggle={toggleIncludeCategory}
                                                    type={currentType === 'EXPENSE' ? 'EXPENSE' : 'INCOME'}
                                                    mode="INCLUDE"
                                                />
                                            )}
                                        />
                                    </TabsContent>

                                    <TabsContent value="exclude" className="mt-3">
                                        <FormField
                                            control={form.control}
                                            name="excludeCategories"
                                            render={({ field }) => (
                                                <CategoryGridSelector
                                                    selectedIds={field.value}
                                                    onToggle={toggleExcludeCategory}
                                                    type={currentType === 'EXPENSE' ? 'EXPENSE' : 'INCOME'}
                                                    mode="EXCLUDE"
                                                />
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>

                    <div className="border-t px-5 py-3 flex items-center justify-between bg-muted/20">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={prevStep}
                            disabled={step === 0}
                            size="sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Atrás
                        </Button>

                        {step < STEPS.length - 1 ? (
                            <Button type="button" onClick={nextStep} size="sm">
                                Siguiente
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleSubmit} size="sm">
                                <Check className="w-4 h-4 mr-1" />
                                {isEditing ? 'Guardar' : 'Crear'}
                            </Button>
                        )}
                    </div>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
