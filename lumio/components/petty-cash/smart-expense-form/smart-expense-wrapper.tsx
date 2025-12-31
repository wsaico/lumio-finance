"use client"

import { usePettyCashExpenseForm, RECEIPT_TYPES, PERU_TAX_RATES, COMMON_VENDORS } from "./use-petty-cash-expense-form"
import { Form, FormField, FormControl } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { CategoryGrid } from "@/components/transactions/category-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Loader2,
    Receipt,
    ArrowLeft,
    Camera,
    Upload,
    Sparkles,
    CheckCircle2,
    Wallet,
    Tag,
    Building2,
    CalendarIcon,
    Calculator,
    ChevronRight,
    X,
    Zap,
    FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SmartCalculator } from "@/components/transactions/v2/smart-calculator"

interface SmartExpenseWrapperProps {
    defaultFundId?: string
    onSuccess?: () => void
}

export function SmartExpenseWrapper({ defaultFundId, onSuccess }: SmartExpenseWrapperProps) {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const descriptionInputRef = useRef<HTMLInputElement>(null)

    const {
        form,
        funds,
        categories,
        loadingCategories,
        recentVendors,
        selectedFund,
        selectedCategory,
        suggestions,
        calculatedTotal,
        insufficientFunds,
        isLoading,
        isUploading,
        isScanning,
        enableAIReceiptScanning,
        step,
        setStep,
        onSubmit,
        scanReceipt,
        fillFromVendor,
    } = usePettyCashExpenseForm(defaultFundId, onSuccess)

    // Sheet states
    const [isFundSheetOpen, setIsFundSheetOpen] = useState(false)
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)
    const [isVendorSheetOpen, setIsVendorSheetOpen] = useState(false)
    const [isDateSheetOpen, setIsDateSheetOpen] = useState(false)
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

    const isSubmitting = form.formState.isSubmitting
    const receiptType = form.watch("receiptType")
    const taxRate = form.watch("taxRate")
    const attachmentUrl = form.watch("attachmentUrl")
    const expenseDate = form.watch("expenseDate") || new Date()
    const description = form.watch("description")
    const amount = form.watch("amount")

    // Auto-focus description on wizard
    useEffect(() => {
        if (step === 'wizard' && descriptionInputRef.current) {
            setTimeout(() => descriptionInputRef.current?.focus(), 100)
        }
    }, [step])

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) scanReceipt(file)
    }

    // Handle paste for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile()
                if (file) scanReceipt(file)
                break
            }
        }
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 lg:p-8"
            onPaste={handlePaste}
        >
            <div className="w-full h-full lg:max-w-2xl lg:max-h-[90vh] lg:h-auto lg:rounded-3xl bg-white dark:bg-zinc-950 flex flex-col overflow-hidden lg:shadow-2xl safe-area-inset">
                {/* Compact Header - Mobile optimized */}
                <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-border/40 lg:rounded-t-3xl px-4 py-3 flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="shrink-0 rounded-full w-10 h-10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate">Nuevo Gasto</h1>
                        {selectedFund && (
                            <p className="text-xs text-muted-foreground truncate">
                                {selectedFund.fundCode} • S/ {Number(selectedFund.currentBalance).toFixed(2)}
                            </p>
                        )}
                    </div>

                    {/* Quick scan button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning || isUploading}
                        className="shrink-0 rounded-full w-10 h-10"
                    >
                        {isScanning ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Camera className="w-5 h-5" />
                        )}
                    </Button>

                    {/* Close button - visible on desktop */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="hidden lg:flex shrink-0 rounded-full w-10 h-10 hover:bg-red-100 hover:text-red-600"
                    >
                        <X className="w-5 h-5" />
                    </Button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,application/pdf"
                        capture="environment"
                        onChange={handleFileChange}
                    />
                </div>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        {/* Main Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto lg:max-h-[calc(90vh-180px)]">

                            {/* WIZARD STEP */}
                            {step === 'wizard' && (
                                <div className="p-4 space-y-4 animate-in fade-in duration-300">

                                    {/* Smart Scan Zone */}
                                    <div
                                        className={cn(
                                            "relative rounded-2xl border-2 border-dashed transition-all p-4",
                                            isScanning || isUploading
                                                ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                                                : attachmentUrl
                                                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                                                    : "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
                                        )}
                                        onClick={() => !isScanning && !isUploading && fileInputRef.current?.click()}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                                                attachmentUrl
                                                    ? "bg-emerald-500 text-white"
                                                    : "bg-orange-100 dark:bg-orange-900/50 text-orange-600"
                                            )}>
                                                {isScanning ? (
                                                    <Loader2 className="w-7 h-7 animate-spin" />
                                                ) : isUploading ? (
                                                    <Upload className="w-7 h-7 animate-bounce" />
                                                ) : attachmentUrl ? (
                                                    <CheckCircle2 className="w-7 h-7" />
                                                ) : enableAIReceiptScanning ? (
                                                    <Sparkles className="w-7 h-7" />
                                                ) : (
                                                    <Camera className="w-7 h-7" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm">
                                                    {isScanning ? "Analizando con IA..." :
                                                        isUploading ? "Subiendo a Drive..." :
                                                            attachmentUrl ? "Comprobante adjunto" :
                                                                "Escanear comprobante"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {attachmentUrl ? "Toca para cambiar" : "Foto o PDF • Ctrl+V para pegar"}
                                                </p>
                                            </div>
                                            {enableAIReceiptScanning && !attachmentUrl && (
                                                <span className="px-2 py-1 bg-orange-200 dark:bg-orange-800 rounded-full text-[10px] font-bold text-orange-700 dark:text-orange-200">
                                                    IA
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description Input - Large & Prominent */}
                                    <div className="space-y-2">
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <Input
                                                    {...field}
                                                    ref={descriptionInputRef}
                                                    placeholder="¿En qué gastaste?"
                                                    className="h-14 text-lg font-semibold rounded-2xl bg-slate-100 dark:bg-zinc-900 border-0 px-5"
                                                    autoComplete="off"
                                                />
                                            )}
                                        />

                                        {/* Smart Suggestion Chip */}
                                        {suggestions && (
                                            <div className="flex items-center gap-2 px-1 animate-in slide-in-from-top-2">
                                                <Zap className="w-4 h-4 text-amber-500" />
                                                <span className="text-xs text-muted-foreground">Sugerencia:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (suggestions.categoryId) form.setValue('categoryId', suggestions.categoryId)
                                                        if (suggestions.subcategoryId) form.setValue('subcategoryId', suggestions.subcategoryId)
                                                        if (suggestions.vendor) form.setValue('vendor', suggestions.vendor)
                                                        if (suggestions.receiptType) form.setValue('receiptType', suggestions.receiptType as any)
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium hover:bg-amber-200 transition-colors"
                                                >
                                                    <CategoryIcon name={suggestions.categoryIcon || 'tag'} className="w-3 h-3" />
                                                    {suggestions.categoryName}
                                                    {suggestions.vendor && ` • ${suggestions.vendor}`}
                                                </button>
                                            </div>
                                        )}

                                        {/* Manual Category Selector Button */}
                                        <button
                                            type="button"
                                            onClick={() => setIsCategorySheetOpen(true)}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-orange-200 transition-all"
                                        >
                                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600">
                                                <Tag className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    Categoría
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {selectedCategory?.name || "Seleccionar categoría"}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>

                                    {/* Quick Vendor Selection */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                            Proveedor frecuente
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {/* Recent vendors first */}
                                            {recentVendors.slice(0, 4).map((v: any) => (
                                                <button
                                                    key={v.vendor}
                                                    type="button"
                                                    onClick={() => fillFromVendor(v.vendor)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                                                        form.watch('vendor') === v.vendor
                                                            ? "bg-orange-500 border-orange-500 text-white"
                                                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                                                    )}
                                                >
                                                    {v.vendor}
                                                    <span className="ml-1 opacity-50">({v.count})</span>
                                                </button>
                                            ))}
                                            {/* Common vendors */}
                                            {COMMON_VENDORS.slice(0, 6 - recentVendors.length).map((vendor) => (
                                                <button
                                                    key={vendor.name}
                                                    type="button"
                                                    onClick={() => fillFromVendor(vendor.name)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                                                        form.watch('vendor') === vendor.name
                                                            ? "bg-orange-500 border-orange-500 text-white"
                                                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                                                    )}
                                                >
                                                    {vendor.name}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setIsVendorSheetOpen(true)}
                                                className="px-3 py-2 rounded-xl text-xs font-medium border border-dashed border-slate-300 dark:border-zinc-700 text-muted-foreground"
                                            >
                                                Otro...
                                            </button>
                                        </div>
                                    </div>

                                    {/* Fund Selector (always show if funds exist) */}
                                    {funds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsFundSheetOpen(true)}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-zinc-900 border border-transparent hover:border-orange-200 transition-all"
                                        >
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                                                <Wallet className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-bold text-sm">
                                                    {selectedFund?.fundCode || "Seleccionar fondo"}
                                                </p>
                                                {selectedFund && (
                                                    <p className={cn(
                                                        "text-xs font-medium",
                                                        insufficientFunds ? "text-red-500" : "text-emerald-600"
                                                    )}>
                                                        Disponible: S/ {Number(selectedFund.currentBalance).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* DETAILS STEP */}
                            {step === 'details' && (
                                <div className="p-4 space-y-4 animate-in fade-in duration-300">

                                    {/* Amount Card */}
                                    <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-6 text-white">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-5 h-5 opacity-70" />
                                                <span className="text-sm font-medium opacity-70">Monto Total</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsDateSheetOpen(true)}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-medium"
                                            >
                                                <CalendarIcon className="w-3 h-3" />
                                                {format(expenseDate, "d MMM", { locale: es })}
                                            </button>
                                        </div>

                                        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                                            <button
                                                type="button"
                                                onClick={() => setIsCalculatorOpen(true)}
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-medium opacity-60">S/</span>
                                                    <span className="text-5xl font-black tabular-nums">
                                                        {receiptType === 'FACTURA'
                                                            ? calculatedTotal.toFixed(2)
                                                            : (amount || "0.00")}
                                                    </span>
                                                </div>
                                            </button>
                                            <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none max-w-[95vw]">
                                                <DialogTitle className="sr-only">Calculadora</DialogTitle>
                                                <SmartCalculator
                                                    initialValue={receiptType === 'FACTURA' ? calculatedTotal.toString() : (amount || "0")}
                                                    onConfirm={(val) => {
                                                        if (receiptType === 'FACTURA') {
                                                            const total = parseFloat(val)
                                                            const rate = parseFloat(taxRate || '18') / 100
                                                            const base = total / (1 + rate)
                                                            form.setValue("taxableAmount", base.toFixed(2))
                                                        } else {
                                                            form.setValue("amount", val)
                                                        }
                                                    }}
                                                    onClose={() => setIsCalculatorOpen(false)}
                                                />
                                            </DialogContent>
                                        </Dialog>

                                        {/* Category & Vendor Summary */}
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
                                            <button
                                                type="button"
                                                onClick={() => setIsCategorySheetOpen(true)}
                                                className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-xl text-sm font-medium"
                                            >
                                                <CategoryIcon name={selectedCategory?.icon || 'tag'} className="w-4 h-4" />
                                                {selectedCategory?.name || "Categoría"}
                                            </button>
                                            <span className="opacity-50">•</span>
                                            <span className="text-sm opacity-80 truncate">
                                                {form.watch('vendor') || "Sin proveedor"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Receipt Type Selector */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                            Tipo de comprobante
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {RECEIPT_TYPES.map(type => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => form.setValue("receiptType", type.value as any)}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                                                        receiptType === type.value
                                                            ? `${type.color} border-transparent text-white`
                                                            : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-lg font-black",
                                                        receiptType !== type.value && "text-slate-400"
                                                    )}>
                                                        {type.shortcut}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-medium",
                                                        receiptType !== type.value && "text-muted-foreground"
                                                    )}>
                                                        {type.label}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Receipt Number */}
                                    <FormField
                                        control={form.control}
                                        name="receiptNumber"
                                        render={({ field }) => (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                                    Nº Comprobante
                                                </p>
                                                <Input
                                                    {...field}
                                                    placeholder="F001-00000123"
                                                    className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 border-0 font-mono uppercase tracking-wider"
                                                />
                                            </div>
                                        )}
                                    />

                                    {/* FACTURA Tax Calculation */}
                                    {receiptType === 'FACTURA' && (
                                        <div className="space-y-3 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
                                            <div className="flex items-center gap-2">
                                                <Calculator className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                                                    Cálculo IGV
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <FormField
                                                    control={form.control}
                                                    name="taxableAmount"
                                                    render={({ field }) => (
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Base</span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                className="h-11 rounded-xl border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-lg font-bold"
                                                                {...field}
                                                            />
                                                        </div>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="taxRate"
                                                    render={({ field }) => (
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Tasa IGV</span>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger className="h-11 rounded-xl border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 font-bold">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {PERU_TAX_RATES.map(rate => (
                                                                        <SelectItem key={rate.value} value={rate.value}>
                                                                            <div className="flex flex-col">
                                                                                <span className="font-bold">{rate.label}</span>
                                                                                <span className="text-[10px] text-muted-foreground">{rate.description}</span>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">IGV</span>
                                                    <p className="text-lg font-bold text-emerald-600">
                                                        S/ {form.watch("taxAmount") || "0.00"}
                                                    </p>
                                                </div>
                                                <div className="bg-emerald-600 rounded-xl p-3 text-white">
                                                    <span className="text-[10px] font-bold opacity-70 uppercase">Total</span>
                                                    <p className="text-lg font-black">
                                                        S/ {calculatedTotal.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Simple Amount (non-FACTURA) */}
                                    {receiptType !== 'FACTURA' && (
                                        <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                                        Monto
                                                    </p>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-orange-500">S/</span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            className="h-14 pl-12 rounded-xl bg-slate-100 dark:bg-zinc-900 border-0 text-2xl font-black text-orange-600"
                                                            {...field}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    )}

                                    {/* Justification */}
                                    <FormField
                                        control={form.control}
                                        name="justification"
                                        render={({ field }) => (
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                                    Justificación <span className="text-slate-400">(opcional)</span>
                                                </p>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Motivo del gasto..."
                                                    className="min-h-[80px] rounded-xl bg-slate-100 dark:bg-zinc-900 border-0 resize-none"
                                                />
                                            </div>
                                        )}
                                    />

                                    {/* Insufficient Funds Warning */}
                                    {insufficientFunds && (
                                        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800 animate-in shake">
                                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                                                <X className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-red-700 dark:text-red-400 text-sm">Saldo insuficiente</p>
                                                <p className="text-xs text-red-600/70">El monto excede el disponible</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Action Bar - Fixed */}
                        <div className="sticky bottom-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-border/40 lg:rounded-b-3xl p-4 safe-area-bottom">
                            {step === 'wizard' ? (
                                <Button
                                    type="button"
                                    onClick={() => setStep('details')}
                                    disabled={!description}
                                    className="w-full h-14 rounded-2xl text-lg font-bold bg-orange-500 hover:bg-orange-600"
                                >
                                    Continuar
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStep('wizard')}
                                        className="h-14 px-6 rounded-2xl"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || isLoading || insufficientFunds || !form.watch('fundId')}
                                        className={cn(
                                            "flex-1 h-14 rounded-2xl text-lg font-bold transition-all",
                                            insufficientFunds
                                                ? "bg-red-100 text-red-500"
                                                : "bg-orange-500 hover:bg-orange-600"
                                        )}
                                    >
                                        {isSubmitting || isLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Receipt className="w-5 h-5 mr-2" />
                                                Registrar S/ {calculatedTotal.toFixed(2)}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </form>
                </Form>

                {/* SHEETS */}

                {/* Fund Sheet */}
                <Sheet open={isFundSheetOpen} onOpenChange={setIsFundSheetOpen}>
                    <SheetContent side="bottom" className="rounded-t-3xl max-h-[60vh] p-0 sm:max-w-md sm:mx-auto sm:rounded-xl sm:bottom-4">
                        <SheetHeader className="p-4 pb-2">
                            <SheetTitle>Seleccionar Fondo</SheetTitle>
                        </SheetHeader>
                        <div className="p-4 pt-0 space-y-2 overflow-y-auto max-h-[50vh]">
                            {funds.map((fund: any) => (
                                <button
                                    key={fund.id}
                                    type="button"
                                    onClick={() => {
                                        form.setValue("fundId", fund.id)
                                        setIsFundSheetOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                                        form.watch("fundId") === fund.id
                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                            : "border-transparent bg-slate-100 dark:bg-zinc-900"
                                    )}
                                >
                                    <Wallet className="w-6 h-6 text-orange-500" />
                                    <div className="flex-1">
                                        <p className="font-bold">{fund.fundCode}</p>
                                        <p className="text-xs text-muted-foreground">{fund.fundName}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600">
                                            S/ {Number(fund.currentBalance).toFixed(2)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Category Sheet */}
                <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
                    <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] p-0 flex flex-col bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden border-0 sm:max-w-md sm:mx-auto sm:rounded-xl sm:h-[80vh] sm:bottom-4">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none z-50">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="p-6 pb-2">
                            <SheetTitle className="text-xl font-bold">Seleccionar Categoría</SheetTitle>
                            <SheetDescription className="sr-only">Explora y busca categorías para tu gasto</SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-hidden">
                            {loadingCategories ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                </div>
                            ) : (
                                <CategoryGrid
                                    categories={categories}
                                    categoryId={form.watch('categoryId')}
                                    subcategoryId={form.watch('subcategoryId')}
                                    enableTabs={true}
                                    onSelect={(catId, subId) => {
                                        form.setValue('categoryId', catId)
                                        form.setValue('subcategoryId', subId || "")
                                        setIsCategorySheetOpen(false)
                                    }}
                                />
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Vendor Sheet */}
                <Sheet open={isVendorSheetOpen} onOpenChange={setIsVendorSheetOpen}>
                    <SheetContent side="bottom" className="rounded-t-3xl p-0 sm:max-w-md sm:mx-auto sm:rounded-xl sm:bottom-4">
                        <SheetHeader className="p-4 pb-2">
                            <SheetTitle>Proveedor</SheetTitle>
                        </SheetHeader>
                        <div className="p-4 pt-0 space-y-4">
                            <FormField
                                control={form.control}
                                name="vendor"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="Nombre o RUC del proveedor"
                                        className="h-12 rounded-xl"
                                        autoFocus
                                    />
                                )}
                            />
                            <div className="grid grid-cols-3 gap-2">
                                {COMMON_VENDORS.map((vendor) => (
                                    <button
                                        key={vendor.name}
                                        type="button"
                                        onClick={() => {
                                            fillFromVendor(vendor.name)
                                            setIsVendorSheetOpen(false)
                                        }}
                                        className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 text-sm font-medium"
                                    >
                                        {vendor.name}
                                    </button>
                                ))}
                            </div>
                            <Button
                                className="w-full h-12 rounded-xl"
                                onClick={() => setIsVendorSheetOpen(false)}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Date Sheet */}
                <Sheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen}>
                    <SheetContent side="bottom" className="rounded-t-3xl p-0 sm:max-w-md sm:mx-auto sm:rounded-xl sm:bottom-4">
                        <SheetHeader className="p-4 pb-2">
                            <SheetTitle>Fecha de Emisión</SheetTitle>
                        </SheetHeader>
                        <div className="flex justify-center pb-4">
                            <Calendar
                                mode="single"
                                selected={expenseDate}
                                onSelect={(date) => {
                                    if (date) {
                                        form.setValue("expenseDate", date)
                                        setIsDateSheetOpen(false)
                                    }
                                }}
                                locale={es}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    )
}
