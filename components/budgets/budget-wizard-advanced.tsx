"use client"

import { useState, useEffect } from "react"
import { useForm, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Sparkles,
    Loader2,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
} from "lucide-react"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol } from "@/lib/currencies"
import { cn } from "@/lib/utils"

import { CategoryGridSelector } from "./category-grid-selector"
import { AccountSelector } from "./account-selector"
import { TransactionFilterSelector } from "./transaction-filter-selector"
import { BudgetScopeSelector } from "./budget-scope-selector"
import { TransactionFilterMode, BudgetScope } from "@/types/budget"

const budgetSchema = z.object({
    name: z.string().trim().min(1, "El nombre es requerido"),
    amount: z.coerce.number().gt(0, "El monto debe ser mayor a 0"),
    period: z.enum(["MONTHLY"]),
    type: z.enum(["EXPENSE", "SAVINGS"]),
    color: z.string(),
    currencyCode: z.string().min(1),

    // Advanced filters
    transactionFilterMode: z.string().default("DEFAULT"),
    budgetScope: z.enum(["GLOBAL", "ACCOUNT"]).default("GLOBAL"),
    includeLoaned: z.boolean().default(false),
    includeGoalTransactions: z.boolean().default(false),
    includeBalanceCorrections: z.boolean().default(false),
    includeFromOtherBudgets: z.boolean().default(false),
    excludedBudgetIds: z.array(z.string()).default([]),

    // Basic filters
    accountIds: z.array(z.string()).default([]),
    includeCategories: z.array(z.string()).default([]),
    excludeCategories: z.array(z.string()).default([]),
    includeTags: z.array(z.string()).default([]),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

interface BudgetWizardAdvancedProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => void
    editingBudget?: any
}

const COLORS = [
    "#7C5CFC",
    "#0ea5e9",
    "#10b981",
    "#06b6d4",
    "#3b82f6",
    "#ec4899",
    "#f43f5e",
    "#f97316",
    "#f59e0b",
    "#84cc16",
]

function normalizeScope(scope?: string | null): BudgetScope {
    return scope === "ACCOUNT" ? "ACCOUNT" : "GLOBAL"
}

export function BudgetWizardAdvanced({
    open,
    onOpenChange,
    onComplete,
    editingBudget,
}: BudgetWizardAdvancedProps) {
    const [step, setStep] = useState(0)
    const [selectedFilters, setSelectedFilters] = useState<TransactionFilterMode[]>(["DEFAULT"])
    const { currencyCode } = useSettingsStore()
    const defaultCurrency = currencyCode || DEFAULT_CURRENCY
    const isEditing = !!editingBudget

    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema) as unknown as Resolver<BudgetFormValues>,
        defaultValues: {
            name: "",
            amount: 0,
            period: "MONTHLY",
            type: "EXPENSE",
            color: COLORS[0],
            currencyCode: defaultCurrency,
            transactionFilterMode: "DEFAULT",
            budgetScope: "GLOBAL",
            includeLoaned: false,
            includeGoalTransactions: false,
            includeBalanceCorrections: false,
            includeFromOtherBudgets: false,
            excludedBudgetIds: [],
            accountIds: [],
            includeCategories: [],
            excludeCategories: [],
            includeTags: [],
        },
    })

    useEffect(() => {
        if (!open) {
            setStep(0)
            setSelectedFilters(["DEFAULT"])
            form.reset({
                name: "",
                amount: 0,
                period: "MONTHLY",
                type: "EXPENSE",
                color: COLORS[0],
                currencyCode: defaultCurrency,
                transactionFilterMode: "DEFAULT",
                budgetScope: "GLOBAL",
                includeLoaned: false,
                includeGoalTransactions: false,
                includeBalanceCorrections: false,
                includeFromOtherBudgets: false,
                excludedBudgetIds: [],
                accountIds: [],
                includeCategories: [],
                excludeCategories: [],
                includeTags: [],
            })
        } else if (editingBudget) {
            const scope = normalizeScope(editingBudget.budgetScope)
            form.reset({
                name: editingBudget.name || "",
                amount: Number(editingBudget.amount || 0),
                period: "MONTHLY",
                type: editingBudget.type === "SAVINGS" ? "SAVINGS" : "EXPENSE",
                color: editingBudget.color || COLORS[0],
                currencyCode: editingBudget.currencyCode || defaultCurrency,
                transactionFilterMode: editingBudget.transactionFilterMode || "DEFAULT",
                budgetScope: scope,
                includeLoaned: Boolean(editingBudget.includeLoaned),
                includeGoalTransactions: Boolean(editingBudget.includeGoalTransactions),
                includeBalanceCorrections: Boolean(editingBudget.includeBalanceCorrections),
                includeFromOtherBudgets: Boolean(editingBudget.includeFromOtherBudgets),
                excludedBudgetIds: editingBudget.excludedBudgetIds || [],
                accountIds: scope === "ACCOUNT" ? editingBudget.accountIds || [] : [],
                includeCategories: editingBudget.includeCategories || [],
                excludeCategories: editingBudget.excludeCategories || [],
                includeTags: editingBudget.includeTags || [],
            })

            const initialFilters: TransactionFilterMode[] = ["DEFAULT"]
            if (editingBudget.includeLoaned) initialFilters.push("LOANED")
            if (editingBudget.includeGoalTransactions) initialFilters.push("ADDED_TO_GOAL")
            if (editingBudget.includeBalanceCorrections) initialFilters.push("BALANCE_CORRECTION")
            setSelectedFilters(initialFilters)
            setStep(1) // Start directly on details when editing
        }
    }, [open, editingBudget, form, defaultCurrency])

    const handleNext = async () => {
        if (step === 1) {
            const isValid = await form.trigger(["name", "amount", "type", "currencyCode"])
            if (!isValid) return
        }

        if (step === 3 && form.getValues("budgetScope") === "ACCOUNT") {
            const selectedAccounts = form.getValues("accountIds") || []
            if (selectedAccounts.length === 0) {
                toast.error("Selecciona al menos una cuenta o cambia el alcance a Global")
                return
            }
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
        const isAlreadySelected = selectedFilters.includes(filter)
        if (filter === "DEFAULT" && isAlreadySelected && selectedFilters.length === 1) {
            return
        }

        const nextFilters = isAlreadySelected
            ? selectedFilters.filter((f) => f !== filter)
            : [...selectedFilters, filter]

        setSelectedFilters(nextFilters)

        if (filter === "LOANED") {
            form.setValue("includeLoaned", !isAlreadySelected)
        } else if (filter === "ADDED_TO_GOAL") {
            form.setValue("includeGoalTransactions", !isAlreadySelected)
        } else if (filter === "BALANCE_CORRECTION") {
            form.setValue("includeBalanceCorrections", !isAlreadySelected)
        }
    }

    const handleSubmit = async (values: BudgetFormValues) => {
        try {
            const now = new Date()
            const scope = normalizeScope(values.budgetScope)

            const payload = {
                ...values,
                name: values.name.trim(),
                amount: Number(values.amount),
                budgetScope: scope,
                accountIds: scope === "ACCOUNT" ? values.accountIds : [],
                currencyCode: values.currencyCode || defaultCurrency,
                budgetYear: editingBudget?.budgetYear || now.getFullYear(),
                budgetMonth: editingBudget?.budgetMonth || now.getMonth() + 1,
                ...(editingBudget?.isZbbControlled
                    ? {
                          isZbbControlled: false,
                          zbbAllocationId: null,
                      }
                    : {}),
            }

            const url = isEditing ? `/api/budgets/${editingBudget.id}` : "/api/budgets"
            const method = isEditing ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || "Error al guardar presupuesto")
            }

            toast.success(isEditing ? "Presupuesto actualizado" : "Presupuesto creado")
            onComplete()
            onOpenChange(false)
        } catch (error) {
            console.error("Error saving budget:", error)
            toast.error(error instanceof Error ? error.message : "Error al guardar presupuesto")
        }
    }

    const activeCurrency = form.watch("currencyCode") || defaultCurrency
    const symbol = getCurrencySymbol(activeCurrency)
    const isZbbControlled = Boolean(editingBudget?.isZbbControlled)

    if (!open) return null

    return (
        <div className="fixed inset-0 lg:left-72 z-[100] bg-card flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
            {/* 1. Header */}
            <div className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenChange(false)}
                        aria-label="Cerrar asistente"
                        className="rounded-full hover:bg-muted"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
                            {isEditing ? "Editar Presupuesto" : "Nuevo Presupuesto"}
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                            {step === 0 && "Paso 1 de 5 · Elige categorías para empezar"}
                            {step === 1 && "Paso 2 de 5 · Personaliza los detalles"}
                            {step === 2 && "Paso 3 de 5 · Configura las reglas inteligentes"}
                            {step === 3 && "Paso 4 de 5 · Selecciona el alcance de cuentas"}
                            {step === 4 && "Paso 5 de 5 · Confirma tu presupuesto"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ZBB WARNING BANNER */}
            {isEditing && isZbbControlled && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/50 px-6 sm:px-10 py-3 flex items-center gap-3">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-medium">
                        Este presupuesto está <strong>sincronizado con ZBB</strong>. Si editas aquí, se desvinculará de la asignación automática.
                    </p>
                </div>
            )}

            {/* 2. Main Content Area */}
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="flex-1 flex flex-col relative bg-transparent overflow-hidden"
                >
                    {/* Scrollable Step Content */}
                    <div className="flex-1 overflow-y-auto px-4 lg:px-10 pt-6 pb-20 custom-scrollbar">
                        <div className="max-w-7xl mx-auto h-full pb-10">
                            {/* STEP 0: Category Selection */}
                            {step === 0 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="text-center space-y-2 mb-6">
                                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary shadow-sm">
                                            <Sparkles className="w-7 h-7" />
                                        </div>
                                        <h2 className="text-2xl font-black text-foreground">
                                            ¿Qué quieres presupuestar hoy?
                                        </h2>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            Selecciona una o más categorías y lo configuraremos por ti.
                                        </p>
                                    </div>

                                    <CategoryGridSelector
                                        selectedIds={form.watch("includeCategories")}
                                        onToggle={(id, category) => {
                                            const current = form.getValues("includeCategories") || []
                                            const isSelected = current.includes(id)
                                            const newSelected = isSelected
                                                ? current.filter((c) => c !== id)
                                                : [...current, id]

                                            form.setValue("includeCategories", newSelected)

                                            if (!isEditing && newSelected.length > 0) {
                                                if (newSelected.length === 1) {
                                                    form.setValue("name", `Presupuesto de ${category.name}`)
                                                    form.setValue(
                                                        "type",
                                                        category.type === "INCOME" ? "SAVINGS" : "EXPENSE"
                                                    )
                                                } else {
                                                    form.setValue("name", "Presupuesto Agrupado")
                                                }
                                            }
                                        }}
                                        type="ALL"
                                        mode="INCLUDE"
                                    />

                                    <div className="flex flex-col items-center justify-center mt-8 gap-3">
                                        {form.watch("includeCategories")?.length > 0 && (
                                            <Button
                                                type="button"
                                                size="lg"
                                                onClick={() => setStep(1)}
                                                className="rounded-full px-8 font-bold bg-primary hover:bg-primary/90 shadow-lg"
                                            >
                                                Continuar con {form.watch("includeCategories").length}{" "}
                                                {form.watch("includeCategories").length === 1
                                                    ? "Categoría"
                                                    : "Categorías"}
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
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            {isEditing
                                                ? "Continuar sin filtrar categorías (Global)"
                                                : "Configurar manualmente desde cero"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: Details Form */}
                            {step === 1 && (
                                <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Selected Categories Summary */}
                                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-0.5">
                                                Categorías incluidas
                                            </p>
                                            <p className="text-sm font-bold text-foreground truncate">
                                                {form.watch("includeCategories")?.length > 0
                                                    ? `${form.watch("includeCategories").length} ${
                                                          form.watch("includeCategories").length === 1
                                                              ? "categoría seleccionada"
                                                              : "categorías seleccionadas"
                                                      }`
                                                    : "Todas las categorías (Presupuesto Global)"}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="ml-auto text-primary hover:bg-primary/10 shrink-0"
                                            onClick={() => setStep(0)}
                                        >
                                            Cambiar
                                        </Button>
                                    </div>

                                    {/* Budget Type Selector */}
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Presupuesto</FormLabel>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => field.onChange("EXPENSE")}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                                                            field.value === "EXPENSE"
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-primary/40"
                                                        )}
                                                    >
                                                        <TrendingDown className="h-5 w-5 text-rose-500 shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">Gasto</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Límite máximo mensual
                                                            </p>
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => field.onChange("SAVINGS")}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                                                            field.value === "SAVINGS"
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-primary/40"
                                                        )}
                                                    >
                                                        <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground">Ahorro</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Meta de acumulación mensual
                                                            </p>
                                                        </div>
                                                    </button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Name & Amount */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nombre del Presupuesto</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Ej. Alimentación Mensual"
                                                            className="h-12 text-base font-bold bg-muted/50 border-input/50"
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
                                                        {form.watch("type") === "SAVINGS"
                                                            ? "Meta Mensual"
                                                            : "Monto Límite"}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                                                                {symbol}
                                                            </span>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={
                                                                    field.value === 0 || Number.isNaN(field.value)
                                                                        ? ""
                                                                        : field.value
                                                                }
                                                                placeholder="0.00"
                                                                className="h-12 text-base font-bold pl-12 bg-muted/50 border-input/50"
                                                                onChange={(e) => {
                                                                    const val = e.target.value
                                                                    field.onChange(val === "" ? 0 : parseFloat(val))
                                                                }}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Currency & Colors */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="currencyCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Moneda</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-12 bg-muted/50 border-input/50">
                                                                <SelectValue placeholder="Seleccionar moneda" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {CURRENCIES.map((c) => (
                                                                <SelectItem key={c.code} value={c.code}>
                                                                    {c.symbol} · {c.code} ({c.name})
                                                                </SelectItem>
                                                            ))}
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
                                                        <div className="bg-muted/50 p-2.5 rounded-lg border border-input/50 flex flex-wrap gap-2.5 items-center min-h-[48px]">
                                                            {COLORS.map((color) => (
                                                                <button
                                                                    key={color}
                                                                    type="button"
                                                                    aria-label={`Seleccionar color ${color}`}
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        field.onChange(color)
                                                                    }}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full transition-all hover:scale-110 flex items-center justify-center",
                                                                        field.value === color
                                                                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                                                                            : "hover:opacity-80"
                                                                    )}
                                                                    style={{ backgroundColor: color }}
                                                                >
                                                                    {field.value === color && (
                                                                        <Check className="w-3 h-3 text-white" />
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

                            {/* STEP 2: Filter Selector */}
                            {step === 2 && (
                                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                                    <FormItem>
                                        <div className="mb-6">
                                            <FormLabel className="text-xl font-bold">Reglas de Inclusión</FormLabel>
                                            <FormDescription className="text-base">
                                                Define qué movimientos contarán para este presupuesto.
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
                                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                                    <FormField
                                        control={form.control}
                                        name="budgetScope"
                                        render={({ field }) => (
                                            <FormItem className="space-y-4">
                                                <div className="mb-4">
                                                    <FormLabel className="text-xl font-bold">Alcance de Cuentas</FormLabel>
                                                    <FormDescription>
                                                        ¿Este presupuesto aplica a todas tus cuentas o solo a cuentas específicas?
                                                    </FormDescription>
                                                </div>

                                                <BudgetScopeSelector
                                                    selected={field.value}
                                                    onChange={(nextScope) => {
                                                        field.onChange(nextScope)
                                                        if (nextScope === "GLOBAL") {
                                                            form.setValue("accountIds", [])
                                                        }
                                                    }}
                                                />
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch("budgetScope") === "ACCOUNT" && (
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
                                                                const current = field.value || []
                                                                const updated = current.includes(id)
                                                                    ? current.filter((i) => i !== id)
                                                                    : [...current, id]
                                                                field.onChange(updated)
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

                            {/* STEP 4: Review */}
                            {step === 4 && (
                                <div className="max-w-3xl mx-auto text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Check className="h-10 w-10" />
                                    </div>
                                    <h2 className="text-3xl font-black">¡Todo listo!</h2>
                                    <p className="text-base text-muted-foreground max-w-lg mx-auto">
                                        {isEditing ? "Actualizaremos" : "Crearemos"} tu presupuesto{" "}
                                        <strong className="text-foreground">{form.watch("name")}</strong> de{" "}
                                        <strong className="text-foreground">
                                            {symbol} {Number(form.watch("amount") || 0).toFixed(2)}
                                        </strong>
                                        .
                                    </p>

                                    <div className="bg-muted/50 rounded-2xl p-6 text-left max-w-md mx-auto space-y-3 border border-border/50">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Tipo:</span>
                                            <span className="font-bold">
                                                {form.watch("type") === "SAVINGS" ? "Ahorro" : "Gasto"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Periodo:</span>
                                            <span className="font-bold">Mensual</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Moneda:</span>
                                            <span className="font-bold">{activeCurrency}</span>
                                        </div>
                                        <div className="flex justify-between text-sm gap-4">
                                            <span className="text-muted-foreground shrink-0">Reglas:</span>
                                            <span className="font-bold text-right">
                                                {selectedFilters
                                                    .map((f) => {
                                                        if (f === "DEFAULT") return "Estándar"
                                                        if (f === "LOANED") return "Préstamos"
                                                        if (f === "ADDED_TO_GOAL") return "Ahorro metas"
                                                        if (f === "BALANCE_CORRECTION") return "Transferencias"
                                                        return f
                                                    })
                                                    .join(", ")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Alcance:</span>
                                            <span className="font-bold">
                                                {form.watch("budgetScope") === "GLOBAL"
                                                    ? "Global (Todas las cuentas)"
                                                    : `${form.watch("accountIds")?.length || 0} cuenta(s)`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Bottom Action Bar */}
                    <div className="w-full bg-card/90 border-t border-border backdrop-blur-md px-6 sm:px-10 py-4 flex justify-between items-center z-20">
                        {step > 0 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="text-muted-foreground hover:text-foreground font-bold"
                            >
                                <span className="mr-2">←</span> Atrás
                            </Button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            step > 0 && (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="rounded-xl px-8 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all"
                                >
                                    Siguiente
                                </Button>
                            )
                        ) : (
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className={cn(
                                    "rounded-xl px-10 h-12 font-black text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-all w-full max-w-xs ml-auto",
                                    form.formState.isSubmitting && "opacity-80 scale-95"
                                )}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {isEditing ? "Guardando..." : "Creando..."}
                                    </>
                                ) : isEditing ? (
                                    "Guardar Cambios"
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
