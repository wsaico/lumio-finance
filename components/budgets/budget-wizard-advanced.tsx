"use client"

import { useState, useEffect } from "react"
import { useForm, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Check, Calendar as CalendarIcon, TrendingDown, TrendingUp, Wallet, Info, Sparkles, X, Loader2, CreditCard, AlertTriangle } from "lucide-react"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Import advanced components
import { CategoryGridSelector } from "./category-grid-selector"
import { AccountSelector } from "./account-selector"
import { TransactionFilterSelector } from "./transaction-filter-selector"
import { BudgetScopeSelector } from "./budget-scope-selector"
import { BudgetFormData, TransactionFilterMode, BudgetType } from "@/types/budget"

const budgetSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
    period: z.enum(["MONTHLY", "CUSTOM"]),
    type: z.enum(["EXPENSE", "SAVINGS"]),
    color: z.string(),
    currencyCode: z.string(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),

    // Advanced filters
    transactionFilterMode: z.string().default("DEFAULT"),
    budgetScope: z.string().default("ALL_TRANSACTIONS"),
    includeLoaned: z.boolean().default(false),
    includeGoalTransactions: z.boolean().default(false),
    includeBalanceCorrections: z.boolean().default(false),
    includeFromOtherBudgets: z.boolean().default(false),
    excludedBudgetIds: z.array(z.string()).default([]),

    // Basic filters
    accountIds: z.array(z.string()).default([]),
    includeCategories: z.array(z.string()).default([]),
    excludeCategories: z.array(z.string()).default([]),
    includeTags: z.array(z.string()).default([])
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetWizardAdvancedProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => void
    editingBudget?: any
}

const COLORS = [
    '#0ea5e9', '#10b981', '#06b6d4', '#0891b2',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#f97316', '#f59e0b',
    '#eab308', '#84cc16', '#64748b', '#475569'
]



