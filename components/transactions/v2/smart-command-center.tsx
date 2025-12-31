"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useCommandParser } from "./use-command-parser"
import { useSmartCategories, useLearnCategory } from "@/hooks/useSmartCategories"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Sparkles, ArrowRight, Wallet, Calendar as CalendarIcon, Repeat, Clock, ChevronDown, Check, TrendingUp, TrendingDown, AlertCircle, ArrowRightLeft, Paperclip, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Calendar } from "@/components/ui/calendar"
import { useTransactionForm } from "../form/use-transaction-form"
import { useTransactions } from "@/hooks/use-transactions"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { useBudget } from "@/hooks/use-budget"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CategorySelector } from "../category-selector"
import { SmartCalculator } from "./smart-calculator"
import { SmartSuggestions } from "./smart-suggestions"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

interface SmartCommandCenterProps {
    onConfirm?: (data: any) => void
    initialData?: any
    initialType?: "EXPENSE" | "INCOME" | "TRANSFER"
}

const getCurrencySymbol = (code?: string) => {
    if (!code) return "$"
    switch (code) {
        case 'PEN': return 'S/'
        case 'EUR': return '€'
        case 'GBP': return '£'
        default: return '$'
    }
}

export function SmartCommandCenter({ onConfirm, initialData, initialType }: SmartCommandCenterProps) {
    const fileInputRef = useMemo(() => ({ current: null as HTMLInputElement | null }), [])
    const [isUploading, setIsUploading] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [input, setInput] = useState("")
    const { parseCommand } = useCommandParser()
    const transactionFilters = useMemo(() => ({}), [])
    const { transactions } = useTransactions(transactionFilters) // Fetch history for smart suggestions
    const currencyCode = useSettingsStore((state: any) => state.currencyCode)

    // Monthly Summary & Budget for the Pulse
    const now = new Date()
    const { budget: monthlyBudgets } = useBudget(now.getFullYear(), now.getMonth() + 1)

    // Calculate current spending and income for TODAY (Timezone robust)
    const { currentSpending, currentIncome } = useMemo(() => {
        if (!transactions) return { currentSpending: 0, currentIncome: 0 }
        const todayStr = new Date().toLocaleDateString('en-CA')

        return transactions.reduce((acc, t: any) => {
            const rawDate = t.transactionDate || t.transaction_date || t.date || t.createdAt
            if (!rawDate) return acc

            const tDateStr = new Date(rawDate).toLocaleDateString('en-CA')
            if (tDateStr === todayStr) {
                if (t.transactionType === 'EXPENSE') acc.currentSpending += Number(t.amount)
                if (t.transactionType === 'INCOME') acc.currentIncome += Number(t.amount)
            }
            return acc
        }, { currentSpending: 0, currentIncome: 0 })
    }, [transactions])

    // Calculate daily budget limit based on monthly budgets
    const dailyBudgetLimit = useMemo(() => {
        if (!monthlyBudgets || !Array.isArray(monthlyBudgets) || monthlyBudgets.length === 0) {
            return 100 // Default fallback
        }
        const totalMonthly = (monthlyBudgets as any[]).reduce((sum: number, b: any) => sum + (b.budgeted || 0), 0)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        return totalMonthly / daysInMonth
    }, [monthlyBudgets, now])

    const learnCategory = useLearnCategory()
    const {
        form,
        accounts,
        categories,
        onSubmit
    } = useTransactionForm(initialData, () => {
        const values = form.getValues()
        // Reinforce learning on success
        if (values.description && values.categoryId) {
            learnCategory.mutate({
                description: values.description,
                categoryId: values.categoryId,
                subcategoryId: values.subcategoryId || undefined
            })
        }
        if (onConfirm) onConfirm(values) // Callback on success
    })

    // Manual Overrides State
    const [manualCategoryId, setManualCategoryId] = useState<string | null>(null)
    const [manualSubcategoryId, setManualSubcategoryId] = useState<string | null>(null)
    const [manualAccount, setManualAccount] = useState<string | null>(null)
    const [manualType, setManualType] = useState<"EXPENSE" | "INCOME" | "TRANSFER" | null>(initialType || null)

    // Smart Detection
    const { data: smartCategory } = useSmartCategories(form.watch("description") || "")

    // Derived State (Merge Manual + Smart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const parsed = useMemo(() => parseCommand(input), [input])

    // Use ref to track previous smartCategory to prevent infinite loops
    const prevSmartCategoryRef = useRef<any>(null)

    useEffect(() => {
        const desc = parsed.description
        if (desc !== form.getValues("description")) form.setValue("description", desc || "")

        const amt = parsed.amount
        if (amt && amt.toString() !== form.getValues("amount") && !form.formState.dirtyFields.amount) {
            form.setValue("amount", amt.toString())
        }

        const date = parsed.date
        if (date && date.getTime() !== form.getValues("transactionDate")?.getTime()) {
            form.setValue("transactionDate", date)
        }

        const type = manualType || parsed.type || "EXPENSE"
        if (type !== form.getValues("type")) form.setValue("type", type)

        if (parsed.mode && parsed.mode !== form.getValues("mode")) form.setValue("mode", parsed.mode)

        // Only update category if manual override OR if smartCategory actually changed
        if (manualCategoryId) {
            if (manualCategoryId !== form.getValues("categoryId")) form.setValue("categoryId", manualCategoryId)
            if (manualSubcategoryId !== form.getValues("subcategoryId")) form.setValue("subcategoryId", manualSubcategoryId || "")
        } else if (smartCategory?.suggestions?.[0]) {
            // Check if smartCategory actually changed by comparing suggestion IDs
            const currentSuggestion = smartCategory.suggestions[0]
            const prevSuggestion = prevSmartCategoryRef.current?.suggestions?.[0]

            const suggestionChanged = !prevSuggestion ||
                currentSuggestion.categoryId !== prevSuggestion.categoryId ||
                currentSuggestion.subcategoryId !== prevSuggestion.subcategoryId

            if (suggestionChanged) {
                if (currentSuggestion.categoryId !== form.getValues("categoryId")) {
                    form.setValue("categoryId", currentSuggestion.categoryId)
                }
                if (currentSuggestion.subcategoryId !== form.getValues("subcategoryId")) {
                    form.setValue("subcategoryId", currentSuggestion.subcategoryId || "")
                }
            }
        }

        if (manualAccount) {
            if (manualAccount !== form.getValues("accountId")) form.setValue("accountId", manualAccount)
        } else if (accounts?.[0] && !form.getValues("accountId")) {
            form.setValue("accountId", accounts[0].id)
        }

        // Update ref after processing
        prevSmartCategoryRef.current = smartCategory

    }, [parsed, manualCategoryId, manualSubcategoryId, manualAccount, manualType, accounts, smartCategory])

    const currentCategoryId = form.watch("categoryId")
    const currentSubcategoryId = form.watch("subcategoryId")
    const currentCategory = categories?.find((c: any) => c.id === currentCategoryId)
    const currentSubcategory = currentCategory?.subcategories?.find((s: any) => s.id === currentSubcategoryId)

    const currentAccountId = form.watch("accountId")
    const currentAccount = accounts?.find((a: any) => a.id === currentAccountId)

    const currentAmount = form.watch("amount")
    const currentType = form.watch("type")

    const isOverdraft = useMemo(() => {
        if (!currentAccount || !currentAmount || currentType !== 'EXPENSE') return false
        const amt = parseFloat(currentAmount)
        if (isNaN(amt)) return false
        return (currentAccount.currentBalance || 0) - amt < 0
    }, [currentAccount, currentAmount, currentType])

    // Memoize category change handler to prevent infinite loops
    const handleCategoryChange = useCallback((catId: string, subId?: string) => {
        setManualCategoryId(catId)
        setManualSubcategoryId(subId || null)
    }, [])

    const attachmentUrl = form.watch("attachmentUrl")

    const uploadFile = async (file: File) => {
        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('documentType', 'TRANSACTION') // Transacciones van a carpeta separada

        try {
            const response = await fetch('/api/google-drive/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.status === 403) {
                const data = await response.json()
                if (data.code === 'DRIVE_NOT_CONNECTED') {
                    toast.error("Google Drive no conectado", {
                        description: "Primero debes autorizar el acceso.",
                        action: {
                            label: "Conectar",
                            onClick: () => {
                                const width = 500;
                                const height = 600;
                                const left = (window.screen.width / 2) - (width / 2);
                                const top = (window.screen.height / 2) - (height / 2);
                                window.open(data.authUrl, 'GoogleDriveAuth', `width=${width},height=${height},left=${left},top=${top}`);

                                const handleMessage = (event: MessageEvent) => {
                                    if (event.data === 'GOOGLE_AUTH_SUCCESS') {
                                        window.removeEventListener('message', handleMessage);
                                        toast.success("Conectado! Reintentando subida...");
                                        uploadFile(file); // Retry upload
                                    }
                                };
                                window.addEventListener('message', handleMessage);
                            }
                        }
                    })
                    return
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Detalles del error de subida:", errorData);
                throw new Error(errorData.error || errorData.details || "Error al subir");
            }

            const result = await response.json()
            form.setValue("attachmentUrl", result.viewLink)
            toast.success("Comprobante adjunto correctamente")
        } catch (error) {
            console.error(error)
            toast.error("Error al subir el comprobante")
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploadFile(file);
    }

    const handleSave = () => {
        if (isOverdraft) {
            toast.error("Fondos insuficientes en la cuenta seleccionada")
            return
        }
        form.handleSubmit(onSubmit)()
    }

    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 py-8">
            {/* 1. Omni-Input - Clean & Minimal */}
            <div className="relative group z-10">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-500 -z-10" />
                <div className={cn(
                    "relative flex items-center bg-card border rounded-3xl shadow-sm focus-within:shadow-md focus-within:ring-2 transition-all duration-300 z-20",
                    isOverdraft ? "border-red-500/50 ring-red-500/20 focus-within:ring-red-500/20" : "border-input focus-within:ring-primary/20"
                )}>
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ej: Almuerzo 15.50"
                        className="h-24 text-3xl font-medium px-8 border-0 bg-transparent shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave()
                        }}
                    />
                    <div className="pr-6">
                        {currentAmount ? (
                            <Button
                                onClick={handleSave}
                                size="icon"
                                disabled={isOverdraft}
                                className={cn(
                                    "h-14 w-14 rounded-2xl shadow-lg transition-all duration-300",
                                    isOverdraft
                                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:shadow-primary/25 hover:scale-105"
                                )}
                            >
                                {isOverdraft ? <AlertCircle className="h-6 w-6" /> : <ArrowRight className="h-6 w-6" />}
                            </Button>
                        ) : (
                            <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                                <Sparkles className={cn("w-6 h-6 text-primary/30 transition-all duration-500", input && "text-primary/60")} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Live Preview Card OR Smart Suggestions */}
            {input ? (
                <div className={cn("transition-all duration-500 ease-out transform translate-y-0 opacity-100")}>
                    <Card className="p-8 border-0 shadow-xl bg-card/50 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 rounded-[2rem] overflow-hidden relative">
                        <div className={cn(
                            "absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl opacity-[0.08] blur-3xl pointer-events-none rounded-full -mr-20 -mt-20",
                            currentType === 'INCOME' ? "from-emerald-500 to-transparent" :
                                currentType === 'TRANSFER' ? "from-blue-500 to-transparent" :
                                    "from-primary to-transparent"
                        )} />

                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative">
                            <div className="space-y-4 flex-1">
                                <div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase transition-all border outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                    currentType === 'INCOME' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" :
                                                        currentType === 'TRANSFER' ? "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20" :
                                                            "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                                )}
                                            >
                                                {currentType === 'INCOME' && <TrendingUp className="w-3 h-3" />}
                                                {currentType === 'EXPENSE' && <TrendingDown className="w-3 h-3" />}
                                                {currentType === 'TRANSFER' && <ArrowRightLeft className="w-3 h-3" />}

                                                {currentType === 'INCOME' ? 'Ingreso' : currentType === 'TRANSFER' ? 'Transferencia' : 'Gasto'}
                                                <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-[140px]">
                                            <DropdownMenuItem onClick={() => setManualType('EXPENSE')} className="gap-2">
                                                <TrendingDown className="w-4 h-4 text-primary" />
                                                <span>Gasto</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setManualType('INCOME')} className="gap-2">
                                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                                <span>Ingreso</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setManualType('TRANSFER')} className="gap-2">
                                                <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                                <span>Transferencia</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div>
                                    <h3 className="text-4xl font-bold tracking-tight text-foreground truncate max-w-[400px] leading-tight">
                                        {form.watch("description") || "..."}
                                    </h3>
                                    <div className="mt-2 flex items-center gap-2 text-muted-foreground font-medium">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="-ml-2 h-auto py-1 px-2 text-muted-foreground hover:text-foreground">
                                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                                    {format(form.watch("transactionDate") || new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={form.watch("transactionDate")}
                                                    onSelect={(date) => date && form.setValue("transactionDate", date)}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end relative z-10">
                                <div className="flex items-center justify-end">
                                    <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                                        <DialogTrigger asChild>
                                            <button className="flex items-center justify-end group/calc outline-none">
                                                <span className={cn("text-6xl font-extrabold tracking-tighter transition-colors select-none", currentAmount ? "text-foreground" : "text-muted-foreground/30")}>
                                                    {getCurrencySymbol(currentAccount?.currencyCode)}
                                                </span>
                                                <span className={cn("text-6xl !text-6xl font-extrabold tracking-tighter text-left tabular-nums min-w-[1ch] leading-none transition-all border-b-2 border-transparent group-hover/calc:border-primary/20", currentAmount ? "text-foreground" : "text-muted-foreground/30")}>
                                                    {currentAmount || "0"}
                                                </span>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none max-w-none sm:max-w-none">
                                            <div className="sr-only">
                                                <DialogTitle>Calculadora de Monto</DialogTitle>
                                            </div>
                                            <SmartCalculator
                                                initialValue={currentAmount || "0"}
                                                onConfirm={(val) => {
                                                    form.setValue("amount", val, { shouldDirty: true })
                                                }}
                                                onClose={() => setIsCalculatorOpen(false)}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {form.watch("mode") === 'SUBSCRIPTION' && (
                                    <div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 text-xs font-bold">
                                        <Repeat className="w-3 h-3" />
                                        Recurrente
                                    </div>
                                )}

                                {currentAccount && (
                                    <div className="mt-4 flex flex-col items-end gap-1 text-right animate-in fade-in slide-in-from-top-2">
                                        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <Wallet className="w-3.5 h-3.5 opacity-50" />
                                            Saldo Actual: <span className="text-foreground font-mono">{getCurrencySymbol(currentAccount.currencyCode)}{currentAccount.currentBalance?.toFixed(2) || "0.00"}</span>
                                        </div>

                                        {currentAmount && !isNaN(parseFloat(currentAmount)) && currentType === 'EXPENSE' && (
                                            (() => {
                                                const amt = parseFloat(currentAmount)
                                                const remaining = (currentAccount.currentBalance || 0) - amt

                                                return (
                                                    <div className={cn(
                                                        "text-xs font-bold flex items-center gap-1.5 transition-colors duration-300",
                                                        isOverdraft ? "text-red-500" : "text-emerald-500"
                                                    )}>
                                                        <span>Queda:</span>
                                                        <span className="font-mono text-sm">{getCurrencySymbol(currentAccount.currencyCode)}{remaining.toFixed(2)}</span>
                                                        {isOverdraft && (
                                                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider ml-1">
                                                                <AlertCircle className="w-3 h-3" /> Sin Fondos
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentType !== 'TRANSFER' && (
                                <div className="group relative">
                                    <div className={cn("absolute inset-0 bg-primary/5 rounded-2xl transition-opacity", currentCategoryId ? "opacity-100" : "opacity-0")} />
                                    <div className={cn(
                                        "relative p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer hover:border-primary/30 hover:bg-card hover:shadow-sm",
                                        currentCategoryId ? "bg-card border-border" : "bg-muted/30 border-dashed border-muted-foreground/20"
                                    )}>
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm",
                                            currentCategoryId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            <CategoryIcon name={currentCategory?.icon || "circle-help"} className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Categoría</span>
                                            <div className="font-semibold text-foreground truncate text-lg -ml-1">
                                                <CategorySelector
                                                    categories={categories || []}
                                                    categoryId={currentCategoryId}
                                                    subcategoryId={currentSubcategoryId}
                                                    onChange={handleCategoryChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="group cursor-pointer p-4 rounded-2xl border bg-card border-border flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                                            <Wallet className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{currentType === 'TRANSFER' ? 'Desde' : 'Cuenta'}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground text-lg truncate">{currentAccount?.name || "Seleccionar..."}</span>
                                                <ChevronDown className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar cuenta..." />
                                        <CommandList>
                                            <CommandEmpty>No encontrada.</CommandEmpty>
                                            <CommandGroup>
                                                {accounts?.map(acc => (
                                                    <CommandItem
                                                        key={acc.id}
                                                        value={acc.name}
                                                        onSelect={() => setManualAccount(acc.id)}
                                                        className="flex items-center gap-3 py-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                            <Wallet className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{acc.name}</span>
                                                            <span className="text-xs text-muted-foreground">{acc.currencyCode || 'USD'}</span>
                                                        </div>
                                                        {currentAccountId === acc.id && <Check className="ml-auto w-4 h-4 text-primary" />}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {/* Advanced Options - Modern Bottom Drawer (Sheet) */}
                            <div className="md:col-span-2 pt-2">
                                <Sheet open={showAdvanced} onOpenChange={setShowAdvanced}>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            className={cn(
                                                "text-muted-foreground/60 hover:text-primary transition-all duration-300 gap-2 rounded-full px-4 hover:bg-primary/5",
                                                (attachmentUrl || form.watch("notes")) && "text-primary bg-primary/5 border border-primary/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Sparkles className={cn("w-4 h-4", (attachmentUrl || form.watch("notes")) ? "text-primary animate-pulse" : "opacity-50")} />
                                                <span>{(attachmentUrl || form.watch("notes")) ? "Opciones configuradas" : "Ver más opciones (Adjuntos, Notas)"}</span>
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showAdvanced && "rotate-180")} />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="rounded-t-[32px] border-t bg-background px-6 pb-12 pt-4">
                                        <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6" />
                                        <SheetHeader className="mb-6 text-left">
                                            <SheetTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                                Opciones Avanzadas
                                            </SheetTitle>
                                        </SheetHeader>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                            {/* Attachment Chip */}
                                            <div className="space-y-3 text-left">
                                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Comprobante</h4>
                                                <div
                                                    onClick={() => !isUploading && document.getElementById('v2-file-input')?.click()}
                                                    className={cn(
                                                        "p-6 rounded-[24px] border transition-all duration-300 flex items-center gap-5 cursor-pointer hover:shadow-md group",
                                                        attachmentUrl
                                                            ? "bg-emerald-500/5 border-emerald-500/30 shadow-sm shadow-emerald-500/10"
                                                            : "bg-muted/30 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-white"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                                                        attachmentUrl ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground",
                                                        isUploading && "animate-pulse"
                                                    )}>
                                                        <Paperclip className={cn("w-7 h-7", isUploading && "animate-spin")} />
                                                    </div>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className={cn(
                                                            "font-bold text-xl truncate",
                                                            attachmentUrl ? "text-emerald-700" : "text-muted-foreground/60"
                                                        )}>
                                                            {isUploading ? "Subiendo..." : attachmentUrl ? "Adjunto con éxito" : "Foto o PDF"}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground opacity-60">
                                                            {attachmentUrl ? "Guardado en Google Drive" : "Sube una foto del ticket"}
                                                        </span>
                                                    </div>
                                                    {attachmentUrl && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                form.setValue("attachmentUrl", "")
                                                            }}
                                                            className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <input
                                                    id="v2-file-input"
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                    accept="image/*,application/pdf"
                                                />
                                            </div>

                                            {/* Notes Field */}
                                            <div className="space-y-3 text-left">
                                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Notas Adicionales</h4>
                                                <div className="p-6 rounded-[24px] border bg-muted/20 focus-within:bg-white focus-within:border-primary/40 transition-all duration-300">
                                                    <textarea
                                                        className="w-full bg-transparent border-0 focus:ring-0 text-lg placeholder:text-muted-foreground/30 min-h-[120px] resize-none"
                                                        placeholder="Escribe aquí notas o detalles..."
                                                        {...form.register("notes")}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-center">
                                            <Button
                                                type="button"
                                                onClick={() => setShowAdvanced(false)}
                                                className="rounded-full px-8 h-12 text-lg font-semibold shadow-lg shadow-primary/20"
                                            >
                                                Listo
                                            </Button>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {currentType === 'TRANSFER' && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <div className="group cursor-pointer p-4 rounded-2xl border bg-card border-border flex items-center gap-4 hover:border-blue-500/30 hover:shadow-sm transition-all duration-200">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                                                <ArrowRightLeft className="w-6 h-6" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Hacia</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground text-lg truncate">
                                                        {accounts?.find((a: any) => a.id === form.watch("transferToAccountId"))?.name || "Destino..."}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar cuenta destino..." />
                                            <CommandList>
                                                <CommandEmpty>No encontrada.</CommandEmpty>
                                                <CommandGroup>
                                                    {accounts?.filter((a: any) => a.id !== currentAccountId).map(acc => (
                                                        <CommandItem
                                                            key={acc.id}
                                                            value={acc.name}
                                                            onSelect={() => {
                                                                form.setValue("transferToAccountId", acc.id, { shouldDirty: true })
                                                            }}
                                                            className="flex items-center gap-3 py-3"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                                <Wallet className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{acc.name}</span>
                                                                <span className="text-xs text-muted-foreground">{acc.currencyCode || 'USD'}</span>
                                                            </div>
                                                            {form.watch("transferToAccountId") === acc.id && <Check className="ml-auto w-4 h-4 text-primary" />}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                    </Card>
                </div >
            ) : (
                <SmartSuggestions
                    onSelect={(text, amount, keyword) => {
                        let cmd = text
                        if (amount) cmd += ` ${amount}`
                        setInput(cmd)
                    }}
                    transactions={transactions || []}
                    currencySymbol={getCurrencySymbol(currencyCode)}
                    currentSpending={currentSpending}
                    currentIncome={currentIncome}
                    budgetLimit={dailyBudgetLimit}
                    currentType={currentType}
                />
            )
            }

            <div className="text-center">
                <p className={cn("text-sm font-medium transition-all text-muted-foreground opacity-50")}>
                    Usa lenguaje natural: "Netflix 35", "Sueldo 5000", "Transferencia al Ahorro 200"
                </p>
            </div>
        </div >
    )
}
