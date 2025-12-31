"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    FormControl,
    FormField,
} from "@/components/ui/form"
import {
    CalendarIcon,
    FileText,
    Wallet,
    Tag,
    Paperclip,
    Loader2,
    CheckCircle2,
    Plus,
    Receipt,
    Calculator,
    Building2,
    Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { CategoryGrid } from "@/components/transactions/category-selector"
import { SmartCalculator } from "@/components/transactions/v2/smart-calculator"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { RECEIPT_TYPES } from "./use-petty-cash-expense-form"
import { Calendar } from "@/components/ui/calendar"

interface ExpenseBaseLayerProps {
    form: any
    funds: any[]
    categories: any[]
    selectedFund: any
    selectedCategory: any
    calculatedTotal: number
    insufficientFunds: boolean
    isUploading: boolean
    onUploadFile: (file: File) => void
    // Sheet states
    isFundSheetOpen: boolean
    setIsFundSheetOpen: (v: boolean) => void
    isCategorySheetOpen: boolean
    setIsCategorySheetOpen: (v: boolean) => void
    isReceiptTypeSheetOpen: boolean
    setIsReceiptTypeSheetOpen: (v: boolean) => void
    isDateSheetOpen: boolean
    setIsDateSheetOpen: (v: boolean) => void
}

export function ExpenseBaseLayer({
    form,
    funds,
    categories,
    selectedFund,
    selectedCategory,
    calculatedTotal,
    insufficientFunds,
    isUploading,
    onUploadFile,
    isFundSheetOpen,
    setIsFundSheetOpen,
    isCategorySheetOpen,
    setIsCategorySheetOpen,
    isReceiptTypeSheetOpen,
    setIsReceiptTypeSheetOpen,
    isDateSheetOpen,
    setIsDateSheetOpen
}: ExpenseBaseLayerProps) {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const currentAmount = form.watch("amount")
    const attachmentUrl = form.watch("attachmentUrl")
    const receiptType = form.watch("receiptType")
    const expenseDate = form.watch("expenseDate") || new Date()

    const receiptTypeInfo = RECEIPT_TYPES.find(r => r.value === receiptType)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onUploadFile(file)
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-transparent p-4 lg:p-6 select-none animate-in fade-in zoom-in-95 duration-500 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6">

                    {/* 1. Main Card - Orange theme for Petty Cash */}
                    <div className="relative group perspective-1000">
                        <div className="absolute -inset-1 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-gradient-to-br from-orange-500 to-amber-600"></div>
                        <div className="relative h-[280px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 transition-colors duration-500 bg-gradient-to-br from-orange-500 to-amber-600">

                            {/* Fund Selector at Top */}
                            <button
                                type="button"
                                onClick={() => setIsFundSheetOpen(true)}
                                className="flex items-center justify-between p-4 mx-4 mt-4 bg-white/10 backdrop-blur-md rounded-2xl hover:bg-white/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Fondo</span>
                                        <span className="text-sm font-bold text-white">
                                            {selectedFund?.fundCode || "Seleccionar fondo"}
                                        </span>
                                    </div>
                                </div>
                                {selectedFund && (
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">Disponible</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            insufficientFunds ? "text-red-300 animate-pulse" : "text-emerald-300"
                                        )}>
                                            S/ {Number(selectedFund.currentBalance).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Main Content Area */}
                            <div className="flex-1 flex px-12 items-center justify-between">
                                {/* Category Icon - Trigger Sheet */}
                                <button
                                    type="button"
                                    onClick={() => setIsCategorySheetOpen(true)}
                                    className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-white shadow-inner border border-white/10 hover:scale-105 active:scale-95 transition-all duration-300 group/icon"
                                >
                                    <CategoryIcon
                                        name={selectedCategory?.icon || "receipt"}
                                        className="w-14 h-14 drop-shadow-lg group-hover/icon:rotate-12 transition-transform"
                                    />
                                </button>

                                {/* Amount & Category Name */}
                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-white/40">S/</span>
                                        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                                            <DialogTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="text-[4.5rem] font-black text-white tracking-tighter tabular-nums drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform outline-none active:opacity-80"
                                                >
                                                    {receiptType === 'FACTURA'
                                                        ? calculatedTotal.toFixed(2)
                                                        : (currentAmount || "0")}
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none">
                                                <DialogTitle className="sr-only">Calculadora</DialogTitle>
                                                <SmartCalculator
                                                    initialValue={currentAmount || "0"}
                                                    onConfirm={(val) => {
                                                        if (receiptType === 'FACTURA') {
                                                            // For factura, calculate base from total
                                                            const total = parseFloat(val)
                                                            const taxRate = parseFloat(form.getValues('taxRate') || '18') / 100
                                                            const base = total / (1 + taxRate)
                                                            form.setValue("taxableAmount", base.toFixed(2))
                                                        } else {
                                                            form.setValue("amount", val)
                                                        }
                                                    }}
                                                    onClose={() => setIsCalculatorOpen(false)}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCategorySheetOpen(true)}
                                        className="text-xl font-black text-white/90 tracking-tight capitalize hover:underline underline-offset-4 decoration-white/30"
                                    >
                                        {selectedCategory?.name || "Categoría..."}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Compact Input Stack */}
                    <div className="flex flex-col gap-2">
                        {/* Description */}
                        <div className="bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-orange-200 transition-all shadow-sm">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="Descripción / Glosa"
                                        autoComplete="off"
                                        className="h-full border-0 bg-transparent text-base font-bold placeholder:text-slate-300 focus-visible:ring-0 p-0 shadow-none"
                                    />
                                )}
                            />
                        </div>

                        {/* Vendor */}
                        <div className="bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-orange-200 transition-all shadow-sm">
                            <Building2 className="w-5 h-5 text-slate-400" />
                            <FormField
                                control={form.control}
                                name="vendor"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="Proveedor / RUC"
                                        className="h-full border-0 bg-transparent text-base font-bold placeholder:text-slate-300 focus-visible:ring-0 p-0 shadow-none"
                                    />
                                )}
                            />
                        </div>

                        {/* Attachment */}
                        <div
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={cn(
                                "bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-orange-200 transition-all shadow-sm group/attach cursor-pointer",
                                isUploading && "opacity-50 pointer-events-none"
                            )}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,application/pdf"
                            />
                            {isUploading ? (
                                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                            ) : attachmentUrl ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <Paperclip className="w-5 h-5 text-slate-400 group-hover/attach:text-orange-500 transition-colors" />
                            )}
                            <span className={cn(
                                "flex-1 text-sm font-bold transition-colors",
                                attachmentUrl ? "text-emerald-600" : "text-slate-400 group-hover/attach:text-slate-600"
                            )}>
                                {isUploading ? "Subiendo a Google Drive..." : attachmentUrl ? "Comprobante en Drive" : "Adjuntar comprobante"}
                            </span>
                            {attachmentUrl && !isUploading ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-500"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        form.setValue("attachmentUrl", "")
                                        if (fileInputRef.current) fileInputRef.current.value = ""
                                    }}
                                >
                                    Eliminar
                                </Button>
                            ) : (
                                <Plus className="w-4 h-4 text-slate-400 group-hover/attach:text-orange-500 transition-colors" />
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-4">

                    {/* 1. Date Header */}
                    <div className="flex items-center justify-between px-2">
                        <button
                            type="button"
                            onClick={() => setIsDateSheetOpen(true)}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-xl flex items-center justify-center text-orange-600 shadow-sm group-hover:bg-orange-200 transition-colors">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha Emisión</span>
                                <span className="text-xl font-black text-slate-800 dark:text-white capitalize tracking-tighter leading-none">
                                    {format(new Date(), "yyyy-MM-dd") === format(expenseDate, "yyyy-MM-dd")
                                        ? "Hoy"
                                        : format(expenseDate, "d MMM yyyy", { locale: es })}
                                </span>
                            </div>
                        </button>
                    </div>

                    <div className="h-px bg-slate-200/60 dark:bg-zinc-800 w-full" />

                    {/* 2. Receipt Type Selector */}
                    <div className="space-y-2 px-1">
                        <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Tipo de Comprobante
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {RECEIPT_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => form.setValue("receiptType", type.value)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl text-[11px] font-bold border transition-all duration-300 flex items-center gap-2",
                                        receiptType === type.value
                                            ? `${type.color} text-white border-transparent shadow-md transform scale-105`
                                            : "bg-white dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-zinc-800 hover:border-orange-300"
                                    )}
                                >
                                    <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-[9px] font-black">
                                        {type.shortcut}
                                    </span>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Receipt Number */}
                    <div className="px-1">
                        <FormField
                            control={form.control}
                            name="receiptNumber"
                            render={({ field }) => (
                                <div className="bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-orange-200 transition-all shadow-sm">
                                    <Tag className="w-5 h-5 text-slate-400" />
                                    <Input
                                        {...field}
                                        placeholder="Nº Serie-Correlativo (F001-000001)"
                                        className="h-full border-0 bg-transparent text-base font-mono font-bold placeholder:text-slate-300 focus-visible:ring-0 p-0 shadow-none uppercase tracking-wider"
                                    />
                                </div>
                            )}
                        />
                    </div>

                    {/* FACTURA Tax Calculation */}
                    {receiptType === 'FACTURA' && (
                        <div className="mx-1 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-4 space-y-3 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                    Cálculo Fiscal - Factura
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="taxableAmount"
                                    render={({ field }) => (
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Base Imponible</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="h-12 rounded-xl border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-lg font-bold"
                                                {...field}
                                            />
                                        </div>
                                    )}
                                />
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">IGV (18%)</span>
                                    <div className="h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center px-4">
                                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                            S/ {form.watch("taxAmount") || "0.00"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-600 dark:bg-emerald-700 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-100 uppercase">Total</span>
                                <span className="text-2xl font-black text-white">
                                    S/ {calculatedTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Simple Amount (non-FACTURA) */}
                    {receiptType !== 'FACTURA' && (
                        <div className="px-1">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                    Monto Total
                                </span>
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <span className="text-xl font-black text-orange-500">S/</span>
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                className="h-16 pl-12 rounded-2xl border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20 text-3xl font-black text-orange-600 dark:text-orange-400 focus:ring-4 focus:ring-orange-100"
                                                {...field}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Insufficient Funds Warning */}
                    {insufficientFunds && (
                        <div className="mx-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-3 animate-in shake">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-black text-sm">!</span>
                            </div>
                            <div>
                                <span className="text-sm font-bold text-red-700 dark:text-red-400">
                                    Saldo insuficiente
                                </span>
                                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                                    El monto excede el disponible en el fondo
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- BOTTOM SHEETS --- */}

            {/* Fund Selection Sheet */}
            <Sheet open={isFundSheetOpen} onOpenChange={setIsFundSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[50vh] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
                    <div className="h-full flex flex-col relative">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none z-50">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-3">
                            <SheetTitle className="text-xl font-bold text-slate-800 dark:text-white">Seleccionar Fondo</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {funds?.map((fund: any) => (
                                    <button
                                        key={fund.id}
                                        type="button"
                                        onClick={() => {
                                            form.setValue("fundId", fund.id)
                                            setIsFundSheetOpen(false)
                                        }}
                                        className={cn(
                                            "flex flex-col items-start gap-1 p-4 rounded-2xl transition-all duration-200 border-2 text-left",
                                            form.watch("fundId") === fund.id
                                                ? "bg-orange-500 border-orange-500 text-white shadow-lg"
                                                : "bg-slate-50 dark:bg-zinc-900 border-transparent hover:border-orange-200 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <span className="font-black text-sm">{fund.fundCode}</span>
                                        <span className={cn(
                                            "text-xs",
                                            form.watch("fundId") === fund.id ? "text-white/70" : "text-slate-500"
                                        )}>
                                            {fund.fundName}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-bold mt-1",
                                            form.watch("fundId") === fund.id ? "text-emerald-200" : "text-emerald-600"
                                        )}>
                                            Disponible: S/ {Number(fund.currentBalance).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Category Selection Sheet */}
            <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
                <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-[20px] flex flex-col border-0 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none z-50">
                        <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                    </div>
                    <SheetHeader className="px-6 pt-6 pb-3">
                        <SheetTitle className="text-xl font-bold text-slate-800 dark:text-white">Seleccionar Categoría</SheetTitle>
                        <SheetDescription className="sr-only">Busca o elige una categoría para este gasto</SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-hidden">
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
                    </div>
                </SheetContent>
            </Sheet>

            {/* Date Selection Sheet */}
            <Sheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-[2rem] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl">
                    <div className="h-full flex flex-col relative pb-6">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-2">
                            <SheetTitle className="text-xl font-bold">Fecha de Emisión</SheetTitle>
                        </SheetHeader>
                        <div className="px-4 flex justify-center">
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
                                className="rounded-xl border shadow-sm"
                            />
                        </div>
                        <div className="px-6 pt-4 flex justify-center">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    form.setValue("expenseDate", new Date())
                                    setIsDateSheetOpen(false)
                                }}
                                className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            >
                                Seleccionar Hoy
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
