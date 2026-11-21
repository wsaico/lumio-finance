"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    ArrowLeft,
    ArrowRightLeft,
    Trash2,
    Loader2,
    Check,
    FileText,
    Tag,
    Paperclip,
    Plus,
    CheckCircle2,
    Sparkles,
    Repeat,
    Clock,
    Wallet,
    ShieldAlert,
    AlertTriangle,
    Zap,
    CalendarClock,
    Info,
    ArrowDownUp,
    CreditCard,
} from "lucide-react"
import { cn, formatAccountPillName } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currencies"
import { Button } from "@/components/ui/button"
import { Form, FormField } from "@/components/ui/form"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { CategoryIcon } from "@/components/icons/category-icon"
import { PremiumDatePicker } from "@/components/ui/premium-date-picker"
import { PremiumTimePicker } from "@/components/ui/premium-time-picker"
import { PremiumCategoryPicker } from "@/components/ui/premium-category-picker"
import { PremiumCalculator } from "@/components/ui/premium-calculator"
import { ExpressTransactionSheet, ExpressStep } from "./express-transaction-sheet"
import { useTransactionForm } from "./form/use-transaction-form"
import { useTransactionSuggestions, SuggestedTransaction } from "@/hooks/useTransactionSuggestions"
import { useSmartCategories } from "@/hooks/useSmartCategories"
import { useTags } from "@/hooks/useTags"
import { useBudget } from "@/hooks/useBudget"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useFormat } from "@/hooks/useFormat"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { toast } from "sonner"
import { showAppToast } from "@/components/ui/app-alert-toast"

export interface TransactionEditorProps {
    initialData?: any
    initialType?: "EXPENSE" | "INCOME" | "TRANSFER"
    initialAccountId?: string
    initialToAccountId?: string
    onSuccess?: () => void
}

const TRANSACTION_MODES = [
    { id: "DEFAULT", label: "Por defecto" },
    { id: "UPCOMING", label: "Próximamente" },
    { id: "SUBSCRIPTION", label: "Suscripción" },
    { id: "RECURRING", label: "Repetitivo" },
] as const

const RECURRENCE_OPTIONS = [
    { id: "DAILY", label: "Diario" },
    { id: "WEEKLY", label: "Semanal" },
    { id: "MONTHLY", label: "Mensual" },
    { id: "YEARLY", label: "Anual" },
] as const

