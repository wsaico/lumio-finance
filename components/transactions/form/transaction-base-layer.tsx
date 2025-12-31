"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    FormControl,
    FormField,
    FormItem,
} from "@/components/ui/form"
import {
    CalendarIcon,
    Plus,
    FileText,
    Wallet,
    TrendingDown,
    TrendingUp,
    ArrowRightLeft,
    Tag,
    Paperclip,
    Zap,
    Target,
    HandCoins,
    Loader2,
    CheckCircle2,
    Repeat,
    Info,
    ChevronUp,
    ChevronDown,
    CalendarDays,
    Clock
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CategoryIcon } from "@/components/icons/category-icon"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { SmartCalculator } from "../v2/smart-calculator"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { TransferModal } from "../transfer-modal"
import { useSmartCategories } from "@/hooks/useSmartCategories"
import { Calendar } from "@/components/ui/calendar"
import { CategoryGrid } from "@/components/transactions/category-selector"

interface TransactionBaseLayerProps {
    form: any
    activeTab: "EXPENSE" | "INCOME" | "TRANSFER"
    setActiveTab: (val: "EXPENSE" | "INCOME" | "TRANSFER") => void
    onOpenWizard: () => void
    currencySymbol: string
    accounts: any[]
    categories: any[]
    goals?: any[]
    loans?: any[]
    isCategoryPickerOpen: boolean
    setIsCategoryPickerOpen: (v: boolean) => void
}

const ClockDisplay = () => {
    const [time, setTime] = useState(new Date())
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])
    return <>{format(time, "HH:mm")}</>
}

