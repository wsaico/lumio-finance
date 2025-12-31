"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    FormControl,
    FormField,
} from "@/components/ui/form"
import {
    CalendarIcon,
    X,
    FileText,
    Sparkles,
    Upload,
    Loader2,
    CheckCircle2,
    Receipt
} from "lucide-react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { COMMON_VENDORS } from "./use-petty-cash-expense-form"
import { CategoryIcon } from "@/components/icons/category-icon"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ExpenseWizardModalProps {
    form: any
    isOpen: boolean
    onClose: () => void
    onNextStep: () => void
    onScanReceipt: (file: File) => void
    onUploadFile: (file: File) => void
    isScanning: boolean
    isUploading: boolean
    enableAIReceiptScanning: boolean
    categories: any[]
}

export function ExpenseWizardModal({
    form,
    isOpen,
    onClose,
    onNextStep,
    onScanReceipt,
    onUploadFile,
    isScanning,
    isUploading,
    enableAIReceiptScanning,
    categories
}: ExpenseWizardModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [dragOver, setDragOver] = useState(false)
    const watchDescription = form.watch("description")
    const attachmentUrl = form.watch("attachmentUrl")

    // Smart suggestions based on description
    const getSuggestions = () => {
        if (!watchDescription || watchDescription.length < 2) return []

        const desc = watchDescription.toLowerCase()
        const suggestions: any[] = []

        // Category suggestions based on keywords
        const keywordMap: Record<string, string[]> = {
            "transporte": ["taxi", "uber", "bus", "pasaje", "combustible", "gasolina"],
            "alimentación": ["almuerzo", "comida", "café", "restaurante", "menú"],
            "oficina": ["papel", "impresión", "tinta", "lapicero", "folder"],
            "limpieza": ["detergente", "escoba", "trapeador", "desinfectante"],
            "mantenimiento": ["reparación", "arreglo", "servicio técnico"],
        }

        for (const [category, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(k => desc.includes(k))) {
                const cat = categories.find(c => c.name.toLowerCase().includes(category.toLowerCase()))
                if (cat) {
                    suggestions.push({
                        categoryId: cat.id,
                        categoryName: cat.name,
                        categoryIcon: cat.icon
                    })
                }
            }
        }

        return suggestions.slice(0, 3)
    }

    const suggestions = getSuggestions()

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) {
            if (enableAIReceiptScanning) {
                onScanReceipt(file)
            } else {
                onUploadFile(file)
            }
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1 || items[i].type === 'application/pdf') {
                const file = items[i].getAsFile()
                if (file) {
                    if (enableAIReceiptScanning) {
                        onScanReceipt(file)
                    } else {
                        onUploadFile(file)
                    }
                }
                break
            }
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200"
            onPaste={handlePaste}
        >
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <Receipt className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Nuevo Gasto</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors">
                                    <CalendarIcon className="w-6 h-6 text-gray-500" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={form.getValues('expenseDate')}
                                    onSelect={(date) => date && form.setValue('expenseDate', date)}
                                    locale={es}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <button
                            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer transition-colors"
                            onClick={onClose}
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Date indicator */}
                <div className="px-6 pb-4">
                    <span className="text-xs font-medium text-muted-foreground">
                        {format(form.watch('expenseDate') || new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                    </span>
                </div>

                {/* Body */}
                <div className="p-6 pt-0 space-y-4">
                    {/* Smart Scan Zone - Drag & Drop */}
                    <div
                        className={cn(
                            "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
                            dragOver
                                ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 scale-[1.02]"
                                : "border-orange-200 hover:border-orange-300 bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-900/10 dark:to-amber-900/10"
                        )}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                    if (enableAIReceiptScanning) {
                                        onScanReceipt(file)
                                    } else {
                                        onUploadFile(file)
                                    }
                                }
                            }}
                        />

                        <div className="p-4 flex items-center justify-center gap-4">
                            {isScanning ? (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-orange-400 blur-lg opacity-40 animate-pulse" />
                                        <Loader2 className="h-6 w-6 text-orange-600 animate-spin relative z-10" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-orange-700">Analizando con IA...</span>
                                        <span className="text-xs text-orange-600/70">Extrayendo datos del comprobante</span>
                                    </div>
                                </div>
                            ) : isUploading ? (
                                <div className="flex items-center gap-3 py-2">
                                    <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
                                    <span className="text-sm font-bold text-orange-700">Subiendo a Google Drive...</span>
                                </div>
                            ) : attachmentUrl ? (
                                <div className="flex items-center gap-3 py-2">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-emerald-700">Comprobante adjunto</span>
                                        <span className="text-xs text-emerald-600/70">Click para cambiar</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm ring-1 ring-orange-100 dark:ring-orange-800 group-hover:scale-110 transition-transform">
                                        {enableAIReceiptScanning ? (
                                            <Sparkles className="h-6 w-6 text-orange-500" />
                                        ) : (
                                            <Upload className="h-6 w-6 text-orange-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold text-orange-800/80">
                                            {enableAIReceiptScanning ? "Escaneo Inteligente" : "Adjuntar Comprobante"}
                                        </span>
                                        <span className="text-[11px] text-orange-600/70 font-medium">
                                            Arrastra, pega (Ctrl+V) o haz click
                                        </span>
                                    </div>
                                    {enableAIReceiptScanning && (
                                        <div className="hidden sm:flex px-2 py-1 bg-orange-100 dark:bg-orange-800/30 rounded-full">
                                            <span className="text-[9px] font-black text-orange-700 uppercase tracking-wider">AI</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Description Input */}
                    <div className="relative">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    autoFocus={!attachmentUrl}
                                    placeholder="¿En qué gastaste? Ej: Taxi a reunión"
                                    className="h-14 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-transparent focus:border-orange-200 focus:bg-white dark:focus:bg-zinc-900 text-lg px-5 font-semibold transition-all shadow-sm ring-1 ring-black/5"
                                />
                            )}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black opacity-30 text-sm">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Smart Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {suggestions.map((s, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        form.setValue('categoryId', s.categoryId)
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full whitespace-nowrap text-sm font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                    <CategoryIcon name={s.categoryIcon} className="w-4 h-4" />
                                    {s.categoryName}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Vendor Quick Suggestions */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                            Proveedor común
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_VENDORS.slice(0, 6).map((vendor) => (
                                <button
                                    key={vendor.name}
                                    type="button"
                                    onClick={() => form.setValue('vendor', vendor.name)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                                        form.watch('vendor') === vendor.name
                                            ? "bg-orange-500 border-orange-500 text-white"
                                            : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:border-orange-300"
                                    )}
                                >
                                    {vendor.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vendor Input (if custom) */}
                    {!COMMON_VENDORS.some(v => v.name === form.watch('vendor')) && (
                        <FormField
                            control={form.control}
                            name="vendor"
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    placeholder="Nombre del proveedor / RUC"
                                    className="h-12 rounded-xl bg-gray-50 dark:bg-zinc-800 border-transparent focus:border-orange-200 text-sm px-4 transition-all"
                                />
                            )}
                        />
                    )}

                    {/* Justification */}
                    <FormField
                        control={form.control}
                        name="justification"
                        render={({ field }) => (
                            <Textarea
                                {...field}
                                placeholder="Justificación / Notas adicionales (opcional)"
                                className="min-h-[80px] rounded-2xl bg-gray-50 dark:bg-zinc-800 border-transparent focus:border-orange-200 focus:bg-white dark:focus:bg-zinc-900 resize-none p-4 text-sm transition-all shadow-sm ring-1 ring-black/5"
                            />
                        )}
                    />
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0 bg-gray-50/50 dark:bg-zinc-900/50">
                    <Button
                        className="w-full h-14 rounded-2xl text-lg font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 shadow-none transition-all"
                        onClick={onNextStep}
                        disabled={!form.watch('description')}
                    >
                        Continuar al monto
                    </Button>
                </div>
            </div>
        </div>
    )
}