export function TransactionEditor({
    initialData,
    initialType,
    initialAccountId,
    initialToAccountId,
    onSuccess,
}: TransactionEditorProps) {
    const router = useRouter()
    const isMobile = useMediaQuery("(max-width: 768px)")
    const {
        sidebarCollapsed,
        showAttachmentsButton,
        autoSuggestTitles,
        newTxInitialEntry,
    } = useSettingsStore()
    const { tags: userTags, createTag } = useTags()
    const { formatMoney } = useFormat()

    const {
        form,
        activeTab,
        setActiveTab,
        onSubmit,
        accounts,
        categories,
        deleteTransaction,
    } = useTransactionForm(initialData, onSuccess, initialType, initialAccountId, initialToAccountId)

    const resolvedInitialStep: ExpressStep =
        newTxInitialEntry === "express_amount"
            ? "amount"
            : newTxInitialEntry === "express_category"
              ? "category"
              : "title"

    const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false)
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = React.useState(false)
    const [isExpressOpen, setIsExpressOpen] = React.useState(
        !initialData && newTxInitialEntry !== "full_form"
    )
    const [expressStep, setExpressStep] = React.useState<ExpressStep>(resolvedInitialStep)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [suggestionTab, setSuggestionTab] = React.useState<"frequent" | "scheduled">("frequent")
    const [showAutocomplete, setShowAutocomplete] = React.useState(false)
    const [newTagInput, setNewTagInput] = React.useState("")
    const [isModeInfoOpen, setIsModeInfoOpen] = React.useState(false)
    const [modeInfoTab, setModeInfoTab] = React.useState<string>("SUBSCRIPTION")

    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const descContainerRef = React.useRef<HTMLDivElement>(null)

    const currentAmount = form.watch("amount")
    const currentDescription = form.watch("description") || ""
    const currentAccountId = form.watch("accountId")
    const transferToAccountId = form.watch("transferToAccountId")
    const currentCategoryId = form.watch("categoryId")
    const currentSubcategoryId = form.watch("subcategoryId")
    const currentMode = form.watch("mode") || "DEFAULT"
    const currentRecurrence = form.watch("recurrence") || "NONE"
    const recurrenceInterval = form.watch("recurrenceInterval") || 1
    const initialPaymentState = form.watch("initialPaymentState") || "PENDING"
    const recurrenceLimitMode = form.watch("recurrenceLimitMode") || "FOREVER"
    const recurrenceEndDate = form.watch("recurrenceEndDate") || ""
    const recurrenceCount = form.watch("recurrenceCount") || 12
    const reminderDays = form.watch("reminderDays") ?? 3
    const isAutoExecute = form.watch("isAutoExecute")
    const attachmentUrl = form.watch("attachmentUrl")
    const currentTags = form.watch("tags") || []
    const transactionDate = form.watch("transactionDate") || new Date()
    const isSubmitting = form.formState.isSubmitting

    // Smart suggestions (history + scheduled + live autocomplete)
    const { frequent, scheduled, recentCategoryIds, getAutocompleteMatches } =
        useTransactionSuggestions(activeTab)

    const autocompleteMatches = React.useMemo(
        () => (autoSuggestTitles ? getAutocompleteMatches(currentDescription, activeTab) : []),
        [autoSuggestTitles, getAutocompleteMatches, currentDescription, activeTab]
    )

    const [hasManualCategory, setHasManualCategory] = React.useState(Boolean(initialData))

    // Smart category prediction while typing
    const { data: smartCatData } = useSmartCategories(
        autoSuggestTitles && activeTab !== "TRANSFER" ? currentDescription : "",
        activeTab === "INCOME" ? "INCOME" : "EXPENSE",
        autoSuggestTitles && activeTab !== "TRANSFER"
    )
    const topSmartCategory = smartCatData?.suggestions?.[0]

    const isSmartCategoryAlreadySelected = Boolean(
        topSmartCategory &&
            currentCategoryId === topSmartCategory.categoryId &&
            (topSmartCategory.subcategoryId || "") === (currentSubcategoryId || "")
    )

    // Auto-select smart category while typing if user hasn't manually chosen one
    React.useEffect(() => {
        if (
            autoSuggestTitles &&
            activeTab !== "TRANSFER" &&
            !hasManualCategory &&
            topSmartCategory &&
            currentDescription.trim().length >= 3
        ) {
            form.setValue("categoryId", topSmartCategory.categoryId)
            form.setValue("subcategoryId", topSmartCategory.subcategoryId || "")
        }
    }, [autoSuggestTitles, topSmartCategory, hasManualCategory, currentDescription, activeTab, form])

    const toggleTag = (tagName: string) => {
        const exists = currentTags.includes(tagName)
        form.setValue(
            "tags",
            exists ? currentTags.filter((t) => t !== tagName) : [...currentTags, tagName]
        )
    }

    const handleInlineCreateTag = async () => {
        const name = newTagInput.trim()
        if (!name) return
        try {
            await createTag.mutateAsync({ name })
            if (!currentTags.includes(name)) {
                form.setValue("tags", [...currentTags, name])
            }
            setNewTagInput("")
        } catch {
            // error handled in hook
        }
    }

    // Close autocomplete when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (descContainerRef.current && !descContainerRef.current.contains(e.target as Node)) {
                setShowAutocomplete(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const currentAccount = accounts.find((a) => a.id === currentAccountId)
    const transferToAccount = accounts.find((a) => a.id === transferToAccountId)
    const currencySymbol = getCurrencySymbol(currentAccount?.currencyCode)

    const currentCategory = categories.find((c: any) => c.id === currentCategoryId)
    const currentSubcategory = currentCategory?.subcategories?.find(
        (s: any) => s.id === currentSubcategoryId
    )

    // Real-time budget check for expenses
    const safeTxDate = transactionDate instanceof Date ? transactionDate : new Date(transactionDate)
    const { budgets } = useBudget(safeTxDate.getFullYear(), safeTxDate.getMonth() + 1)

    const budgetAlert = React.useMemo(() => {
        if (activeTab !== "EXPENSE" || !currentCategoryId || !budgets?.length) return null
        const budget = budgets.find(
            (b: any) =>
                b.include_categories?.includes(currentCategoryId) ||
                (currentSubcategoryId && b.include_categories?.includes(currentSubcategoryId))
        )
        if (!budget) return null
        const limit = Number(budget.amount)
        const spentSoFar = Number(budget.stats?.spent || 0)
        const newTotal = spentSoFar + Number(currentAmount || 0)
        const pct = limit > 0 ? (newTotal / limit) * 100 : 0
        const remaining = limit - newTotal
        if (pct > 100) {
            return {
                type: "exceeded" as const,
                message: `Excederás el presupuesto "${budget.name}"`,
                details: `Proyectado: ${currencySymbol}${newTotal.toFixed(2)} / ${currencySymbol}${limit.toFixed(2)}`,
            }
        }
        if (pct >= 85) {
            return {
                type: "critical" as const,
                message: `Presupuesto "${budget.name}" casi al límite`,
                details: `Restante estimado: ${currencySymbol}${remaining.toFixed(2)}`,
            }
        }
        return null
    }, [activeTab, currentCategoryId, currentSubcategoryId, budgets, currentAmount, currencySymbol])

    // Apply a smart suggestion chip or autocomplete item
    const applySuggestion = (item: SuggestedTransaction) => {
        form.setValue("description", item.description)
        if (item.categoryId && activeTab !== "TRANSFER") {
            form.setValue("categoryId", item.categoryId)
            form.setValue("subcategoryId", item.subcategoryId || "")
        }
        // Preserve current user's selected account (best practice: don't surprise user by changing payment account)
        // Only set account if none was selected yet
        if (!currentAccountId && item.accountId && accounts.some((a) => a.id === item.accountId)) {
            form.setValue("accountId", item.accountId)
        }
        if (item.transferToAccountId && activeTab === "TRANSFER" && !transferToAccountId) {
            form.setValue("transferToAccountId", item.transferToAccountId)
        }
        if (item.lastAmount > 0 && (!currentAmount || currentAmount === "0")) {
            form.setValue("amount", String(item.lastAmount))
        }
        if (item.isScheduled && item.mode && item.mode !== "DEFAULT") {
            form.setValue("mode", item.mode)
            if (item.recurrence && item.recurrence !== "NONE") {
                form.setValue("recurrence", item.recurrence as any)
            }
        }
        setShowAutocomplete(false)
    }

    const handleTabChange = (nextTab: "EXPENSE" | "INCOME" | "TRANSFER") => {
        setActiveTab(nextTab)
        form.setValue("type", nextTab)
        if (nextTab === "TRANSFER") {
            if (!transferToAccountId || transferToAccountId === currentAccountId) {
                const other = accounts.find((a) => a.id !== currentAccountId)
                if (other) form.setValue("transferToAccountId", other.id)
            }
        } else {
            // Clear category if it doesn't belong to new tab type
            if (currentCategory && currentCategory.type && currentCategory.type !== nextTab) {
                form.setValue("categoryId", "")
                form.setValue("subcategoryId", "")
            }
        }
    }

    const handleSwapTransferAccounts = () => {
        if (!currentAccountId || !transferToAccountId) return
        form.setValue("accountId", transferToAccountId)
        form.setValue("transferToAccountId", currentAccountId)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploading(true)
        try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/google-drive/upload", { method: "POST", body: fd })
            if (!res.ok) throw new Error("No se pudo subir el comprobante")
            const data = await res.json()
            form.setValue("attachmentUrl", data.webViewLink || data.url || "")
            toast.success("Comprobante adjuntado")
        } catch (err: any) {
            toast.error(err?.message || "Error al subir comprobante")
        } finally {
            setIsUploading(false)
        }
    }

    const handleFormInvalid = (errors: Record<string, any>) => {
        if (accounts.length === 0) {
            showAppToast.warning({
                title: "Primero crea una cuenta",
                description: "Necesitas al menos una cuenta (Efectivo o Banco) para registrar movimientos.",
                actionLabel: "Crear cuenta",
                onAction: () => router.push("/dashboard/accounts"),
            })
            return
        }
        if (activeTab === "TRANSFER" && accounts.length < 2) {
            showAppToast.warning({
                title: "Necesitas al menos 2 cuentas",
                description: "Para transferir dinero debes tener una cuenta de origen y otra de destino.",
                actionLabel: "Crear cuenta",
                onAction: () => router.push("/dashboard/accounts"),
            })
            return
        }
        if (errors?.accountId) {
            showAppToast.warning({
                title: activeTab === "INCOME" ? "Selecciona una cuenta destino" : "Selecciona una cuenta de origen",
                description: "Elige una cuenta antes de guardar el movimiento.",
            })
            return
        }
        if (errors?.transferToAccountId) {
            showAppToast.warning({
                title: "Selecciona la cuenta de destino",
                description: String(errors.transferToAccountId?.message || "Debe ser diferente a la cuenta de origen."),
            })
            return
        }
        if (errors?.amount) {
            showAppToast.warning({
                title: "Ingresa un monto válido",
                description: String(errors.amount?.message || "El monto debe ser mayor a 0."),
            })
            return
        }
        if (errors?.expenseCategoryId || errors?.incomeCategoryId) {
            showAppToast.warning({
                title: "Selecciona una categoría",
                description: "Elige una categoría para clasificar este movimiento.",
            })
            return
        }
        if (errors?.description) {
            showAppToast.warning({
                title: "Falta la descripción",
                description: String(errors.description?.message || "Escribe una descripción breve."),
            })
            return
        }
        const firstMsg = Object.values(errors || {})
            .map((e: any) => e?.message)
            .find(Boolean)
        showAppToast.warning({
            title: "Revisa los campos requeridos",
            description: String(firstMsg || "Completa los datos obligatorios antes de continuar."),
        })
    }

    // Dynamic palette per tab (faithfully matching Screenshot 2)
    const theme =
        activeTab === "INCOME"
            ? {
                  cardBg: "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600",
                  glow: "bg-emerald-500/35",
                  submitBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25",
                  barTint: "bg-emerald-500/[0.07] dark:bg-emerald-500/[0.10]",
                  calcAccent: "bg-emerald-600 hover:bg-emerald-700 text-white",
              }
            : activeTab === "TRANSFER"
              ? {
                    cardBg: "bg-gradient-to-br from-violet-600 via-primary to-indigo-600",
                    glow: "bg-primary/35",
                    submitBtn: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25",
                    barTint: "bg-primary/[0.07] dark:bg-primary/[0.10]",
                    calcAccent: "bg-primary hover:bg-primary/90 text-primary-foreground",
                }
              : {
                    cardBg: "bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600",
                    glow: "bg-rose-500/35",
                    submitBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25",
                    barTint: "bg-rose-500/[0.07] dark:bg-rose-500/[0.10]",
                    calcAccent: "bg-rose-600 hover:bg-rose-700 text-white",
                }

    const activeSuggestions = suggestionTab === "frequent" ? frequent : scheduled

    return (
        <div
            className={cn(
                "fixed inset-0 z-[55] bg-background flex flex-col animate-in fade-in duration-200 transition-[left] duration-300",
                sidebarCollapsed ? "lg:left-[84px]" : "lg:left-[260px]"
            )}
        >
            {/* TOP HEADER */}
            <header className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-2xl hover:bg-muted"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-none">
                            {initialData ? "Editar Transacción" : "Nueva Transacción"}
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                            {activeTab === "EXPENSE"
                                ? "Registra una salida de dinero"
                                : activeTab === "INCOME"
                                  ? "Registra un ingreso a tus cuentas"
                                  : "Mueve saldo entre tus cuentas"}
                        </p>
                    </div>
                </div>

                {!initialData ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setExpressStep(
                                !currentDescription.trim()
                                    ? "title"
                                    : activeTab !== "TRANSFER" && !currentCategoryId
                                      ? "category"
                                      : "amount"
                            )
                            setIsExpressOpen(true)
                        }}
                        className="h-9 px-3.5 rounded-full text-xs font-extrabold gap-1.5 border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-all active:scale-95"
                    >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Flujo rápido</span>
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="h-10 w-10 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            aria-label="Eliminar transacción"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>

                        <ConfirmAlertModal
                            open={isDeleteDialogOpen}
                            onOpenChange={setIsDeleteDialogOpen}
                            variant="danger"
                            title="¿Eliminar transacción?"
                            description="Esta acción no se puede deshacer. El saldo de tus cuentas se ajustará automáticamente."
                            confirmLabel="Eliminar"
                            onConfirm={async () => {
                                await deleteTransaction.mutateAsync(initialData.id)
                                if (onSuccess) onSuccess()
                                else router.back()
                            }}
                        />
                    </>
                )}
            </header>

            {/* MAIN FORM */}
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit((values) => onSubmit(values, false), handleFormInvalid)}
                    className="flex-1 flex flex-col min-h-0 overflow-hidden"
                >
                    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 sm:py-7">
                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-9 items-start">
                            {/* LEFT COLUMN (HERO CARD + SUGGESTIONS + INPUTS) */}
                            <div className="lg:col-span-6 flex flex-col gap-5">
                                {/* 1. DYNAMIC HERO CARD */}
                                <div className="relative group">
                                    <div
                                        className={cn(
                                            "absolute -inset-1 rounded-[2.25rem] blur-xl opacity-45 transition-all duration-500",
                                            theme.glow
                                        )}
                                    />
                                    <div
                                        className={cn(
                                            "relative rounded-[2.25rem] p-4 sm:p-5 text-white shadow-2xl border border-white/20 transition-all duration-500 flex flex-col justify-between min-h-[225px] sm:min-h-[260px]",
                                            theme.cardBg
                                        )}
                                    >
                                        {/* Top Segmented Pill Control */}
                                        <div className="flex p-1 gap-1 bg-black/15 backdrop-blur-md rounded-full">
                                            {[
                                                { id: "EXPENSE", label: "Gasto" },
                                                { id: "INCOME", label: "Ingreso" },
                                                { id: "TRANSFER", label: "Transferir" },
                                            ].map((tab) => {
                                                const active = activeTab === tab.id
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => handleTabChange(tab.id as any)}
                                                        className={cn(
                                                            "flex-1 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200",
                                                            active
                                                                ? "bg-white/25 text-white shadow-sm backdrop-blur-md scale-[1.01]"
                                                                : "text-white/65 hover:text-white/90"
                                                        )}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Hero Center: Icon + Giant Amount & Category */}
                                        <div className="flex items-center justify-between gap-4 px-2 sm:px-5 py-4 sm:py-5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (activeTab !== "TRANSFER") {
                                                        setIsCategoryPickerOpen(true)
                                                    } else {
                                                        handleSwapTransferAccounts()
                                                    }
                                                }}
                                                className="h-22 w-22 sm:h-28 sm:w-28 rounded-[1.75rem] bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner hover:scale-105 active:scale-95 transition-transform"
                                                title={
                                                    activeTab === "TRANSFER"
                                                        ? "Intercambiar cuentas"
                                                        : "Cambiar categoría"
                                                }
                                            >
                                                {activeTab === "TRANSFER" ? (
                                                    <ArrowRightLeft className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow" />
                                                ) : (
                                                    <CategoryIcon
                                                        name={
                                                            currentSubcategory?.icon ||
                                                            currentCategory?.icon ||
                                                            "circle-help"
                                                        }
                                                        className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow"
                                                    />
                                                )}
                                            </button>

                                            <div className="flex flex-col items-end text-right min-w-0 flex-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCalculatorOpen(true)}
                                                    className="flex items-baseline justify-end gap-1.5 max-w-full hover:scale-[1.03] active:scale-95 transition-transform outline-none pr-1"
                                                >
                                                    <span className="text-2xl sm:text-3xl font-black text-white/55 shrink-0">
                                                        {currencySymbol}
                                                    </span>
                                                    <span className="text-5xl sm:text-[4.25rem] font-black tracking-normal tabular-nums leading-tight drop-shadow-md truncate inline-block">
                                                        {currentAmount || "0"}
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (activeTab !== "TRANSFER") {
                                                            setIsCategoryPickerOpen(true)
                                                        }
                                                    }}
                                                    className="mt-2 text-base sm:text-xl font-extrabold text-white/95 tracking-tight truncate max-w-full hover:underline underline-offset-4 decoration-white/40"
                                                >
                                                    {activeTab === "TRANSFER"
                                                        ? transferToAccount
                                                            ? `→ ${transferToAccount.name}`
                                                            : "Elegir destino"
                                                        : currentSubcategory
                                                          ? `${currentCategory?.name} · ${currentSubcategory.name}`
                                                          : currentCategory?.name || "Elegir categoría"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. BUDGET ALERT BANNER */}
                                {budgetAlert && (
                                    <div
                                        className={cn(
                                            "rounded-2xl p-3.5 flex items-start gap-3 shadow-sm border text-white",
                                            budgetAlert.type === "exceeded"
                                                ? "bg-rose-600 border-rose-700"
                                                : "bg-amber-500 border-amber-600"
                                        )}
                                    >
                                        <div className="p-1.5 rounded-xl bg-white/20 shrink-0">
                                            {budgetAlert.type === "exceeded" ? (
                                                <ShieldAlert className="h-5 w-5" />
                                            ) : (
                                                <AlertTriangle className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold leading-tight">{budgetAlert.message}</p>
                                            <p className="text-xs text-white/90 mt-0.5">{budgetAlert.details}</p>
                                        </div>
                                    </div>
                                )}

                                {/* 3. SMART SUGGESTIONS STRIP (FREQUENT & SCHEDULED) */}
                                {(frequent.length > 0 || scheduled.length > 0) && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-full">
                                                <button
                                                    type="button"
                                                    onClick={() => setSuggestionTab("frequent")}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
                                                        suggestionTab === "frequent"
                                                            ? "bg-card text-primary shadow-xs"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <Zap className="h-3.5 w-3.5" />
                                                    Frecuentes
                                                </button>
                                                {scheduled.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSuggestionTab("scheduled")}
                                                        className={cn(
                                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
                                                            suggestionTab === "scheduled"
                                                                ? "bg-card text-primary shadow-xs"
                                                                : "text-muted-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        <CalendarClock className="h-3.5 w-3.5" />
                                                        Programadas
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-medium text-muted-foreground">
                                                1 toque para rellenar
                                            </span>
                                        </div>

                                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                                            {activeSuggestions.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => applySuggestion(item)}
                                                    className="flex items-center gap-2 shrink-0 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 px-3 py-2 transition-all shadow-xs active:scale-95"
                                                >
                                                    <span
                                                        className="h-7 w-7 rounded-xl flex items-center justify-center text-white shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                item.categoryColor || "var(--primary)",
                                                        }}
                                                    >
                                                        <CategoryIcon
                                                            name={item.categoryIcon || "sparkles"}
                                                            className="h-3.5 w-3.5"
                                                        />
                                                    </span>
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-foreground leading-tight max-w-[130px] truncate">
                                                            {item.description}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                                                            {item.lastAmount > 0
                                                                ? `${getCurrencySymbol(item.currencyCode)}${item.lastAmount.toFixed(0)}`
                                                                : item.categoryName || "Sugerencia"}
                                                            {item.count > 1 && ` · ${item.count}x`}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. DESCRIPTION (WITH LIVE AUTOCOMPLETE) + NOTES + RECEIPT */}
                                <div className="flex flex-col gap-2.5">
                                    {/* Description Input + Live Suggestions Dropdown */}
                                    <div ref={descContainerRef} className="relative">
                                        <div className="bg-muted/60 dark:bg-muted/40 rounded-2xl flex items-center gap-3.5 px-4 sm:px-5 h-14 border border-transparent focus-within:border-primary/30 focus-within:bg-card transition-all shadow-xs">
                                            <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                                            <FormField
                                                control={form.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <input
                                                        {...field}
                                                        type="text"
                                                        autoComplete="off"
                                                        placeholder="Descripción (ej. Almuerzo, Uber, Nómina...)"
                                                        onFocus={() => setShowAutocomplete(true)}
                                                        onChange={(e) => {
                                                            field.onChange(e)
                                                            setShowAutocomplete(true)
                                                        }}
                                                        className="w-full h-full bg-transparent text-sm sm:text-base font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                                                    />
                                                )}
                                            />
                                            {topSmartCategory &&
                                                activeTab !== "TRANSFER" &&
                                                currentDescription.trim().length >= 3 &&
                                                !isSmartCategoryAlreadySelected && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            form.setValue("categoryId", topSmartCategory.categoryId)
                                                            form.setValue(
                                                                "subcategoryId",
                                                                topSmartCategory.subcategoryId || ""
                                                            )
                                                            setHasManualCategory(true)
                                                        }}
                                                        title="Aplicar categoría sugerida"
                                                        className="inline-flex items-center gap-1 shrink-0 rounded-full bg-primary/12 hover:bg-primary hover:text-primary-foreground px-2.5 py-1 text-[11px] font-bold text-primary transition-colors cursor-pointer"
                                                    >
                                                        <Sparkles className="h-3 w-3 shrink-0" />
                                                        <span className="max-w-[140px] truncate">
                                                            {topSmartCategory.subcategoryName
                                                                ? `${topSmartCategory.categoryName} · ${topSmartCategory.subcategoryName}`
                                                                : topSmartCategory.categoryName}
                                                        </span>
                                                    </button>
                                                )}
                                        </div>

                                        {/* Floating Live Autocomplete */}
                                        {showAutocomplete &&
                                            currentDescription.trim().length > 0 &&
                                            autocompleteMatches.length > 0 && (
                                                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border border-border/70 bg-popover p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        Sugerencias comunes
                                                    </p>
                                                    {autocompleteMatches.map((match) => (
                                                        <button
                                                            key={match.id}
                                                            type="button"
                                                            onClick={() => applySuggestion(match)}
                                                            className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl hover:bg-muted/70 transition-colors text-left"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <span
                                                                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white shrink-0"
                                                                    style={{
                                                                        backgroundColor:
                                                                            match.categoryColor ||
                                                                            "var(--primary)",
                                                                    }}
                                                                >
                                                                    <CategoryIcon
                                                                        name={match.categoryIcon || "tag"}
                                                                        className="h-4 w-4"
                                                                    />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-foreground truncate">
                                                                        {match.description}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                                        {match.categoryName || "Sin categoría"}
                                                                        {match.count > 1 &&
                                                                            ` · Usado ${match.count} veces`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {match.lastAmount > 0 && (
                                                                <span className="text-xs font-extrabold tabular-nums text-primary shrink-0">
                                                                    {getCurrencySymbol(match.currencyCode)}
                                                                    {match.lastAmount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                    </div>

                                    {/* Notes Input */}
                                    <div className="bg-muted/60 dark:bg-muted/40 rounded-2xl flex items-center gap-3.5 px-4 sm:px-5 h-14 border border-transparent focus-within:border-primary/30 focus-within:bg-card transition-all shadow-xs">
                                        <Tag className="w-5 h-5 text-muted-foreground shrink-0" />
                                        <FormField
                                            control={form.control}
                                            name="notes"
                                            render={({ field }) => (
                                                <input
                                                    {...field}
                                                    type="text"
                                                    placeholder="Notas opcionales"
                                                    className="w-full h-full bg-transparent text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                                                />
                                            )}
                                        />
                                    </div>

                                    {/* Etiquetas creables */}
                                    <div className="bg-muted/40 rounded-2xl p-3.5 space-y-2.5 border border-border/40">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5 text-primary" />
                                                Etiquetas
                                            </span>
                                            {currentTags.length > 0 && (
                                                <span className="text-[10px] font-bold text-primary">
                                                    {currentTags.length} seleccionada(s)
                                                </span>
                                            )}
                                        </div>

                                        {userTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {userTags.map((tag) => {
                                                    const selected = currentTags.includes(tag.name)
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => toggleTag(tag.name)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5",
                                                                selected
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                                    : "bg-card text-foreground/80 border-border/70 hover:bg-muted"
                                                            )}
                                                        >
                                                            <span
                                                                className="h-2 w-2 rounded-full"
                                                                style={{
                                                                    backgroundColor: selected ? "#fff" : tag.color,
                                                                }}
                                                            />
                                                            {tag.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newTagInput}
                                                onChange={(e) => setNewTagInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault()
                                                        handleInlineCreateTag()
                                                    }
                                                }}
                                                placeholder="Crear etiqueta rápida..."
                                                className="flex-1 h-8 rounded-xl bg-card border border-border/60 px-3 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                disabled={!newTagInput.trim() || createTag.isPending}
                                                onClick={handleInlineCreateTag}
                                                className="h-8 px-3 rounded-xl text-xs font-bold shrink-0"
                                            >
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                                Agregar
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Attach Receipt */}
                                    {showAttachmentsButton && (
                                    <div
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        className={cn(
                                            "bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 rounded-2xl flex items-center gap-3.5 px-4 sm:px-5 h-13 transition-all cursor-pointer",
                                            isUploading && "opacity-60 pointer-events-none"
                                        )}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                        />
                                        {isUploading ? (
                                            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                                        ) : attachmentUrl ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Paperclip className="w-5 h-5 text-muted-foreground shrink-0" />
                                        )}
                                        <span
                                            className={cn(
                                                "flex-1 text-sm font-semibold",
                                                attachmentUrl ? "text-emerald-600" : "text-muted-foreground"
                                            )}
                                        >
                                            {isUploading
                                                ? "Subiendo comprobante..."
                                                : attachmentUrl
                                                  ? "Comprobante adjunto"
                                                  : "Adjuntar comprobante"}
                                        </span>
                                        {attachmentUrl ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    form.setValue("attachmentUrl", "")
                                                }}
                                                className="text-xs font-bold text-destructive hover:underline"
                                            >
                                                Quitar
                                            </button>
                                        ) : (
                                            <Plus className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN (DATE/TIME + TYPE PILLS + ACCOUNT PILLS) */}
                            <div className="lg:col-span-6 flex flex-col gap-6">
                                {/* 1. DATE & TIME HEADER */}
                                <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
                                    <PremiumDatePicker
                                        variant="hero"
                                        label="Fecha"
                                        value={safeTxDate}
                                        onChange={(d) => form.setValue("transactionDate", d)}
                                    />
                                    <PremiumTimePicker
                                        variant="hero"
                                        label="Hora"
                                        value={safeTxDate}
                                        onChange={(d) => form.setValue("transactionDate", d)}
                                    />
                                </div>

                                {/* 2. SOURCE ACCOUNT PILLS */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <Wallet className="h-3.5 w-3.5" />
                                        </span>
                                        <span>
                                            {activeTab === "INCOME"
                                                ? "Cuenta de destino"
                                                : "Cuenta de origen"}
                                        </span>
                                    </div>

                                    {accounts.length === 0 ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-foreground">
                                                    Aún no tienes cuentas creadas
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Primero crea una cuenta (Efectivo, Banco o Tarjeta) para poder registrar movimientos.
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => router.push("/dashboard/accounts")}
                                                className="rounded-full font-bold shrink-0 gap-1.5"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Crear primera cuenta
                                            </Button>
                                        </div>
                                    ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {accounts.map((acc) => {
                                            const selected = currentAccountId === acc.id
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => form.setValue("accountId", acc.id)}
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all active:scale-95 flex items-center gap-2",
                                                        selected
                                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                                                            : "bg-card text-foreground/85 border-border/70 hover:border-primary/40"
                                                    )}
                                                >
                                                    <span>
                                                        {formatAccountPillName(acc.name, acc.currencyCode)}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    )}

                                    {/* Real-time Projected Balance / Credit Limit Preview (YNAB Style) */}
                                    {currentAccount && (() => {
                                        const isCard = currentAccount.accountType === "CREDIT_CARD"
                                        const creditLimit = Math.max(0, Number(currentAccount.creditLimit ?? 0))
                                        const usedBalance = Math.abs(Number(currentAccount.usedBalance ?? 0))
                                        const availableCredit = Math.max(0, creditLimit - usedBalance)
                                        const curBal = isCard
                                            ? availableCredit
                                            : Number(currentAccount.currentBalance ?? currentAccount.balance ?? 0)
                                        const delta = Number(currentAmount || 0)
                                        const nextBal = isCard
                                            ? activeTab === "INCOME"
                                                ? Math.min(creditLimit, curBal + delta)
                                                : curBal - delta
                                            : activeTab === "INCOME"
                                              ? curBal + delta
                                              : curBal - delta
                                        const isNegative = nextBal < 0

                                        return (
                                            <div className="rounded-2xl bg-muted/40 border border-border/60 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            {isCard ? "Crédito disponible:" : "Saldo actual:"}
                                                        </span>
                                                        <span className="font-bold tabular-nums text-foreground">
                                                            {formatMoney(curBal, currentAccount.currencyCode)}
                                                        </span>
                                                    </div>
                                                    {isCard && (
                                                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                                                            Deuda: {formatMoney(usedBalance, currentAccount.currencyCode)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        Proyectado:
                                                    </span>
                                                    <span className={cn("tabular-nums font-black", isNegative ? "text-rose-500" : "text-primary")}>
                                                        {formatMoney(nextBal, currentAccount.currencyCode)}
                                                    </span>
                                                    {isCard && isNegative && (
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500">
                                                            Excede límite
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* 3. TRANSFER DESTINATION ACCOUNT PILLS (INLINE, NO EXTERNAL MODAL) */}
                                {activeTab === "TRANSFER" && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <span className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                                </span>
                                                <span>Cuenta de destino</span>
                                            </div>
                                            {currentAccountId && transferToAccountId && (
                                                <button
                                                    type="button"
                                                    onClick={handleSwapTransferAccounts}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                                >
                                                    <ArrowDownUp className="h-3.5 w-3.5" />
                                                    Invertir
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {accounts
                                                .filter((acc) => acc.id !== currentAccountId)
                                                .map((acc) => {
                                                    const selected = transferToAccountId === acc.id
                                                    return (
                                                        <button
                                                            key={acc.id}
                                                            type="button"
                                                            onClick={() =>
                                                                form.setValue("transferToAccountId", acc.id)
                                                            }
                                                            className={cn(
                                                                "px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all active:scale-95",
                                                                selected
                                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/25"
                                                                    : "bg-card text-foreground/85 border-border/70 hover:border-indigo-500/40"
                                                            )}
                                                        >
                                                            {formatAccountPillName(acc.name, acc.currencyCode)}
                                                        </button>
                                                    )
                                                })}
                                        </div>

                                        {transferToAccount && transferToAccount.accountType === "CREDIT_CARD" && (() => {
                                            const destUsed = Math.abs(Number(transferToAccount.usedBalance ?? 0))
                                            const delta = Number(currentAmount || 0)
                                            const nextUsed = Math.max(0, destUsed - delta)
                                            return (
                                                <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-primary font-bold flex items-center gap-1.5">
                                                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                                        Pago a Tarjeta de Crédito
                                                    </span>
                                                    <span className="tabular-nums font-bold text-foreground">
                                                        Deuda actual: {formatMoney(destUsed, transferToAccount.currencyCode)}
                                                        {delta > 0 && (
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                {" → Nueva deuda: "}
                                                                {formatMoney(nextUsed, transferToAccount.currencyCode)}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            )
                                        })()}

                                        {currentAccount &&
                                            transferToAccount &&
                                            currentAccount.currencyCode !==
                                                transferToAccount.currencyCode && (
                                                <div className="rounded-2xl bg-primary/8 border border-primary/20 px-4 py-2.5 text-xs font-semibold text-primary flex items-center gap-2">
                                                    <Clock className="h-4 w-4 shrink-0" />
                                                    Transferencia multimoneda ({currentAccount.currencyCode} →{" "}
                                                    {transferToAccount.currencyCode}): se aplicará la tasa de cambio vigente.
                                                </div>
                                            )}
                                    </div>
                                )}

                                {/* 4. TRANSACTION MODE PILLS + CASHEW SCHEDULING & REMINDERS */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setModeInfoTab(
                                                    currentMode === "DEFAULT"
                                                        ? "SUBSCRIPTION"
                                                        : currentMode
                                                )
                                                setIsModeInfoOpen(true)
                                            }}
                                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            <span>Tipo de transacción</span>
                                            <Info className="h-3.5 w-3.5 text-primary" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.push("/dashboard/subscriptions")}
                                            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            Ver programados →
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {TRANSACTION_MODES.map((m) => {
                                            const active = currentMode === m.id
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => {
                                                        form.setValue("mode", m.id)
                                                        if (m.id === "SUBSCRIPTION" || m.id === "RECURRING") {
                                                            if (currentRecurrence === "NONE") {
                                                                form.setValue("recurrence", "MONTHLY")
                                                            }
                                                            form.setValue("initialPaymentState", "PENDING")
                                                        } else if (m.id === "UPCOMING") {
                                                            form.setValue("recurrence", "NONE")
                                                            form.setValue("initialPaymentState", "PENDING")
                                                        } else {
                                                            form.setValue("recurrence", "NONE")
                                                            form.setValue("initialPaymentState", "PAID_TODAY")
                                                        }
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all active:scale-95 cursor-pointer",
                                                        active
                                                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                                            : "bg-card text-foreground/80 border-border/70 hover:border-primary/40"
                                                    )}
                                                >
                                                    {m.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Dynamic Scheduling, Due Date, Frequency & Reminder Panel (Cashew Style) */}
                                    {(currentMode === "UPCOMING" ||
                                        currentMode === "SUBSCRIPTION" ||
                                        currentMode === "RECURRING") && (
                                        <div className="rounded-3xl bg-muted/45 border border-border/70 p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-1">
                                            {/* A. DUE DATE / NEXT BILLING DATE */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                                                        <CalendarClock className="h-4 w-4 text-primary" />
                                                        {currentMode === "UPCOMING"
                                                            ? "Fecha de vencimiento programada"
                                                            : initialPaymentState === "PAID_TODAY"
                                                              ? "Fecha de pago inicial"
                                                              : "Fecha de vencimiento / próximo cobro"}
                                                    </span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {initialPaymentState === "PENDING"
                                                            ? "No afectará tu saldo hasta que toques '¿Pagar?' o se ejecute en su vencimiento."
                                                            : "Se descontará hoy de tu saldo y se programará el siguiente ciclo."}
                                                    </p>
                                                </div>
                                                <div className="shrink-0">
                                                    <PremiumDatePicker
                                                        value={safeTxDate}
                                                        onChange={(d) => form.setValue("transactionDate", d)}
                                                        label="Vencimiento"
                                                    />
                                                </div>
                                            </div>

                                            {/* B. INITIAL PAYMENT STATE (Cashew: Pendiente '¿Pagar?' vs Pagado Hoy) */}
                                            {(currentMode === "SUBSCRIPTION" || currentMode === "RECURRING") && (
                                                <div className="space-y-1.5">
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        Estado de este cobro
                                                    </span>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                form.setValue("initialPaymentState", "PENDING")
                                                            }
                                                            className={cn(
                                                                "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                                initialPaymentState === "PENDING"
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                                    : "bg-card text-muted-foreground hover:text-foreground border-border/60"
                                                            )}
                                                        >
                                                            Pendiente ("¿Pagar?")
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                form.setValue("initialPaymentState", "PAID_TODAY")
                                                            }
                                                            className={cn(
                                                                "py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                                initialPaymentState === "PAID_TODAY"
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                                    : "bg-card text-muted-foreground hover:text-foreground border-border/60"
                                                            )}
                                                        >
                                                            Ya pagado hoy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* C. CASHEW "REPETIR CADA [N] [UNIDAD]" + "PARA SIEMPRE / HASTA FECHA / N COBROS" */}
                                            {(currentMode === "SUBSCRIPTION" || currentMode === "RECURRING") && (
                                                <div className="rounded-2xl bg-card/80 border border-border/60 p-3.5 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-black text-foreground">
                                                        <span>Repetir cada</span>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={99}
                                                            value={recurrenceInterval}
                                                            onChange={(e) =>
                                                                form.setValue(
                                                                    "recurrenceInterval",
                                                                    Math.max(1, Math.min(99, Number(e.target.value) || 1))
                                                                )
                                                            }
                                                            className="w-14 h-9 rounded-xl bg-muted border border-border/70 text-center text-sm font-black text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                        />
                                                        <div className="inline-flex rounded-xl bg-muted p-0.5 border border-border/60">
                                                            {(
                                                                [
                                                                    { id: "DAILY", label: recurrenceInterval > 1 ? "días" : "día" },
                                                                    { id: "WEEKLY", label: recurrenceInterval > 1 ? "semanas" : "semana" },
                                                                    { id: "MONTHLY", label: recurrenceInterval > 1 ? "meses" : "mes" },
                                                                    { id: "YEARLY", label: recurrenceInterval > 1 ? "años" : "año" },
                                                                ] as const
                                                            ).map((u) => (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    onClick={() => form.setValue("recurrence", u.id)}
                                                                    className={cn(
                                                                        "px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                                                                        currentRecurrence === u.id
                                                                            ? "bg-primary text-primary-foreground shadow-xs"
                                                                            : "text-muted-foreground hover:text-foreground"
                                                                    )}
                                                                >
                                                                    {u.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Limit Mode: Para siempre / Hasta una fecha / Por N cobros */}
                                                    <div className="flex flex-col items-center gap-2 pt-1 border-t border-border/40">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            {(
                                                                [
                                                                    { id: "FOREVER", label: "Para siempre" },
                                                                    { id: "UNTIL_DATE", label: "Hasta una fecha" },
                                                                    { id: "COUNT", label: "Por N cobros" },
                                                                ] as const
                                                            ).map((lim) => (
                                                                <button
                                                                    key={lim.id}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        form.setValue("recurrenceLimitMode", lim.id)
                                                                    }
                                                                    className={cn(
                                                                        "px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer",
                                                                        recurrenceLimitMode === lim.id
                                                                            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                                                            : "text-muted-foreground hover:text-foreground"
                                                                    )}
                                                                >
                                                                    {lim.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {recurrenceLimitMode === "UNTIL_DATE" && (
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <span className="text-xs font-semibold text-muted-foreground">
                                                                    Finaliza el:
                                                                </span>
                                                                <input
                                                                    type="date"
                                                                    value={recurrenceEndDate || ""}
                                                                    onChange={(e) =>
                                                                        form.setValue("recurrenceEndDate", e.target.value)
                                                                    }
                                                                    className="h-8 rounded-xl bg-muted border border-border/70 px-2.5 text-xs font-bold text-foreground"
                                                                />
                                                            </div>
                                                        )}

                                                        {recurrenceLimitMode === "COUNT" && (
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <span className="text-xs font-semibold text-muted-foreground">
                                                                    Total de cobros:
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min={2}
                                                                    max={240}
                                                                    value={recurrenceCount}
                                                                    onChange={(e) =>
                                                                        form.setValue(
                                                                            "recurrenceCount",
                                                                            Math.max(2, Number(e.target.value) || 2)
                                                                        )
                                                                    }
                                                                    className="w-16 h-8 rounded-xl bg-muted border border-border/70 text-center text-xs font-black text-primary"
                                                                />
                                                                <span className="text-xs text-muted-foreground">
                                                                    ciclos
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* D. REMINDER / NOTIFICATION DAYS & AUTO-PAY SWITCH */}
                                            <div className="space-y-2.5 pt-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-foreground">
                                                        Notificación de vencimiento
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {[
                                                            { days: 0, label: "Mismo día" },
                                                            { days: 1, label: "1d antes" },
                                                            { days: 3, label: "3d antes" },
                                                            { days: 7, label: "7d antes" },
                                                        ].map((rem) => (
                                                            <button
                                                                key={rem.days}
                                                                type="button"
                                                                onClick={() =>
                                                                    form.setValue("reminderDays", rem.days)
                                                                }
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                                                                    reminderDays === rem.days
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-card text-muted-foreground border-border/60 hover:text-foreground"
                                                                )}
                                                            >
                                                                {rem.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                    <div>
                                                        <p className="text-xs font-bold text-foreground">
                                                            Auto-pagar al llegar la fecha de vencimiento
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {isAutoExecute
                                                                ? "Se cobrará automáticamente en la fecha de vencimiento."
                                                                : "Quedará con el botón '¿Pagar?' para que confirmes manualmente."}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={isAutoExecute}
                                                        onCheckedChange={(v) => {
                                                            form.setValue("isAutoExecute", v)
                                                            form.setValue("scheduledType", v ? "AUTO" : "MANUAL")
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM FULL-WIDTH ACTION BAR */}
                    <div
                        className={cn(
                            "w-full border-t border-border/50 backdrop-blur-xl px-4 sm:px-8 py-3.5 pb-safe transition-colors duration-300 shrink-0",
                            theme.barTint
                        )}
                    >
                        <div className="max-w-3xl mx-auto w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
                            {!initialData && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    onClick={form.handleSubmit((values) => onSubmit(values, true), handleFormInvalid)}
                                    className="h-12 sm:h-14 px-5 rounded-full text-sm font-bold border-border/80 bg-card hover:bg-muted text-foreground shadow-sm transition-all active:scale-[0.98] shrink sm:shrink-0"
                                >
                                    <Plus className="w-4 h-4 stroke-[2.5]" />
                                    <span>Guardar y crear otra</span>
                                </Button>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={cn(
                                    "flex-1 min-w-0 h-12 sm:h-14 px-6 rounded-full text-base sm:text-lg font-black shadow-xl transition-all active:scale-[0.98] shrink",
                                    theme.submitBtn,
                                    isSubmitting && "opacity-60"
                                )}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2.5 truncate">
                                        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                        <span>Procesando...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2.5 truncate">
                                        <Check className="w-5 h-5 stroke-[3] shrink-0" />
                                        <span>
                                            {initialData ? "Actualizar Registro" : "Completar Transacción"}
                                        </span>
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>

            {/* PREMIUM CATEGORY PICKER */}
            <PremiumCategoryPicker
                open={isCategoryPickerOpen}
                onOpenChange={setIsCategoryPickerOpen}
                categories={categories}
                selectedCategoryId={currentCategoryId}
                selectedSubcategoryId={currentSubcategoryId}
                recentCategoryIds={recentCategoryIds}
                type={activeTab === "INCOME" ? "INCOME" : "EXPENSE"}
                onSelect={(catId, subId) => {
                    form.setValue("categoryId", catId)
                    form.setValue("subcategoryId", subId || "")
                    setHasManualCategory(true)
                }}
            />

            {/* PREMIUM CALCULATOR (Sheet on mobile, Dialog on desktop) */}
            {isMobile ? (
                <Sheet open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                    <SheetContent side="bottom" className="rounded-t-[2rem] p-4 pb-8 border-t-0">
                        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
                        <SheetHeader className="sr-only">
                            <SheetTitle>Calculadora de monto</SheetTitle>
                        </SheetHeader>
                        <div className="flex justify-center">
                            <PremiumCalculator
                                initialValue={currentAmount || "0"}
                                currencySymbol={currencySymbol}
                                accentClass={theme.calcAccent}
                                onConfirm={(val) => form.setValue("amount", val)}
                                onClose={() => setIsCalculatorOpen(false)}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                    <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none">
                        <DialogTitle className="sr-only">Calculadora de monto</DialogTitle>
                        <PremiumCalculator
                            initialValue={currentAmount || "0"}
                            currencySymbol={currencySymbol}
                            accentClass={theme.calcAccent}
                            onConfirm={(val) => form.setValue("amount", val)}
                            onClose={() => setIsCalculatorOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            )}
            {/* GUIDED EXPRESS FLOW SHEET (Auto-opens on create mode, Cashew-inspired & enhanced) */}
            {!initialData && (
                <ExpressTransactionSheet
                    open={isExpressOpen}
                    onOpenChange={setIsExpressOpen}
                    initialStep={expressStep}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    description={currentDescription}
                    onDescriptionChange={(val) => {
                        form.setValue("description", val)
                        if (!val.trim()) setHasManualCategory(false)
                    }}
                    amount={currentAmount || "0"}
                    onAmountChange={(val) => form.setValue("amount", val)}
                    categoryId={currentCategoryId || ""}
                    subcategoryId={currentSubcategoryId || ""}
                    onCategorySelect={(catId, subId) => {
                        form.setValue("categoryId", catId)
                        form.setValue("subcategoryId", subId || "")
                        setHasManualCategory(true)
                    }}
                    categories={categories}
                    recentCategoryIds={recentCategoryIds}
                    accounts={accounts}
                    accountId={currentAccountId || ""}
                    onAccountSelect={(id) => form.setValue("accountId", id)}
                    transferToAccountId={transferToAccountId || ""}
                    onTransferToSelect={(id) => form.setValue("transferToAccountId", id)}
                    onSwapTransferAccounts={handleSwapTransferAccounts}
                    frequent={frequent}
                    autocompleteMatches={autocompleteMatches}
                    onApplySuggestion={applySuggestion}
                    smartSuggestions={(smartCatData?.suggestions as any) || []}
                    transactionDate={safeTxDate}
                    onDateChange={(d) => form.setValue("transactionDate", d)}
                    isSubmitting={isSubmitting}
                    onSubmit={(createAnother = false) => {
                        form.handleSubmit((values) => onSubmit(values, createAnother), handleFormInvalid)()
                    }}
                />
            )}

            {/* CASHEW-STYLE "TIPO DE TRANSACCIÓN" INTERACTIVE GUIDE MODAL */}
            <Dialog open={isModeInfoOpen} onOpenChange={setIsModeInfoOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-6 border-border/70 bg-card shadow-2xl space-y-5">
                    <DialogTitle className="text-xl font-black text-foreground">
                        Tipo de Transacción
                    </DialogTitle>

                    {(() => {
                        const modeDocs: Record<
                            string,
                            {
                                title: string
                                icon: React.ComponentType<{ className?: string }>
                                bullets: string[]
                                previewName: string
                            }
                        > = {
                            UPCOMING: {
                                title: "Próximamente",
                                icon: Clock,
                                bullets: [
                                    "Transacción futura con fecha de vencimiento única que aparecerá en la página de Programados",
                                    "No descuenta de tu saldo a menos que la marques como 'Pagado' o 'Depositado'",
                                    "Te envía una notificación recordatoria según los días de aviso configurados",
                                ],
                                previewName: currentDescription || "Pago programado",
                            },
                            SUBSCRIPTION: {
                                title: "Suscripción",
                                icon: CalendarClock,
                                bullets: [
                                    "Transacción recurrente que se mostrará en la página de Suscripciones y Programados",
                                    "No cuenta para tu saldo total a menos que sea marcada como 'Pagado' o 'Depositado'",
                                    "La próxima fecha de cobro se genera automáticamente cuando la actual se marca como 'Pagada'",
                                ],
                                previewName: currentDescription || "Netflix",
                            },
                            RECURRING: {
                                title: "Repetitivo",
                                icon: Repeat,
                                bullets: [
                                    "Gasto o ingreso periódico (alquiler, sueldo, servicios) que se repite cada N días, semanas, meses o años",
                                    "Permite configurar duración 'Para siempre', 'Hasta una fecha' o 'Por N cobros'",
                                    "Genera automáticamente el siguiente ciclo al confirmarse el pago actual",
                                ],
                                previewName: currentDescription || "Alquiler mensual",
                            },
                            DEFAULT: {
                                title: "Por defecto",
                                icon: CheckCircle2,
                                bullets: [
                                    "Transacción estándar ya realizada en el momento",
                                    "Actualiza inmediatamente el saldo disponible de la cuenta seleccionada",
                                    "Se refleja al instante en tus reportes, presupuestos y estadísticas del mes",
                                ],
                                previewName: currentDescription || "Compra del día",
                            },
                        }
                        const info = modeDocs[modeInfoTab] || modeDocs.SUBSCRIPTION
                        const ActiveIcon = info.icon

                        return (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="h-9 w-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
                                            <ActiveIcon className="h-5 w-5" />
                                        </span>
                                        <h4 className="text-lg font-black text-foreground">
                                            {info.title}
                                        </h4>
                                    </div>
                                    <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-5 leading-relaxed">
                                        {info.bullets.map((b, i) => (
                                            <li key={i}>{b}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="rounded-2xl bg-muted/25 border border-border/60 p-4 space-y-3 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        Marca o confirma una transacción especial tocando el botón de acción en la lista de programados:
                                    </p>

                                    <div className="flex items-center justify-center gap-2">
                                        {[
                                            { id: "UPCOMING", icon: Clock, label: "Próximamente" },
                                            { id: "SUBSCRIPTION", icon: CalendarClock, label: "Suscripción" },
                                            { id: "RECURRING", icon: Repeat, label: "Repetitivo" },
                                            { id: "DEFAULT", icon: CheckCircle2, label: "Por defecto" },
                                        ].map((btn) => {
                                            const BtnIcon = btn.icon
                                            const active = modeInfoTab === btn.id
                                            return (
                                                <button
                                                    key={btn.id}
                                                    type="button"
                                                    onClick={() => setModeInfoTab(btn.id)}
                                                    title={btn.label}
                                                    className={cn(
                                                        "h-10 w-10 rounded-full flex items-center justify-center transition-all cursor-pointer",
                                                        active
                                                            ? "bg-primary text-primary-foreground shadow-md"
                                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <BtnIcon className="h-4.5 w-4.5" />
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Visual Preview Card (matching Cashew Screenshot 2) */}
                                    <div className="rounded-2xl bg-card border border-border/80 p-3 flex items-center justify-between gap-3 text-left shadow-xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="h-10 w-10 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                                                <ActiveIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-extrabold text-foreground truncate">
                                                    {info.previewName}
                                                </p>
                                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                                    {currentAccount?.name || "Banco"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {modeInfoTab !== "DEFAULT" && (
                                                <span className="px-2.5 py-1 rounded-xl bg-muted text-[11px] font-bold text-muted-foreground">
                                                    {activeTab === "INCOME" ? "¿Depositar?" : "¿Pagar?"}
                                                </span>
                                            )}
                                            <span className="text-sm font-black text-foreground tabular-nums">
                                                {activeTab === "INCOME" ? "+" : "-"}
                                                {currencySymbol} {currentAmount || "50"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            form.setValue("mode", modeInfoTab)
                                            if (
                                                modeInfoTab === "SUBSCRIPTION" ||
                                                modeInfoTab === "RECURRING"
                                            ) {
                                                if (currentRecurrence === "NONE") {
                                                    form.setValue("recurrence", "MONTHLY")
                                                }
                                            }
                                            setIsModeInfoOpen(false)
                                        }}
                                        className="w-full h-11 rounded-2xl font-bold cursor-pointer"
                                    >
                                        Usar modo "{info.title}"
                                    </Button>
                                </div>
                            </div>
                        )
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    )
}