export function BudgetWizardAdvanced({ open, onOpenChange, onComplete, editingBudget }: BudgetWizardAdvancedProps) {
    const [step, setStep] = useState(0)
    const [selectedFilters, setSelectedFilters] = useState<TransactionFilterMode[]>(['DEFAULT'])
    const { currencyCode } = useSettingsStore()
    const isEditing = !!editingBudget

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema) as unknown as Resolver<BudgetFormValues>,
        defaultValues: {
            name: "",
            amount: 0,
            period: "MONTHLY",
            type: "EXPENSE",
            color: COLORS[0],
            currencyCode: currencyCode || "USD",
            startDate: undefined,
            endDate: undefined,
            transactionFilterMode: "DEFAULT",
            budgetScope: "ALL_TRANSACTIONS",
            includeLoaned: false,
            includeGoalTransactions: false,
            includeBalanceCorrections: false,
            includeFromOtherBudgets: false,
            excludedBudgetIds: [],
            accountIds: [],
            includeCategories: [],
            excludeCategories: [],
            includeTags: []
        }
    })

    const currentType = form.watch('type')
    const currentPeriod = form.watch('period')
    const currentBudgetScope = form.watch('budgetScope')

    useEffect(() => {
        if (!open) {
            setStep(0)
            setSelectedFilters(['DEFAULT'])
            form.reset()
        } else if (editingBudget) {
            (form.reset as any)({
                name: editingBudget.name,
                amount: Number(editingBudget.amount),
                period: editingBudget.period,
                type: editingBudget.type,
                color: editingBudget.color,
                currencyCode: editingBudget.currencyCode || currencyCode,
                ...(editingBudget.startDate ? { startDate: new Date(editingBudget.startDate) } : {}),
                ...(editingBudget.endDate ? { endDate: new Date(editingBudget.endDate) } : {}),
                transactionFilterMode: editingBudget.transactionFilterMode || 'DEFAULT',
                budgetScope: editingBudget.budgetScope || 'ALL_TRANSACTIONS',
                includeLoaned: editingBudget.includeLoaned || false,
                includeGoalTransactions: editingBudget.includeGoalTransactions || false,
                includeBalanceCorrections: editingBudget.includeBalanceCorrections || false,
                includeFromOtherBudgets: editingBudget.includeFromOtherBudgets || false,
                excludedBudgetIds: editingBudget.excludedBudgetIds || [],
                accountIds: editingBudget.accountIds || [],
                includeCategories: editingBudget.includeCategories || [],
                excludeCategories: editingBudget.excludeCategories || [],
                includeTags: editingBudget.includeTags || []
            })

            // Set initial filters
            const initialFilters: TransactionFilterMode[] = ['DEFAULT']
            if (editingBudget.includeLoaned) initialFilters.push('LOANED')
            if (editingBudget.includeGoalTransactions) initialFilters.push('ADDED_TO_GOAL')
            if (editingBudget.includeBalanceCorrections) initialFilters.push('BALANCE_CORRECTION')
            setSelectedFilters(initialFilters)
        }
    }, [open, editingBudget, form, currencyCode])

    const handleNext = async () => {
        let fieldsToValidate: (keyof BudgetFormValues)[] = []

        if (step === 1) {
            fieldsToValidate = ['name', 'amount', 'period', 'type']
            if (currentPeriod === 'CUSTOM') {
                fieldsToValidate.push('startDate', 'endDate')
            }
        }

        if (fieldsToValidate.length > 0) {
            const isValid = await form.trigger(fieldsToValidate)
            if (!isValid) return
        }

        if (step < 4) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1)
        }
    }

    const handleFilterToggle = (filter: TransactionFilterMode) => {
        setSelectedFilters(prev => {
            if (prev.includes(filter)) {
                // Don't allow removing DEFAULT if it's the only one
                if (filter === 'DEFAULT' && prev.length === 1) {
                    return prev
                }
                return prev.filter(f => f !== filter)
            } else {
                return [...prev, filter]
            }
        })

        // Update form values based on filter
        if (filter === 'LOANED') {
            form.setValue('includeLoaned', !selectedFilters.includes(filter))
        } else if (filter === 'ADDED_TO_GOAL') {
            form.setValue('includeGoalTransactions', !selectedFilters.includes(filter))
        } else if (filter === 'BALANCE_CORRECTION') {
            form.setValue('includeBalanceCorrections', !selectedFilters.includes(filter))
        }
    }

    const handleSubmit = async (values: BudgetFormValues) => {
        try {
            // Calculate dates if MONTHLY
            let startDate = values.startDate
            let endDate = values.endDate

            if (values.period === 'MONTHLY') {
                const now = new Date()
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            }

            const payload = {
                ...values,
                amount: Number(values.amount),
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                currencyCode: values.currencyCode || currencyCode,

                // ZBB Desynchronization Logic
                // If this budget was ZBB controlled, manual edits break the link
                ...(editingBudget?.is_zbb_controlled ? {
                    is_zbb_controlled: false,
                    zbb_allocation_id: null
                } : {})
            }

            const url = isEditing ? `/api/budgets/${editingBudget.id}` : '/api/budgets'
            const method = isEditing ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Error al guardar presupuesto')
            }

            onComplete()
            onOpenChange(false)
        } catch (error) {
            console.error('Error saving budget:', error)
            alert(error instanceof Error ? error.message : 'Error al guardar presupuesto')
        }
    }

    const symbolMap: Record<string, string> = { 'PEN': 'S/.', 'USD': '$', 'EUR': '€', 'MXN': '$' }
    const symbol = symbolMap[currencyCode] || '$'

    if (!open) return null

    return (
        <div className="fixed inset-0 lg:left-72 z-[100] bg-white dark:bg-zinc-950 flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* 1. Header (Internal Page Style) */}
            <div className="px-10 py-6 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white">
                            {isEditing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                        </h1>
                        <p className="text-sm font-medium text-slate-400">
                            {step === 0 && "Elige una categoría para empezar"}
                            {step === 1 && "Personaliza los detalles"}
                            {step === 2 && "Configura las reglas inteligentes"}
                            {step === 3 && "Selecciona la cuenta"}
                            {step === 4 && "Confirma tu presupuesto"}
                        </p>
                    </div>
                </div>
                {/* Optional: Add a helper icon or status here if needed */}
            </div>

            {/* ZBB WARNING BANNER */}
            {isEditing && editingBudget?.is_zbb_controlled && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 px-10 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Este presupuesto está <strong>sincronizado con ZBB</strong>. Si editas aquí, se perderá la conexión automática.
                        </p>
                    </div>
                </div>
            )}

            {/* 2. Main Content Area */}
            <Form {...form}>
                <form className="flex-1 flex flex-col relative bg-transparent overflow-hidden">

                    {/* Scrollable Step Content */}
                    <div className="flex-1 overflow-y-auto px-4 lg:px-10 pt-6 pb-20 custom-scrollbar">
                        <div className="max-w-7xl mx-auto h-full pb-10">

                            {/* STEP 0: Category Selection (Smart Start) */}
                            {step === 0 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="text-center space-y-2 mb-8">
                                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 shadow-sm">
                                            <Sparkles className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                            ¿Qué quieres presupuestar hoy?
                                        </h2>
                                        <p className="text-slate-500 max-w-md mx-auto">
                                            Selecciona una categoría y la configuraremos automáticamente por ti.
                                        </p>
                                    </div>

                                    <CategoryGridSelector
                                        selectedIds={form.watch('includeCategories')}
                                        onToggle={(id, category) => {
                                            const current = form.watch('includeCategories') || []
                                            const isSelected = current.includes(id)
                                            let newSelected = []

                                            if (isSelected) {
                                                newSelected = current.filter(c => c !== id)
                                            } else {
                                                newSelected = [...current, id]
                                            }

                                            form.setValue("includeCategories", newSelected)

                                            // Logic to auto-set details based on FIRST selected category (if any)
                                            if (newSelected.length > 0) {
                                                const lastSelectedId = newSelected[newSelected.length - 1]
                                                // We might want to look up the category object for the name
                                                // For now, let's keep the name generic if multiple

                                                if (newSelected.length === 1) {
                                                    // Single selection logic (same as before)
                                                    form.setValue("name", `Presupuesto de ${category.name}`)
                                                    const type = category.type === 'INCOME' ? 'SAVINGS' : 'EXPENSE'
                                                    form.setValue("type", type)
                                                } else {
                                                    // Multiple selection logic
                                                    form.setValue("name", "Presupuesto Agrupado")
                                                    // Default to EXPENSE if mixed, or keep previous
                                                }
                                                form.setValue("budgetScope", "GLOBAL")
                                            }
                                        }}
                                        type="ALL"
                                        mode="INCLUDE"
                                    />

                                    <div className="flex flex-col items-center justify-center mt-8 gap-4">
                                        {form.watch('includeCategories')?.length > 0 && (
                                            <Button
                                                size="lg"
                                                onClick={() => setStep(1)}
                                                className="rounded-full px-8 font-bold bg-primary hover:bg-primary/90 shadow-lg animate-in zoom-in duration-300"
                                            >
                                                Continuar con {form.watch('includeCategories').length} {form.watch('includeCategories').length === 1 ? 'Categoría' : 'Categorías'}
                                                <ArrowRight className="w-5 h-5 ml-2" />
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            type="button"
                                            onClick={() => {
                                                form.setValue("includeCategories", [])
                                                setStep(1)
                                            }}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            Configurar manualmente desde cero
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: Details Form */}
                            {step === 1 && (
                                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">

                                    {/* Selected Category Indicator */}
                                    {form.watch('includeCategories')?.[0] && (
                                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-4 rounded-2xl flex items-center gap-4">
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center text-purple-600">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-0.5">Categoría Seleccionada</p>
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{form.watch('name')}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-auto text-purple-600 hover:bg-purple-100"
                                                onClick={() => setStep(0)}
                                            >
                                                Cambiar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Name & Amount */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombre del Presupuesto</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Ej. Alimentación Mensual" className="h-12 text-lg font-bold bg-slate-50 dark:bg-zinc-900/50 border-input/50" />
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
                                                    <FormLabel>Monto Límite</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                                                {symbol}
                                                            </span>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                value={field.value === 0 || Number.isNaN(field.value) ? '' : field.value}
                                                                placeholder="0.00"
                                                                className="h-12 text-lg font-bold pl-10 bg-slate-50 dark:bg-zinc-900/50 border-input/50"
                                                                onChange={e => {
                                                                    const val = e.target.value
                                                                    field.onChange(val === '' ? 0 : parseFloat(val))
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Period & Colors */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="period"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Periodo</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-zinc-900/50 border-input/50">
                                                                <SelectValue placeholder="Seleccionar periodo" />
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

                                        <FormField
                                            control={form.control}
                                            name="color"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Color Identificativo</FormLabel>
                                                    <FormControl>
                                                        <div className="bg-slate-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-input/50 flex flex-wrap gap-2">
                                                            {COLORS.slice(0, 8).map((color) => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        field.onChange(color)
                                                                    }}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full transition-all hover:scale-110",
                                                                        field.value === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:opacity-80"
                                                                    )}
                                                                    style={{ backgroundColor: color }}
                                                                >
                                                                    {field.value === color && (
                                                                        <Check className="w-3 h-3 text-white mx-auto" />
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

                                </div>
                            )}

                            {/* STEP 2: Filter Selector (Smart Cards) */}
                            {step === 2 && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                                    <FormItem>
                                        <div className="mb-6">
                                            <FormLabel className="text-xl font-bold">Reglas de Inclusión</FormLabel>
                                            <FormDescription className="text-base">
                                                Define qué transacciones contarán para este presupuesto.
                                            </FormDescription>
                                        </div>
                                        <TransactionFilterSelector
                                            selectedFilters={selectedFilters}
                                            onToggle={handleFilterToggle}
                                        />
                                    </FormItem>
                                </div>
                            )}

                            {/* STEP 3: Account Selector */}
                            {step === 3 && (
                                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                                    <FormField
                                        control={form.control}
                                        name="budgetScope"
                                        render={({ field }) => (
                                            <FormItem className="space-y-4">
                                                <div className="mb-4">
                                                    <FormLabel className="text-xl font-bold">Alcance de Cuentas</FormLabel>
                                                    <FormDescription>
                                                        ¿Este presupuesto aplica a todas tus cuentas o solo a una específica?
                                                    </FormDescription>
                                                </div>

                                                <BudgetScopeSelector
                                                    selected={field.value as any}
                                                    onChange={field.onChange}
                                                />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Account Picker if Specific is selected */}
                                    {form.watch('budgetScope') === 'ACCOUNT' && (
                                        <div className="mt-6 animate-in slide-in-from-top-2">
                                            <FormField
                                                control={form.control}
                                                name="accountIds"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Selecciona las Cuentas</FormLabel>
                                                        <AccountSelector
                                                            selectedIds={field.value}
                                                            onToggle={(id) => {
                                                                const current = field.value || [];
                                                                const updated = current.includes(id)
                                                                    ? current.filter(i => i !== id)
                                                                    : [...current, id];
                                                                field.onChange(updated);
                                                            }}
                                                        />
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 4: Review (Optional, or just confirm on last step) */}
                            {step === 4 && (
                                <div className="max-w-3xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="h-12 w-12" />
                                    </div>
                                    <h2 className="text-3xl font-black">¡Todo listo!</h2>
                                    <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                                        Hemos configurado tu presupuesto <strong>{form.watch('name')}</strong> de <strong>{symbol}{form.watch('amount')}</strong>.
                                    </p>

                                    <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-6 text-left max-w-md mx-auto space-y-3 shadow-inner">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Periodo:</span>
                                            <span className="font-bold">
                                                {form.watch('period') === 'MONTHLY' ? 'Mensual' : 'Personalizado'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Regla:</span>
                                            <span className="font-bold">
                                                {selectedFilters.length > 0
                                                    ? selectedFilters.map(f => {
                                                        if (f === 'DEFAULT') return 'Estándar';
                                                        if (f === 'LOANED') return 'Incluye Préstamos';
                                                        if (f === 'ADDED_TO_GOAL') return 'Incluye Ahorros';
                                                        if (f === 'BALANCE_CORRECTION') return 'Incluye Transferencias';
                                                        return f;
                                                    }).join(', ')
                                                    : 'Todo'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Alcance:</span>
                                            <span className="font-bold">{form.watch('budgetScope') === 'GLOBAL' ? 'Global' : 'Cuenta Específica'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* 3. Bottom Action Bar (Fixed Footer) */}
                    <div className="w-full bg-white/80 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-10 py-4 flex justify-between items-center z-20">
                        {step > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="text-slate-500 hover:text-slate-800 font-bold"
                            >
                                <span className="mr-2">←</span> Atrás
                            </Button>
                        )}

                        {step === 0 && <div />} {/* Spacer for layout balance */}

                        {step < 4 ? (
                            step > 0 && ( /* Only show Next on steps > 0 */
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-xl px-8 font-bold text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all"
                                >
                                    Siguiente
                                </Button>
                            )
                        ) : (
                            <Button
                                type="button"
                                onClick={form.handleSubmit(handleSubmit)}
                                disabled={form.formState.isSubmitting}
                                className={cn(
                                    "rounded-xl px-12 h-14 font-black text-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-all w-full max-w-xs ml-auto",
                                    form.formState.isSubmitting && "opacity-80 scale-95"
                                )}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creando...
                                    </>
                                ) : (
                                    "Crear Presupuesto"
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    )
}
