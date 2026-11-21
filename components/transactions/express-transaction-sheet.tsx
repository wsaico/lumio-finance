"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { showAppToast } from "@/components/ui/app-alert-toast"
import {
    X,
    Check,
    Plus,
    Delete,
    Divide,
    Minus,
    X as Multiply,
    Sparkles,
    Zap,
    Search,
    ArrowRight,
    ArrowRightLeft,
    ArrowDownUp,
    Calendar,
    Wallet,
    Loader2,
    SlidersHorizontal,
    Tag,
    ChevronRight,
    CreditCard,
} from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn, formatAccountPillName } from "@/lib/utils"
import { getCurrencySymbol } from "@/lib/currencies"
import { CategoryIcon } from "@/components/icons/category-icon"
import { SuggestedTransaction } from "@/hooks/useTransactionSuggestions"
import { useFormat } from "@/hooks/useFormat"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { format, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"

export type ExpressStep = "title" | "category" | "amount"

export interface ExpressTransactionSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialStep?: ExpressStep
    activeTab: "EXPENSE" | "INCOME" | "TRANSFER"
    onTabChange: (tab: "EXPENSE" | "INCOME" | "TRANSFER") => void
    description: string
    onDescriptionChange: (val: string) => void
    amount: string
    onAmountChange: (val: string) => void
    categoryId: string
    subcategoryId: string
    onCategorySelect: (catId: string, subId?: string) => void
    categories: any[]
    recentCategoryIds: string[]
    accounts: any[]
    accountId: string
    onAccountSelect: (id: string) => void
    transferToAccountId: string
    onTransferToSelect: (id: string) => void
    onSwapTransferAccounts: () => void
    frequent: SuggestedTransaction[]
    autocompleteMatches: SuggestedTransaction[]
    onApplySuggestion: (item: SuggestedTransaction) => void
    smartSuggestions: Array<{
        categoryId: string
        categoryName: string
        categoryColor?: string
        categoryIcon?: string
        subcategoryId?: string
        subcategoryName?: string
    }>
    transactionDate: Date
    onDateChange: (d: Date) => void
    isSubmitting: boolean
    onSubmit: (createAnother?: boolean) => void
}