export function TransactionBaseLayer({
    form,
    activeTab,
    setActiveTab,
    onOpenWizard,
    currencySymbol,
    accounts,
    categories,
    goals = [],
    loans = [],
    isCategoryPickerOpen,
    setIsCategoryPickerOpen
}: TransactionBaseLayerProps) {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)

    // Selectors state
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false)
    const [isDateSheetOpen, setIsDateSheetOpen] = useState(false)
    const [isTimeSheetOpen, setIsTimeSheetOpen] = useState(false)
    const [isEndDateSheetOpen, setIsEndDateSheetOpen] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const currentAmount = form.watch("amount")
    const attachmentUrl = form.watch("attachmentUrl")
    const currentAccountId = form.watch("accountId")
    const currentCategoryId = form.watch("categoryId")
    const currentSubcategoryId = form.watch("subcategoryId")
    const currentMode = form.watch("mode")
    const recurrenceEndDate = form.watch("recurrenceEndDate")
    const transferToAccountId = form.watch("transferToAccountId")
    const currentLoanId = form.watch("loanId")
    const transactionDate = form.watch("date") ? new Date(form.watch("date")) : new Date()

    const currentLoan = loans?.find(l => l.id === currentLoanId)

    const currentAccount = accounts?.find(a => a.id === currentAccountId)
    const transferToAccount = accounts?.find(a => a.id === transferToAccountId)

    // Find category: Direct match or check if the ID belongs to a subcategory (for legacy/healing cases)
    const currentCategory = categories?.find(c => c.id === currentCategoryId) ||
        categories?.find(c => c.subcategories?.some((s: any) => s.id === currentCategoryId))

    // Now find subcategory if we have one
    const currentSubcategory = currentCategory?.subcategories?.find((s: any) => s.id === currentSubcategoryId) ||
        (currentCategoryId !== currentCategory?.id ? currentCategory?.subcategories?.find((s: any) => s.id === currentCategoryId) : null)

    const getCurrencySymbol = (code?: string) => {
        if (!code) return "$"
        switch (code) {
            case 'PEN': return 'S/.'
            case 'EUR': return '€'
            case 'GBP': return '£'
            default: return '$'
        }
    }

    const MODES = [
        { id: 'DEFAULT', label: 'Por defecto' },
        { id: 'SOON', label: 'Próximamente' },
        { id: 'SUBSCRIPTION', label: 'Suscripción' },
        { id: 'RECURRING', label: 'Repetitivo' }
    ]

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
            toast.success("Comprobante subido correctamente")
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

    // Smart Categories
    const { data: smartCategory } = useSmartCategories(form.watch("description") || "")

    // Auto-assign category if confidence is high and user hasn't manually set one recently
    useEffect(() => {
        if (smartCategory?.categoryId && !currentCategoryId) {
            console.log("Smart category detected:", smartCategory.categoryName, "confidence:", smartCategory.confidence);
            form.setValue("categoryId", smartCategory.categoryId);
            // Restore the subcategory detection fallback
            if (smartCategory.subcategoryId) {
                form.setValue("subcategoryId", smartCategory.subcategoryId);
            } else {
                // If smart category has no subcategory, but the currentCategoryId is actually a subcategory,
                // try to find its parent and set the subcategoryId.
                const foundParent = categories?.find(c => c.subcategories?.some((s: any) => s.id === smartCategory.categoryId));
                if (foundParent) {
                    console.log("Smart category ID is a subcategory, setting parent:", foundParent.name);
                    form.setValue("categoryId", foundParent.id);
                    form.setValue("subcategoryId", smartCategory.categoryId);
                }
            }
        }
    }, [smartCategory, currentCategoryId, form, categories]);

    const getTabColor = (tab: string) => {
        switch (tab) {
            case 'EXPENSE': return 'var(--expense)'
            case 'INCOME': return 'var(--income)'
            case 'TRANSFER': return 'var(--savings)'
            default: return 'var(--primary)'
        }
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-transparent p-4 lg:p-6 select-none animate-in fade-in zoom-in-95 duration-300 custom-scrollbar">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6">

                    {/* 1. Integrated Main Card - Dynamic color based on type */}
                    <div className="relative group perspective-1000">
                        <div
                            className="absolute -inset-1 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
                            style={{ backgroundColor: getTabColor(activeTab) }}
                        ></div>
                        <div
                            className="relative h-[280px] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 transition-colors duration-500"
                            style={{ backgroundColor: getTabColor(activeTab) }}
                        >

                            {/* Type Tabs at the Top - Simple color-changing design */}
                            <div className="flex p-3 gap-0 bg-white/10 rounded-full mx-4 mt-4">
                                {[
                                    {
                                        id: 'EXPENSE',
                                        label: currentLoanId ? 'Pagado / Prestado' : 'Gasto',
                                        icon: TrendingDown,
                                        color: 'bg-white/20 backdrop-blur-sm',
                                        textColor: 'text-white'
                                    },
                                    {
                                        id: 'INCOME',
                                        label: currentLoanId ? 'Recibido / Cobrado' : 'Ingreso',
                                        icon: TrendingUp,
                                        color: 'bg-white/20 backdrop-blur-sm',
                                        textColor: 'text-white'
                                    },
                                    { id: 'TRANSFER', label: 'Transferir', icon: ArrowRightLeft, color: 'bg-white/20 backdrop-blur-sm', textColor: 'text-white', isModal: true }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => {
                                            if (type.id === 'TRANSFER') {
                                                setIsTransferModalOpen(true)
                                            } else {
                                                setActiveTab(type.id as any)
                                                form.setValue('type', type.id)
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all duration-300",
                                            activeTab === type.id
                                                ? `${type.color} ${type.textColor} shadow-lg scale-[1.02]`
                                                : "text-white/40 hover:text-white/60"
                                        )}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex px-12 items-center justify-between">
                                {/* Cat/Transfer Icon - Trigger Sheet */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeTab === 'TRANSFER') setIsAccountSheetOpen(true)
                                        else setIsCategorySheetOpen(true)
                                    }}
                                    className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-white shadow-inner border border-white/10 hover:scale-105 active:scale-95 transition-all duration-300 group/icon"
                                >
                                    {activeTab === 'TRANSFER' ? (
                                        <ArrowRightLeft className="w-16 h-16 drop-shadow-lg group-hover/icon:rotate-12 transition-transform" />
                                    ) : (
                                        <CategoryIcon
                                            name={currentSubcategory?.icon || currentCategory?.icon || "circle-help"}
                                            className="w-16 h-16 drop-shadow-lg group-hover/icon:rotate-12 transition-transform"
                                        />
                                    )}
                                </button>

                                {/* Amount & Name (Category or Account) */}
                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white/40">{getCurrencySymbol(currentAccount?.currencyCode)}</span>
                                        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
                                            <DialogTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="text-[5.5rem] font-black text-white tracking-tighter tabular-nums drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform outline-none active:opacity-80"
                                                >
                                                    {currentAmount || "0"}
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="w-auto p-0 border-0 bg-transparent shadow-none">
                                                <DialogTitle className="sr-only">Calculadora</DialogTitle>
                                                <SmartCalculator
                                                    initialValue={currentAmount || "0"}
                                                    onConfirm={(val) => form.setValue("amount", val)}
                                                    onClose={() => setIsCalculatorOpen(false)}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (activeTab === 'TRANSFER') setIsAccountSheetOpen(true)
                                            else setIsCategorySheetOpen(true)
                                        }}
                                        className="text-2xl font-black text-white/90 tracking-tight capitalize hover:underline underline-offset-4 decoration-white/30"
                                    >
                                        {activeTab === 'TRANSFER'
                                            ? (transferToAccount?.name || "Hacia...")
                                            : currentSubcategory
                                                ? `${currentCategory?.name}: ${currentSubcategory.name}`
                                                : (currentCategory?.name || "Seleccionar...")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Compact Input Stack */}
                    <div className="flex flex-col gap-2">
                        <div className="bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-primary/20 transition-all shadow-sm">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <div className="relative w-full">
                                        <Input
                                            {...field}
                                            placeholder="Descripción"
                                            autoComplete="off"
                                            className="h-full border-0 bg-transparent text-base font-bold placeholder:text-slate-300 focus-visible:ring-0 p-0 shadow-none z-10 relative"
                                        />
                                        {smartCategory && !field.value && (
                                            <span className="absolute top-1/2 -translate-y-1/2 left-0 text-slate-300 pointer-events-none text-base font-bold italic opacity-0 animate-in fade-in">
                                                Sugerencia: {smartCategory.categoryName}
                                            </span>
                                        )}
                                    </div>
                                )}
                            />
                        </div>

                        <div className="bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-primary/20 transition-all shadow-sm">
                            <Tag className="w-5 h-5 text-slate-400" />
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        placeholder="Notas"
                                        className="h-full border-0 bg-transparent text-base font-bold placeholder:text-slate-300 focus-visible:ring-0 p-0 shadow-none"
                                    />
                                )}
                            />
                        </div>

                        <div
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={cn(
                                "bg-slate-100/80 dark:bg-zinc-900 rounded-2xl flex items-center gap-4 px-6 h-14 border border-transparent focus-within:border-primary/20 transition-all shadow-sm group/attach cursor-pointer",
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
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : attachmentUrl ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <Paperclip className="w-5 h-5 text-slate-400 group-hover/attach:text-primary transition-colors" />
                            )}
                            <span className={cn(
                                "flex-1 text-sm font-bold transition-colors",
                                attachmentUrl ? "text-emerald-600" : "text-slate-400 group-hover/attach:text-slate-600"
                            )}>
                                {isUploading ? "Subiendo..." : attachmentUrl ? "Comprobante adjunto" : "Adjuntar comprobante"}
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
                                <Plus className="w-4 h-4 text-slate-400 group-hover/attach:text-primary transition-colors" />
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-4">

                    {/* 1. Time & Date Header */}
                    {/* 1. Time & Date Header - Interactive */}
                    <div className="flex items-center justify-between px-2">
                        <button
                            type="button"
                            onClick={() => setIsDateSheetOpen(true)}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-200 transition-colors">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col items-start bg-transparent">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</span>
                                <span className="text-xl font-black text-slate-800 dark:text-white capitalize tracking-tighter leading-none">
                                    {format(new Date(), "yyyy-MM-dd") === format(form.watch("transactionDate"), "yyyy-MM-dd") ? "Hoy" : format(form.watch("transactionDate"), "d MMM", { locale: es })}
                                </span>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsTimeSheetOpen(true)}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                        >
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hora</span>
                                <span className="text-xl font-black font-mono text-slate-700 dark:text-slate-200 leading-none group-hover:text-primary transition-colors">
                                    <ClockDisplay />
                                </span>
                            </div>
                            <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-slate-500 shadow-sm group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 transition-colors">
                                <Clock className="w-5 h-5" />
                            </div>
                        </button>
                    </div>

                    <div className="h-px bg-slate-200/60 dark:bg-zinc-800 w-full" />

                    {/* 2. Mode Pills Grid with Info Trigger */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Transacción</span>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button type="button" className="text-slate-400 hover:text-primary transition-colors">
                                        <Info className="w-4 h-4" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-950">
                                    <DialogTitle className="sr-only">Información de Tipos de Transacción</DialogTitle>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-4">
                                            <h3 className="text-lg font-bold">Seleccionar El Tipo De Transacción</h3>
                                        </div>
                                        {/* Modal Content - Matching Image */}
                                        <div className="space-y-3">
                                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl flex gap-3 text-left">
                                                <CheckCircle2 className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                                                <div>
                                                    <h4 className="font-bold text-sm">Por defecto</h4>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl flex gap-3 text-left">
                                                <CalendarIcon className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                                                <div>
                                                    <h4 className="font-bold text-sm">Próximamente</h4>
                                                    <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                                        <li>Una transacción que no está pagada</li>
                                                        <li>No cuenta para su total a menos que sea marcado como 'Pagado'</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl flex gap-3 text-left">
                                                <div className="w-5 h-5 mt-1 shrink-0 bg-slate-200 dark:bg-zinc-800 rounded-md flex items-center justify-center text-xs font-bold text-slate-500">S</div>
                                                <div>
                                                    <h4 className="font-bold text-sm">Suscripción</h4>
                                                    <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                                        <li>Transacción recurrente que se mostrará en suscripciones</li>
                                                        <li>Se genera automáticamente cuando la actual se marca pagada</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-xl flex gap-3 text-left">
                                                <Repeat className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                                                <div>
                                                    <h4 className="font-bold text-sm">Repetitivo</h4>
                                                    <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                                        <li>Transacción recurrente simple</li>
                                                        <li>Se genera automáticamente al pagarse la actual</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="flex flex-wrap gap-2 px-1">
                            {MODES.map(mode => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => form.setValue("mode", mode.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[11px] font-bold border transition-all duration-300",
                                        currentMode === mode.id
                                            ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105"
                                            : "bg-white dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-zinc-800 hover:border-primary/50"
                                    )}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2b. Recurrence Settings Refined UI */}
                    {(currentMode === 'RECURRING' || currentMode === 'SUBSCRIPTION') && (
                        <div className="mt-4 px-1">
                            <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-zinc-900 p-2 pl-4 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm relative z-10">
                                    <span>Repetir cada</span>
                                    <input
                                        type="number"
                                        {...form.register("recurrenceInterval", { valueAsNumber: true })}
                                        className="w-12 h-8 text-center bg-slate-100 dark:bg-zinc-800 rounded-lg focus:ring-2 ring-primary/20 outline-none"
                                        min="1"
                                    />
                                    <select
                                        {...form.register("recurrenceUnit")}
                                        className="h-8 px-2 bg-slate-100 dark:bg-zinc-800 rounded-lg outline-none cursor-pointer focus:ring-2 ring-primary/20 text-xs uppercase tracking-wide"
                                    >
                                        <option value="days">días</option>
                                        <option value="weeks">semanas</option>
                                        <option value="months">meses</option>
                                        <option value="years">años</option>
                                    </select>

                                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1" />

                                    <button
                                        type="button"
                                        onClick={() => setIsEndDateSheetOpen(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors group"
                                    >
                                        <CalendarDays className="w-3.5 h-3.5 text-purple-500" />
                                        <span className={cn(
                                            "text-xs truncate max-w-[100px]",
                                            recurrenceEndDate ? "text-slate-700 dark:text-slate-300" : "text-purple-600"
                                        )}>
                                            {recurrenceEndDate
                                                ? format(new Date(recurrenceEndDate), "d MMM yyyy", { locale: es })
                                                : "Para siempre"
                                            }
                                        </span>
                                    </button>
                                </div>

                                {/* Auto Execute Toggle - Contextual */}
                                <div className="w-full max-w-sm mt-3 animate-in fade-in slide-in-from-top-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = !form.watch("isAutoExecute")
                                            form.setValue("isAutoExecute", newVal)
                                            if (newVal) {
                                                form.setValue("scheduledType", "AUTO")
                                                // Default to monthly if enabling auto
                                                if (form.watch("recurrence") === 'NONE') {
                                                    form.setValue("recurrence", "MONTHLY")
                                                }
                                            } else {
                                                form.setValue("scheduledType", "MANUAL")
                                            }
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-xl flex items-center justify-between border transition-all duration-300 group hover:shadow-md",
                                            form.watch("isAutoExecute")
                                                ? "bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
                                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-purple-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                                form.watch("isAutoExecute") ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"
                                            )}>
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("font-bold text-sm", form.watch("isAutoExecute") ? "text-purple-700 dark:text-purple-300" : "text-slate-600 dark:text-slate-400")}>
                                                        {form.watch("isAutoExecute") ? "Ejecución Automática" : "Ejecución Manual"}
                                                    </span>
                                                    {form.watch("isAutoExecute") && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 uppercase tracking-wide">
                                                            ON
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] opacity-70 max-w-[200px] leading-tight mt-0.5">
                                                    {form.watch("isAutoExecute") ? "La transacción se creará sola en la fecha indicada." : "Tendrás que confirmar la transacción cada vez."}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Toggle Switch Visual */}
                                        <div className={cn(
                                            "w-11 h-6 rounded-full transition-colors relative shrink-0 ml-2",
                                            form.watch("isAutoExecute") ? "bg-purple-600" : "bg-slate-200 dark:bg-zinc-700"
                                        )}>
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                                form.watch("isAutoExecute") ? "left-6" : "left-1"
                                            )} />
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Horizontal Selection Lists - ACCOUNTS GRID FIX */}
                    <div className="space-y-4 px-1 mt-4">

                        {/* Account Selector Row - GRID */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/40 rounded-md flex items-center justify-center text-purple-600">
                                    <Wallet className="w-3 h-3" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    {activeTab === 'TRANSFER' ? 'Desde Cuenta' : 'Cuenta de Origen'}
                                </span>
                            </div>
                            {/* CHANGED TO WRAP / GRID */}
                            <div className="flex flex-wrap gap-2">
                                {accounts?.map(acc => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => form.setValue("accountId", acc.id)}
                                        className={cn(
                                            "flex-grow md:flex-grow-0 px-4 py-3 rounded-2xl text-[11px] font-bold border transition-all duration-300 flex items-center justify-center gap-2",
                                            currentAccountId === acc.id
                                                ? "bg-purple-600 border-purple-600 text-white shadow-md"
                                                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-purple-300"
                                        )}
                                    >
                                        {acc.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hacia Cuenta Row (In TRANSFER mode) */}
                        {activeTab === 'TRANSFER' && (
                            <div className="space-y-2 animate-in slide-in-from-left duration-500">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 rounded-md flex items-center justify-center text-blue-600">
                                        <ArrowRightLeft className="w-3 h-3" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hacia Cuenta</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {accounts?.filter(a => a.id !== currentAccountId).map(acc => (
                                        <button
                                            key={acc.id}
                                            type="button"
                                            onClick={() => form.setValue("transferToAccountId", acc.id)}
                                            className={cn(
                                                "flex-grow md:flex-grow-0 px-4 py-3 rounded-2xl text-[11px] font-bold border transition-all duration-300 flex items-center justify-center gap-2",
                                                transferToAccountId === acc.id
                                                    ? "bg-blue-500 border-blue-500 text-white shadow-md"
                                                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-400 hover:border-blue-300"
                                            )}
                                        >
                                            {acc.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="mt-auto flex justify-center pb-2">
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SHEETS --- */}

            {/* Account Selection Sheet - Compact */}
            <Sheet open={isAccountSheetOpen} onOpenChange={setIsAccountSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[50vh] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
                    <div className="h-full flex flex-col relative">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none z-50">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-3">
                            <SheetTitle className="text-xl font-bold text-slate-800 dark:text-white">Seleccionar Cuenta</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {accounts?.map(acc => (
                                    <button
                                        key={acc.id}
                                        type="button"
                                        onClick={() => {
                                            form.setValue("accountId", acc.id)
                                            setIsAccountSheetOpen(false)
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 border-2",
                                            currentAccountId === acc.id
                                                ? "bg-purple-500 border-purple-500 text-white shadow-lg"
                                                : "bg-slate-50 dark:bg-zinc-900 border-transparent hover:border-purple-200 text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            currentAccountId === acc.id ? "bg-white/20" : "bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700"
                                        )}>
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-sm text-center truncate w-full">{acc.name}</span>
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-wider",
                                            currentAccountId === acc.id ? "text-white/70" : "text-slate-400"
                                        )}>{acc.currencyCode}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Category Selection Sheet - Compact */}
            <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
                <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[55vh] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden">
                    <div className="h-full flex flex-col relative">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none z-50">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-3">
                            <SheetTitle className="text-xl font-bold text-slate-800 dark:text-white">Seleccionar Categoría</SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-hidden h-full bg-white dark:bg-black">
                            {/* Force white/black background to ensure visibility */}
                            <CategoryGrid
                                categories={categories}
                                categoryId={currentCategoryId}
                                subcategoryId={currentSubcategoryId}
                                onSelect={(catId, subId) => {
                                    console.log('Category selected:', { catId, subId });
                                    form.setValue("categoryId", catId, { shouldDirty: true, shouldValidate: true })
                                    form.setValue("subcategoryId", subId || "", { shouldDirty: true, shouldValidate: true })
                                    setIsCategorySheetOpen(false)
                                }}
                                enableTabs={activeTab === 'EXPENSE'}
                            />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>


            {/* Date Selection Sheet */}
            < Sheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen} >
                <SheetContent side="bottom" className="rounded-t-[2rem] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl">
                    <div className="h-full flex flex-col relative pb-6">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-2">
                            <SheetTitle className="text-xl font-bold">Seleccionar Fecha</SheetTitle>
                        </SheetHeader>
                        <div className="px-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={transactionDate}
                                onSelect={(date) => {
                                    if (date) {
                                        // Preserve time
                                        const newDate = new Date(date)
                                        newDate.setHours(transactionDate.getHours())
                                        newDate.setMinutes(transactionDate.getMinutes())
                                        form.setValue("date", newDate.toISOString())
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
                                    form.setValue("date", new Date().toISOString())
                                    setIsDateSheetOpen(false)
                                }}
                                className="text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                            >
                                Seleccionar Hoy
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet >

            {/* Time Selection Sheet */}
            < Sheet open={isTimeSheetOpen} onOpenChange={setIsTimeSheetOpen} >
                <SheetContent side="bottom" className="rounded-t-[2rem] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl">
                    <div className="h-full flex flex-col relative pb-8">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-2">
                            <SheetTitle className="text-xl font-bold">Seleccionar Hora</SheetTitle>
                        </SheetHeader>

                        <div className="flex flex-col items-center justify-center py-6 gap-6">
                            <div className="flex items-center gap-4">
                                {/* Hour Spinner */}
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(transactionDate)
                                            d.setHours(d.getHours() >= 23 ? 0 : d.getHours() + 1)
                                            form.setValue("date", d.toISOString())
                                        }}
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronUp className="w-6 h-6 text-slate-400" />
                                    </button>
                                    <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                        <span className="text-4xl font-black text-white font-mono">
                                            {format(transactionDate, "HH")}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(transactionDate)
                                            d.setHours(d.getHours() <= 0 ? 23 : d.getHours() - 1)
                                            form.setValue("date", d.toISOString())
                                        }}
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronDown className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <span className="text-4xl font-black text-slate-200 dark:text-zinc-700 animate-pulse">:</span>

                                {/* Minute Spinner */}
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(transactionDate)
                                            d.setMinutes(d.getMinutes() >= 59 ? 0 : d.getMinutes() + 1)
                                            form.setValue("date", d.toISOString())
                                        }}
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronUp className="w-6 h-6 text-slate-400" />
                                    </button>
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border-2 border-slate-200 dark:border-zinc-700">
                                        <span className="text-4xl font-black text-slate-700 dark:text-slate-200 font-mono">
                                            {format(transactionDate, "mm")}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(transactionDate)
                                            d.setMinutes(d.getMinutes() <= 0 ? 59 : d.getMinutes() - 1)
                                            form.setValue("date", d.toISOString())
                                        }}
                                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <ChevronDown className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex gap-2">
                                {[0, 15, 30, 45].map(min => (
                                    <button
                                        key={min}
                                        type="button"
                                        onClick={() => {
                                            const d = new Date(transactionDate)
                                            d.setMinutes(min)
                                            form.setValue("date", d.toISOString())
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                            transactionDate.getMinutes() === min
                                                ? "bg-primary text-white shadow-md scale-105"
                                                : "bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200"
                                        )}
                                    >
                                        :{min.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="px-6">
                            <Button
                                className="w-full rounded-xl py-6 text-lg font-bold"
                                onClick={() => setIsTimeSheetOpen(false)}
                            >
                                Confirmar Hora
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet >

            {/* Recurrence End Date Sheet */}
            < Sheet open={isEndDateSheetOpen} onOpenChange={setIsEndDateSheetOpen} >
                <SheetContent side="bottom" className="rounded-t-[2rem] p-0 border-0 bg-white dark:bg-zinc-950 shadow-2xl">
                    <div className="h-full flex flex-col relative pb-6">
                        <div className="absolute top-0 left-0 right-0 py-2 flex justify-center pointer-events-none">
                            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
                        </div>
                        <SheetHeader className="px-6 pt-6 pb-2">
                            <SheetTitle className="text-xl font-bold">Fecha Final de Recurrencia</SheetTitle>
                        </SheetHeader>
                        <div className="px-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={recurrenceEndDate ? new Date(recurrenceEndDate) : undefined}
                                onSelect={(date) => {
                                    if (date) {
                                        form.setValue("recurrenceEndDate", date.toISOString())
                                    } else {
                                        form.setValue("recurrenceEndDate", null)
                                    }
                                    setIsEndDateSheetOpen(false)
                                }}
                                locale={es}
                                disabled={(date) => date < new Date()}
                                className="rounded-xl border shadow-sm"
                            />
                        </div>
                        <div className="px-6 pt-4 flex justify-center">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    form.setValue("recurrenceEndDate", null)
                                    setIsEndDateSheetOpen(false)
                                }}
                                className="w-full py-6 rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-zinc-900 border-dashed border-slate-300 dark:border-zinc-700 text-slate-500"
                            >
                                Sin fecha límite (Para siempre)
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet >

            {/* Transfer Modal */}
            < TransferModal
                open={isTransferModalOpen}
                onOpenChange={setIsTransferModalOpen}
            />

        </div >
    )
}