function safeEvaluate(expr: string): string {
    try {
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, "")
        if (!sanitized) return "0"
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized})`)()
        if (typeof result !== "number" || !isFinite(result) || isNaN(result)) return "0"
        const rounded = Math.max(0, Math.round(result * 100) / 100)
        return String(rounded)
    } catch {
        return expr
    }
}

export function ExpressTransactionSheet({
    open,
    onOpenChange,
    initialStep = "title",
    activeTab,
    onTabChange,
    description,
    onDescriptionChange,
    amount,
    onAmountChange,
    categoryId,
    subcategoryId,
    onCategorySelect,
    categories,
    recentCategoryIds,
    accounts,
    accountId,
    onAccountSelect,
    transferToAccountId,
    onTransferToSelect,
    onSwapTransferAccounts,
    frequent,
    autocompleteMatches,
    onApplySuggestion,
    smartSuggestions,
    transactionDate,
    onDateChange,
    isSubmitting,
    onSubmit,
}: ExpressTransactionSheetProps) {
    const router = useRouter()
    const isMobile = useMediaQuery("(max-width: 768px)")
    const { formatMoney } = useFormat()

    const [step, setStep] = React.useState<ExpressStep>(initialStep)
    const [catSearch, setCatSearch] = React.useState("")
    const [expandedCatId, setExpandedCatId] = React.useState<string | null>(null)
    const [titleError, setTitleError] = React.useState<string | null>(null)
    const [accountSelectOpen, setAccountSelectOpen] = React.useState(false)
    const [calcDisplay, setCalcDisplay] = React.useState(
        amount && amount !== "0" ? String(amount) : "0"
    )

    const titleInputRef = React.useRef<HTMLInputElement>(null)

    // Sync initialStep when opening
    React.useEffect(() => {
        if (open) {
            setStep(initialStep)
            setCatSearch("")
            setCalcDisplay(amount && amount !== "0" ? String(amount) : "0")
        }
    }, [open, initialStep])

    // Keep calculator synced when amount changes externally (e.g., applying a frequent suggestion)
    React.useEffect(() => {
        const evaluated = safeEvaluate(calcDisplay)
        if (amount !== evaluated && step !== "amount") {
            setCalcDisplay(amount && amount !== "0" ? String(amount) : "0")
        }
    }, [amount, step])

    // Auto-focus title input when entering step 1
    React.useEffect(() => {
        if (open && step === "title") {
            const t = setTimeout(() => {
                titleInputRef.current?.focus()
            }, 80)
            return () => clearTimeout(t)
        }
    }, [open, step])

    const currentAccount = accounts.find((a) => a.id === accountId)
    const transferToAccount = accounts.find((a) => a.id === transferToAccountId)
    const currencySymbol = getCurrencySymbol(currentAccount?.currencyCode)

    const currentCategory = categories.find((c: any) => c.id === categoryId)
    const currentSubcategory = currentCategory?.subcategories?.find(
        (s: any) => s.id === subcategoryId
    )

    const filteredCategories = React.useMemo(() => {
        const byType = categories.filter((c: any) => {
            if (activeTab === "INCOME") return !c.type || c.type === "INCOME"
            return !c.type || c.type === "EXPENSE"
        })
        const q = catSearch.trim().toLowerCase()
        if (!q) return byType
        return byType.filter((c: any) => {
            if (c.name?.toLowerCase().includes(q)) return true
            return c.subcategories?.some((s: any) => s.name?.toLowerCase().includes(q))
        })
    }, [categories, activeTab, catSearch])

    const recentCategories = React.useMemo(() => {
        if (catSearch.trim()) return []
        return recentCategoryIds
            .map((id) => filteredCategories.find((c: any) => c.id === id))
            .filter(Boolean)
            .slice(0, 4)
    }, [recentCategoryIds, filteredCategories, catSearch])

    // Accent theme matching activeTab
    const accent = React.useMemo(() => {
        if (activeTab === "INCOME") {
            return {
                btn: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25",
                pill: "bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20",
                soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                ring: "focus-within:border-emerald-500/60 focus-within:ring-emerald-500/15",
                text: "text-emerald-600 dark:text-emerald-400",
            }
        }
        if (activeTab === "TRANSFER") {
            return {
                btn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25",
                pill: "bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20",
                soft: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                ring: "focus-within:border-indigo-500/60 focus-within:ring-indigo-500/15",
                text: "text-indigo-600 dark:text-indigo-400",
            }
        }
        return {
            btn: "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25",
            pill: "bg-rose-500 text-white border-rose-500 shadow-rose-500/20",
            soft: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
            ring: "focus-within:border-rose-500/60 focus-within:ring-rose-500/15",
            text: "text-rose-600 dark:text-rose-400",
        }
    }, [activeTab])

    // Calculator logic
    const calcAppend = React.useCallback(
        (token: string) => {
            setCalcDisplay((prev) => {
                const isOp = ["+", "-", "*", "/"].includes(token)
                let next = prev
                if (prev === "0" && !isOp && token !== ".") {
                    next = token === "00" ? "0" : token
                } else if (isOp && ["+", "-", "*", "/"].includes(prev.slice(-1))) {
                    next = prev.slice(0, -1) + token
                } else if (token === ".") {
                    const lastChunk = prev.split(/[+\-*/]/).pop() || ""
                    if (lastChunk.includes(".")) return prev
                    next = prev + token
                } else {
                    next = prev + token
                }
                const evaluated = safeEvaluate(next)
                onAmountChange(evaluated)
                return next
            })
        },
        [onAmountChange]
    )

    const calcBackspace = React.useCallback(() => {
        setCalcDisplay((prev) => {
            const next = prev.length <= 1 ? "0" : prev.slice(0, -1)
            onAmountChange(safeEvaluate(next))
            return next
        })
    }, [onAmountChange])

    const calcClear = React.useCallback(() => {
        setCalcDisplay("0")
        onAmountChange("0")
    }, [onAmountChange])

    const calcEvaluateNow = React.useCallback(() => {
        const evaluated = safeEvaluate(calcDisplay)
        setCalcDisplay(evaluated)
        onAmountChange(evaluated)
        return evaluated
    }, [calcDisplay, onAmountChange])

    const hasOperator = /[+\-*/]/.test(calcDisplay)
    const numericAmount = Number(safeEvaluate(calcDisplay)) || 0

    // Keyboard support for Step 3 (calculator) and Escape to close
    React.useEffect(() => {
        if (!open) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (accountSelectOpen) return
                e.preventDefault()
                onOpenChange(false)
                return
            }
            if (step !== "amount") return
            // Don't hijack if user focused an input
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === "INPUT" || tag === "TEXTAREA") return

            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault()
                calcAppend(e.key)
            } else if (["+", "-", "*", "/", "."].includes(e.key)) {
                e.preventDefault()
                calcAppend(e.key)
            } else if (e.key === "Backspace") {
                e.preventDefault()
                calcBackspace()
            } else if (e.key === "=") {
                e.preventDefault()
                calcEvaluateNow()
            } else if (e.key === "Enter") {
                e.preventDefault()
                if (hasOperator) {
                    calcEvaluateNow()
                } else if (numericAmount > 0 && !isSubmitting) {
                    onSubmit(false)
                }
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [
        open,
        step,
        calcAppend,
        calcBackspace,
        calcEvaluateNow,
        hasOperator,
        numericAmount,
        isSubmitting,
        onSubmit,
        onOpenChange,
        accountSelectOpen,
    ])

    if (!open) return null

    const handleTitleNext = () => {
        if (!description.trim()) {
            setTitleError("Escribe una descripción para identificar este movimiento")
            titleInputRef.current?.focus()
            return
        }
        setTitleError(null)
        if (activeTab === "TRANSFER") {
            setStep("category") // Accounts step for transfer
            return
        }
        // If user already has a category (auto-matched or previously chosen), go straight to amount!
        if (categoryId && description.trim().length >= 2) {
            setStep("amount")
        } else {
            setStep("category")
        }
    }

    const handleSafeSubmit = (createAnother = false) => {
        if (accounts.length === 0) {
            showAppToast.warning({
                title: "Primero crea una cuenta",
                description: "Necesitas al menos una cuenta (Efectivo o Banco) para registrar movimientos.",
                actionLabel: "Crear cuenta",
                onAction: () => {
                    onOpenChange(false)
                    router.push("/dashboard/accounts")
                },
            })
            return
        }
        if (activeTab === "TRANSFER" && accounts.length < 2) {
            showAppToast.warning({
                title: "Necesitas al menos 2 cuentas",
                description: "Para hacer una transferencia debes tener una cuenta de origen y otra de destino.",
                actionLabel: "Crear cuenta",
                onAction: () => {
                    onOpenChange(false)
                    router.push("/dashboard/accounts")
                },
            })
            return
        }
        if (!description.trim()) {
            setTitleError("La descripción es obligatoria")
            showAppToast.warning({
                title: "Falta la descripción",
                description: "Escribe un título breve para identificar este movimiento.",
            })
            setStep("title")
            return
        }
        if (activeTab !== "TRANSFER" && !categoryId) {
            showAppToast.warning({
                title: "Selecciona una categoría",
                description: "Elige una categoría antes de guardar el movimiento.",
            })
            setStep("category")
            return
        }
        if (activeTab === "TRANSFER" && (!transferToAccountId || transferToAccountId === accountId)) {
            showAppToast.warning({
                title: "Selecciona la cuenta destino",
                description: "La cuenta de origen y destino deben ser diferentes.",
            })
            setStep("category")
            return
        }
        if (!accountId) {
            showAppToast.warning({
                title: activeTab === "INCOME" ? "Selecciona una cuenta destino" : "Selecciona una cuenta de origen",
                description: "Elige la cuenta donde se registrará este movimiento.",
            })
            setAccountSelectOpen(true)
            return
        }
        calcEvaluateNow()
        if (numericAmount <= 0) {
            showAppToast.warning({
                title: "Ingresa un monto mayor a 0",
                description: "Usa el teclado numérico para indicar el importe.",
            })
            return
        }
        onSubmit(createAnother)
        if (createAnother) {
            setCalcDisplay("0")
            setTitleError(null)
            setStep("title")
        }
    }

    const handlePickCategory = (cat: any, subId?: string) => {
        onCategorySelect(cat.id, subId || "")
        // If category has subcategories and we haven't picked one yet and it's not expanded, expand it briefly OR advance if no subs
        if (!subId && cat.subcategories?.length > 0 && expandedCatId !== cat.id) {
            setExpandedCatId(cat.id)
            return
        }
        setExpandedCatId(null)
        setStep("amount")
    }

    const handleQuickDateToggle = () => {
        const now = new Date()
        if (isToday(transactionDate)) {
            const yesterday = new Date(now)
            yesterday.setDate(now.getDate() - 1)
            onDateChange(yesterday)
        } else {
            onDateChange(now)
        }
    }

    const dateShortLabel = isToday(transactionDate)
        ? "Hoy"
        : isYesterday(transactionDate)
          ? "Ayer"
          : format(transactionDate, "d MMM", { locale: es })

    const isCreditCard = currentAccount?.accountType === "CREDIT_CARD"
    const creditLimit = Math.max(0, Number(currentAccount?.creditLimit ?? 0))
    const usedBalance = Math.abs(Number(currentAccount?.usedBalance ?? 0))
    const currentBalance = isCreditCard
        ? Math.max(0, creditLimit - usedBalance)
        : Number(currentAccount?.currentBalance ?? currentAccount?.balance ?? 0)
    const projectedBalance = isCreditCard
        ? activeTab === "INCOME"
            ? Math.min(creditLimit, currentBalance + numericAmount)
            : currentBalance - numericAmount
        : activeTab === "INCOME"
          ? currentBalance + numericAmount
          : currentBalance - numericAmount

    const isTransferToCard =
        activeTab === "TRANSFER" && transferToAccount?.accountType === "CREDIT_CARD"
    const destCardUsed = Math.abs(Number(transferToAccount?.usedBalance ?? 0))
    const destCardProjectedDebt = Math.max(0, destCardUsed - numericAmount)

    const topSmart = smartSuggestions?.[0]

    const calcKeys: { label: React.ReactNode; value: string; kind: "num" | "op" | "action" }[] = [
        { label: "7", value: "7", kind: "num" },
        { label: "8", value: "8", kind: "num" },
        { label: "9", value: "9", kind: "num" },
        { label: <Divide className="h-4 w-4" />, value: "/", kind: "op" },
        { label: "4", value: "4", kind: "num" },
        { label: "5", value: "5", kind: "num" },
        { label: "6", value: "6", kind: "num" },
        { label: <Multiply className="h-4 w-4" />, value: "*", kind: "op" },
        { label: "1", value: "1", kind: "num" },
        { label: "2", value: "2", kind: "num" },
        { label: "3", value: "3", kind: "num" },
        { label: <Minus className="h-4 w-4" />, value: "-", kind: "op" },
        { label: ".", value: ".", kind: "num" },
        { label: "0", value: "0", kind: "num" },
        { label: <Delete className="h-4 w-4" />, value: "DEL", kind: "action" },
        { label: <Plus className="h-4 w-4" />, value: "+", kind: "op" },
    ]

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/45 backdrop-blur-[3px] animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onOpenChange(false)
            }}
        >
            <div
                className={cn(
                    "w-full bg-card border border-border/60 shadow-2xl overflow-hidden flex flex-col transition-all duration-200",
                    isMobile
                        ? "rounded-t-[2rem] max-h-[90dvh] animate-in slide-in-from-bottom-6 duration-200"
                        : "max-w-[500px] rounded-[2rem] max-h-[88vh] mx-4 animate-in zoom-in-95 duration-200"
                )}
            >
                {/* Mobile Drag Handle */}
                {isMobile && (
                    <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                        <div className="h-1.5 w-11 rounded-full bg-muted-foreground/25" />
                    </div>
                )}

                {/* TOP BAR: Mode Tabs + Quick Date + Close */}
                <div className="px-3.5 sm:px-5 pt-2.5 sm:pt-3.5 pb-2.5 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-border/50 shrink-0">
                    {/* Compact Type Switcher */}
                    <div className="inline-flex items-center p-0.5 sm:p-1 rounded-full bg-muted/70 border border-border/50 min-w-0">
                        {(
                            [
                                { id: "EXPENSE", label: "Gasto" },
                                { id: "INCOME", label: "Ingreso" },
                                { id: "TRANSFER", label: "Transferir" },
                            ] as const
                        ).map((t) => {
                            const active = activeTab === t.id
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => onTabChange(t.id)}
                                    className={cn(
                                        "px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold transition-all whitespace-nowrap",
                                        active
                                            ? t.id === "EXPENSE"
                                                ? "bg-rose-500 text-white shadow-sm"
                                                : t.id === "INCOME"
                                                  ? "bg-emerald-500 text-white shadow-sm"
                                                  : "bg-indigo-600 text-white shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={handleQuickDateToggle}
                            title="Alternar entre Hoy y Ayer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-[11px] sm:text-xs font-bold text-foreground/85 transition-colors"
                        >
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{dateShortLabel}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            title="Cerrar y ver formulario completo"
                            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* INTERACTIVE STEPPER PILLS (100% flush on 360px mobile, zero clipping) */}
                <div className="px-3.5 sm:px-5 py-2 bg-muted/25 border-b border-border/40 flex items-center justify-between gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setStep("title")}
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all min-w-0 border",
                            step === "title"
                                ? accent.pill
                                : description.trim()
                                  ? "bg-card text-foreground border-border/70"
                                  : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                    >
                        <span className="h-4 w-4 rounded-full bg-black/10 dark:bg-white/15 flex items-center justify-center text-[10px] font-black shrink-0">
                            1
                        </span>
                        <span className="max-w-[78px] sm:max-w-[110px] truncate">
                            {description.trim() || "Título"}
                        </span>
                    </button>

                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />

                    <button
                        type="button"
                        onClick={() => setStep("category")}
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all min-w-0 border",
                            step === "category"
                                ? accent.pill
                                : activeTab === "TRANSFER"
                                  ? transferToAccount
                                      ? "bg-card text-foreground border-border/70"
                                      : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/60"
                                  : currentCategory
                                    ? "bg-card text-foreground border-border/70"
                                    : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                    >
                        <span className="h-4 w-4 rounded-full bg-black/10 dark:bg-white/15 flex items-center justify-center text-[10px] font-black shrink-0">
                            2
                        </span>
                        <span className="max-w-[82px] sm:max-w-[120px] truncate">
                            {activeTab === "TRANSFER"
                                ? transferToAccount
                                    ? `→ ${transferToAccount.name}`
                                    : "Cuentas"
                                : currentSubcategory
                                  ? currentSubcategory.name
                                  : currentCategory?.name || "Categoría"}
                        </span>
                    </button>

                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />

                    <button
                        type="button"
                        onClick={() => setStep("amount")}
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 border",
                            step === "amount"
                                ? accent.pill
                                : numericAmount > 0
                                  ? "bg-card text-foreground border-border/70"
                                  : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/60"
                        )}
                    >
                        <span className="h-4 w-4 rounded-full bg-black/10 dark:bg-white/15 flex items-center justify-center text-[10px] font-black shrink-0">
                            3
                        </span>
                        <span className="tabular-nums whitespace-nowrap">
                            {numericAmount > 0
                                ? `${currencySymbol}${numericAmount.toLocaleString("es-PE")}`
                                : "Monto"}
                        </span>
                    </button>
                </div>

                {/* ========================================================= */}
                {/* STEP 1: TITLE + LIVE SMART MATCH + 1-TAP FREQUENTS        */}
                {/* ========================================================= */}
                {step === "title" && (
                    <>
                    <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
                        <div>
                            <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                                {activeTab === "EXPENSE"
                                    ? "¿En qué gastaste?"
                                    : activeTab === "INCOME"
                                      ? "¿De dónde viene el ingreso?"
                                      : "¿Motivo de la transferencia?"}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Escribe un título o toca un frecuente para ir directo al monto
                            </p>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                            <div
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl bg-muted/50 border-2 px-3.5 py-3 transition-all ring-4 ring-transparent",
                                    titleError
                                        ? "border-rose-500/70 ring-rose-500/15"
                                        : "border-border/60",
                                    !titleError && accent.ring
                                )}
                            >
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    value={description}
                                    onChange={(e) => {
                                        onDescriptionChange(e.target.value)
                                        if (titleError && e.target.value.trim()) {
                                            setTitleError(null)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            handleTitleNext()
                                        }
                                    }}
                                    placeholder={
                                        activeTab === "EXPENSE"
                                            ? "Ej. Almuerzo, Netflix, Uber, Libro..."
                                            : activeTab === "INCOME"
                                              ? "Ej. Sueldo, Freelance, Reembolso..."
                                              : "Ej. Ahorro mensual, Pago tarjeta..."
                                    }
                                    className="w-full bg-transparent text-sm sm:text-base font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                                />
                                {description && (
                                    <button
                                        type="button"
                                        onClick={() => onDescriptionChange("")}
                                        className="h-6 w-6 rounded-full bg-muted-foreground/15 hover:bg-muted-foreground/25 flex items-center justify-center text-muted-foreground shrink-0"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {titleError && (
                                <p className="text-xs font-bold text-rose-500 px-1 animate-in fade-in slide-in-from-top-1">
                                    {titleError}
                                </p>
                            )}
                            {activeTab === "TRANSFER" && !description.trim() && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {[
                                        "Transferencia entre cuentas",
                                        "Pago de tarjeta",
                                        "Ahorro mensual",
                                    ].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => {
                                                onDescriptionChange(preset)
                                                setTitleError(null)
                                                setStep("category")
                                            }}
                                            className="px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition-colors"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Smart Category Match Card (Cashew-style instant suggestion, enhanced) */}
                        {activeTab !== "TRANSFER" && topSmart && description.trim().length >= 2 && (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-primary" />
                                    Categoría sugerida · toca para ir al monto
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onCategorySelect(
                                            topSmart.categoryId,
                                            topSmart.subcategoryId || ""
                                        )
                                        setStep("amount")
                                    }}
                                    className="w-full flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-primary/8 hover:bg-primary/14 border border-primary/25 transition-all active:scale-[0.99] text-left"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                                            style={{
                                                backgroundColor: topSmart.categoryColor || "#7c3aed",
                                            }}
                                        >
                                            <CategoryIcon
                                                name={topSmart.categoryIcon || "tag"}
                                                className="h-4 w-4 sm:h-5 sm:w-5"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-black text-foreground truncate">
                                                {topSmart.categoryName}
                                                {topSmart.subcategoryName
                                                    ? ` · ${topSmart.subcategoryName}`
                                                    : ""}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Confirmar y pasar al monto
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                </button>
                            </div>
                        )}

                        {/* Live History Autocomplete OR Top Frequents */}
                        {(() => {
                            const items =
                                description.trim().length >= 2 && autocompleteMatches.length > 0
                                    ? autocompleteMatches.slice(0, 4)
                                    : frequent.slice(0, 4)
                            if (items.length === 0) return null
                            const isFiltered =
                                description.trim().length >= 2 && autocompleteMatches.length > 0
                            return (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-amber-500" />
                                        {isFiltered ? "Coincidencias en tu historial" : "Frecuentes · 1 toque al monto"}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    onApplySuggestion(item)
                                                    if (item.lastAmount > 0) {
                                                        setCalcDisplay(String(item.lastAmount))
                                                    }
                                                    setStep("amount")
                                                }}
                                                className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/50 transition-all active:scale-[0.98] text-left"
                                            >
                                                <div
                                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center text-white shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            item.categoryColor || "#7c3aed",
                                                    }}
                                                >
                                                    <CategoryIcon
                                                        name={item.categoryIcon || "tag"}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-extrabold text-foreground truncate">
                                                        {item.description}
                                                    </p>
                                                    <p className="text-[10px] font-semibold text-muted-foreground tabular-nums truncate">
                                                        {currencySymbol}
                                                        {item.lastAmount.toLocaleString("es-PE")}
                                                        {item.categoryName
                                                            ? ` · ${item.categoryName}`
                                                            : ""}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    {/* Sticky Bottom Action Bar for Step 1 — ALWAYS visible on mobile */}
                    <div className="px-4 sm:px-5 py-3 pb-safe border-t border-border/50 bg-card shrink-0">
                        <button
                            type="button"
                            onClick={handleTitleNext}
                            className={cn(
                                "w-full h-12 rounded-2xl font-extrabold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                accent.btn
                            )}
                        >
                            <span>
                                {activeTab === "TRANSFER"
                                    ? "Elegir cuentas"
                                    : categoryId && description.trim().length >= 2
                                      ? "Continuar al monto"
                                      : "Seleccionar categoría"}
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                    </>
                )}

                {/* ========================================================= */}
                {/* STEP 2: CATEGORY GRID (OR TRANSFER ACCOUNTS)              */}
                {/* ========================================================= */}
                {step === "category" && (
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {activeTab === "TRANSFER" ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-foreground">
                                            Cuentas de transferencia
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Elige de dónde sale y a dónde llega el dinero
                                        </p>
                                    </div>
                                    {accountId && transferToAccountId && (
                                        <button
                                            type="button"
                                            onClick={onSwapTransferAccounts}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-500/20 transition-colors"
                                        >
                                            <ArrowDownUp className="h-3.5 w-3.5" />
                                            Invertir
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                        Cuenta de origen
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {accounts.map((acc) => {
                                            const selected = accountId === acc.id
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => onAccountSelect(acc.id)}
                                                    className={cn(
                                                        "px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all active:scale-95",
                                                        selected
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                                                            : "bg-muted/40 text-foreground border-border/60 hover:border-indigo-500/40"
                                                    )}
                                                >
                                                    {formatAccountPillName(acc.name, acc.currencyCode)}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                        Cuenta de destino
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {accounts
                                            .filter((acc) => acc.id !== accountId)
                                            .map((acc) => {
                                                const selected = transferToAccountId === acc.id
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onTransferToSelect(acc.id)
                                                            setStep("amount")
                                                        }}
                                                        className={cn(
                                                            "px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all active:scale-95",
                                                            selected
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                                                                : "bg-muted/40 text-foreground border-border/60 hover:border-indigo-500/40"
                                                        )}
                                                    >
                                                        {formatAccountPillName(
                                                            acc.name,
                                                            acc.currencyCode
                                                        )}
                                                    </button>
                                                )
                                            })}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep("amount")}
                                    className={cn(
                                        "w-full h-12 rounded-2xl font-extrabold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                        accent.btn
                                    )}
                                >
                                    <span>Continuar al monto</span>
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-lg font-black tracking-tight text-foreground">
                                        Elige una categoría
                                    </h3>
                                    <div className="relative w-40 sm:w-48">
                                        <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={catSearch}
                                            onChange={(e) => setCatSearch(e.target.value)}
                                            placeholder="Buscar..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-muted/60 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>

                                {/* Recent categories row */}
                                {recentCategories.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                            Recientes
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                            {recentCategories.map((cat: any) => {
                                                const isSel = categoryId === cat.id
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => handlePickCategory(cat)}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold shrink-0 transition-all active:scale-95",
                                                            isSel
                                                                ? accent.soft
                                                                : "bg-muted/40 border-border/50 text-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        <span
                                                            className="h-6 w-6 rounded-lg flex items-center justify-center text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    cat.color || "#7c3aed",
                                                            }}
                                                        >
                                                            <CategoryIcon
                                                                name={cat.icon || "tag"}
                                                                className="h-3.5 w-3.5"
                                                            />
                                                        </span>
                                                        <span>{cat.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Subcategory Quick Drawer if a parent with subs was tapped */}
                                {expandedCatId && (() => {
                                    const parent = filteredCategories.find(
                                        (c: any) => c.id === expandedCatId
                                    )
                                    if (!parent || !parent.subcategories?.length) return null
                                    return (
                                        <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 space-y-2 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-foreground">
                                                    Subcategorías de {parent.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onCategorySelect(parent.id, "")
                                                        setExpandedCatId(null)
                                                        setStep("amount")
                                                    }}
                                                    className="text-[11px] font-bold text-primary hover:underline"
                                                >
                                                    Usar general →
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {parent.subcategories.map((sub: any) => (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={() =>
                                                            handlePickCategory(parent, sub.id)
                                                        }
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                                                            subcategoryId === sub.id
                                                                ? accent.pill
                                                                : "bg-card border-border/60 text-foreground hover:border-primary/40"
                                                        )}
                                                    >
                                                        {sub.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Visual Icon Grid (Cashew-style colorful tiles) */}
                                <div className="grid grid-cols-4 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                                    {filteredCategories.map((cat: any) => {
                                        const isSelected = categoryId === cat.id
                                        const hasSubs = cat.subcategories?.length > 0
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => handlePickCategory(cat)}
                                                className={cn(
                                                    "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all active:scale-95 border",
                                                    isSelected
                                                        ? "bg-primary/10 border-primary/40 shadow-sm"
                                                        : "bg-transparent border-transparent hover:bg-muted/50"
                                                )}
                                            >
                                                <div
                                                    className="relative h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm"
                                                    style={{
                                                        backgroundColor: cat.color || "#7c3aed",
                                                    }}
                                                >
                                                    <CategoryIcon
                                                        name={cat.icon || "tag"}
                                                        className="h-5 w-5"
                                                    />
                                                    {hasSubs && (
                                                        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card text-foreground text-[9px] font-black flex items-center justify-center shadow border border-border">
                                                            {cat.subcategories.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-foreground/90 text-center leading-tight line-clamp-1 w-full">
                                                    {cat.name}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* STEP 3: ACCOUNT PILLS + LIVE CALCULATOR + INSTANT SAVE    */}
                {/* ========================================================= */}
                {step === "amount" && (
                    <>
                    <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 min-h-0 select-none">
                        {/* Inline Account Selector */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground gap-2">
                                <span className="flex items-center gap-1 shrink-0">
                                    {isCreditCard ? (
                                        <CreditCard className="h-3 w-3 text-primary" />
                                    ) : (
                                        <Wallet className="h-3 w-3 text-primary" />
                                    )}
                                    {activeTab === "INCOME"
                                        ? "Cuenta destino"
                                        : "Cuenta de origen"}
                                </span>
                                {currentAccount && (
                                    <span className="tabular-nums normal-case font-bold truncate">
                                        {isCreditCard ? "Disp: " : "Saldo: "}
                                        <span className="text-foreground">
                                            {formatMoney(
                                                currentBalance,
                                                currentAccount.currencyCode
                                            )}
                                        </span>
                                        {numericAmount > 0 && (
                                            <>
                                                {" → "}
                                                <span
                                                    className={cn(
                                                        "font-black",
                                                        projectedBalance < 0
                                                            ? "text-rose-500"
                                                            : "text-primary"
                                                    )}
                                                >
                                                    {formatMoney(
                                                        projectedBalance,
                                                        currentAccount.currencyCode
                                                    )}
                                                </span>
                                                {isCreditCard && projectedBalance < 0 && (
                                                    <span className="ml-1.5 text-[10px] font-black text-rose-500">
                                                        (Excede límite)
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>

                            {accounts.length === 0 ? (
                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-foreground">
                                            Aún no tienes cuentas creadas
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Crea tu primera cuenta (Efectivo o Banco) para registrar movimientos.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onOpenChange(false)
                                            router.push("/dashboard/accounts")
                                        }}
                                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Crear cuenta
                                    </button>
                                </div>
                            ) : (
                            <>
                            {/* Mobile: touch-friendly horizontal pills */}
                            <div className="flex md:hidden gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                {accounts.map((acc) => {
                                    const selected = accountId === acc.id
                                    return (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => onAccountSelect(acc.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 shrink-0",
                                                selected
                                                    ? accent.pill
                                                    : "bg-muted/40 text-foreground/85 border-border/60 hover:bg-muted"
                                            )}
                                        >
                                            {formatAccountPillName(acc.name, acc.currencyCode)}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Desktop: clean full-width dropdown showing ALL accounts + live balances */}
                            <div className="hidden md:block">
                                <Select
                                    open={accountSelectOpen}
                                    onOpenChange={setAccountSelectOpen}
                                    value={accountId}
                                    onValueChange={onAccountSelect}
                                >
                                    <SelectTrigger className="w-full h-11 rounded-2xl bg-muted/40 border-border/60 px-3.5 text-xs font-bold hover:bg-muted/70 transition-colors">
                                        <SelectValue placeholder="Selecciona una cuenta">
                                            {currentAccount && (
                                                <div className="flex items-center justify-between gap-2 w-full pr-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: currentAccount.color || "#7c3aed" }}
                                                        />
                                                        {isCreditCard ? (
                                                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        ) : (
                                                            <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className="truncate font-bold text-foreground">
                                                            {formatAccountPillName(currentAccount.name, currentAccount.currencyCode)}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                                                        {isCreditCard ? "Disp: " : ""}
                                                        {formatMoney(currentBalance, currentAccount.currencyCode)}
                                                    </span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl max-h-64 min-w-[var(--radix-select-trigger-width)]">
                                        {accounts.map((acc) => {
                                            const accIsCard = acc.accountType === "CREDIT_CARD"
                                            const accBal = accIsCard
                                                ? Math.max(0, Number(acc.creditLimit || 0) - Math.abs(Number(acc.usedBalance || 0)))
                                                : Number(acc.currentBalance ?? acc.balance ?? 0)
                                            return (
                                                <SelectItem key={acc.id} value={acc.id} className="rounded-xl py-2 text-xs">
                                                    <div className="flex items-center justify-between gap-3 w-full">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: acc.color || "#7c3aed" }}
                                                            />
                                                            {accIsCard ? (
                                                                <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                                                            ) : (
                                                                <Wallet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            )}
                                                            <span className="font-bold truncate">
                                                                {formatAccountPillName(acc.name, acc.currencyCode)}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                                                            {accIsCard ? "Disp: " : ""}
                                                            {formatMoney(accBal, acc.currencyCode)}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            </>
                            )}

                            {isTransferToCard && transferToAccount && (
                                <div className="flex items-center justify-between rounded-xl bg-primary/8 border border-primary/20 px-3 py-1.5 text-[11px] font-bold">
                                    <span className="text-primary flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                        Pago a tarjeta de crédito
                                    </span>
                                    <span className="tabular-nums text-foreground">
                                        Deuda: {formatMoney(destCardUsed, transferToAccount.currencyCode)}
                                        {numericAmount > 0 && (
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                {" → "}
                                                {formatMoney(destCardProjectedDebt, transferToAccount.currencyCode)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Calculator Display */}
                        <div className="rounded-2xl bg-muted/50 border border-border/50 px-4 py-3 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={calcClear}
                                className="px-2.5 py-1 rounded-xl bg-card border border-border/60 text-xs font-black text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                            >
                                C
                            </button>
                            <div className="text-right min-w-0 flex-1">
                                {hasOperator && (
                                    <div className="text-[11px] font-bold text-muted-foreground tabular-nums truncate">
                                        {calcDisplay} =
                                    </div>
                                )}
                                <div className="flex items-baseline justify-end gap-1.5">
                                    <span className="text-xl font-bold text-muted-foreground">
                                        {currencySymbol}
                                    </span>
                                    <span className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-foreground truncate">
                                        {hasOperator
                                            ? safeEvaluate(calcDisplay)
                                            : calcDisplay}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sleek 4x4 Calculator Grid */}
                        <div className="grid grid-cols-4 gap-2">
                            {calcKeys.map((k) => (
                                <button
                                    key={k.value}
                                    type="button"
                                    onClick={() => {
                                        if (k.value === "DEL") calcBackspace()
                                        else calcAppend(k.value)
                                    }}
                                    className={cn(
                                        "h-11 sm:h-12 rounded-2xl text-lg font-extrabold flex items-center justify-center transition-all active:scale-95",
                                        k.kind === "num" &&
                                            "bg-muted/55 hover:bg-muted text-foreground",
                                        k.kind === "op" &&
                                            "bg-primary/10 hover:bg-primary/20 text-primary",
                                        k.kind === "action" &&
                                            "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                                    )}
                                >
                                    {k.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Pinned Instant Action Bar inside Sheet */}
                    <div className="px-4 sm:px-5 py-3 pb-safe border-t border-border/50 bg-card flex items-center gap-2 shrink-0">
                        {/* Close to edit advanced fields (notes, recurrence, attachments) */}
                        <button
                            type="button"
                            onClick={() => {
                                calcEvaluateNow()
                                onOpenChange(false)
                            }}
                            title="Más opciones (notas, recurrencia, adjunto)"
                            className="h-12 w-12 rounded-2xl bg-muted/60 hover:bg-muted border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </button>

                        {/* Save & Create Another */}
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSafeSubmit(true)}
                            title="Guardar y crear otra"
                            className="h-12 px-3.5 rounded-2xl bg-card hover:bg-muted border border-border/70 text-xs font-extrabold text-foreground transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1 shrink-0"
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                            <span className="hidden sm:inline">Otra</span>
                        </button>

                        {/* Primary Complete CTA */}
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => {
                                if (hasOperator) {
                                    calcEvaluateNow()
                                } else {
                                    handleSafeSubmit(false)
                                }
                            }}
                            className={cn(
                                "flex-1 h-12 rounded-2xl font-black text-sm sm:text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2",
                                accent.btn
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : hasOperator ? (
                                <span>Calcular (=)</span>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    <span>Agregar transacción</span>
                                </>
                            )}
                        </button>
                    </div>
                    </>
                )}
            </div>
        </div>
    )
}
