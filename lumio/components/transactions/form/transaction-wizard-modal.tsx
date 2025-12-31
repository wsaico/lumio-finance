
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
    FormItem,
} from "@/components/ui/form"
import {
    CalendarIcon,
    X,
    Plus,
    FileText,
    Loader2,
    Check
} from "lucide-react"
import { useSmartCategories } from "@/hooks/useSmartCategories"
import { useState, useEffect } from "react"
import { CategoryIcon } from "@/components/icons/category-icon"

interface TransactionWizardModalProps {
    form: any
    isOpen: boolean
    onClose: () => void
    onNextStep: () => void // e.g. Go to Category Selection
}

export function TransactionWizardModal({
    form,
    isOpen,
    onClose,
    onNextStep
}: TransactionWizardModalProps) {
    const watchDescription = form.watch("description")

    // Smart Suggestions
    const [searchTerm, setSearchTerm] = useState("")
    const { data: smartData, isLoading: isLoadingSuggestions } = useSmartCategories(searchTerm)
    const suggestions = smartData?.suggestions || []

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (isOpen && (watchDescription?.length || 0) > 2) {
                setSearchTerm(watchDescription)
            } else {
                setSearchTerm("")
            }
        }, 300)
        return () => clearTimeout(timeoutId)
    }, [watchDescription, isOpen])

    if (!isOpen) return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-2">
                    <h2 className="text-2xl font-bold tracking-tight">Ingrese El Título</h2>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                                    <CalendarIcon className="w-6 h-6 text-gray-500" />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={form.getValues('transactionDate')}
                                    onSelect={(date) => date && form.setValue('transactionDate', date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <div
                            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                            onClick={onClose}
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Title Input */}
                    <div className="relative">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    autoFocus
                                    placeholder="Título"
                                    className="h-16 rounded-2xl bg-gray-50 border-transparent focus:border-primary/20 focus:bg-white text-xl px-5 font-semibold transition-all shadow-sm ring-1 ring-black/5"
                                />
                            )}
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black opacity-30 text-sm">T</div>
                    </div>

                    {/* Suggestions (In-flow) */}
                    {suggestions.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {suggestions.map((s: any, idx: number) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                        form.setValue('categoryId', s.categoryId)
                                        form.setValue('subcategoryId', s.subcategoryId)
                                        if (s.categoryName) form.setValue('description', s.categoryName)
                                        onClose() // Or go to amount? User said "Select Category" button implies next step.
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full whitespace-nowrap text-sm font-medium hover:bg-blue-100"
                                >
                                    <CategoryIcon name={s.categoryIcon} className="w-4 h-4" />
                                    {s.categoryName}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Notes Input */}
                    <div className="relative">
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <Textarea
                                    {...field}
                                    placeholder="Notas"
                                    className="min-h-[100px] rounded-2xl bg-gray-50 border-transparent focus:border-primary/20 focus:bg-white resize-none p-5 text-base transition-all shadow-sm ring-1 ring-black/5"
                                />
                            )}
                        />
                        <div className="absolute right-5 bottom-5 text-muted-foreground opacity-30">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>

                    {/* Attachment */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 text-muted-foreground font-normal px-5">
                                <span className="flex items-center gap-3"><Plus className="w-5 h-5 bg-gray-200 rounded-full p-0.5 text-white" /> {form.watch('attachmentUrl') ? 'Adjunto vinculado' : 'Añadir un adjunto'}</span>
                                {form.watch('attachmentUrl') ? <Check className="w-5 h-5 text-emerald-500" /> : <Plus className="w-5 h-5 opacity-50" />}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">URL del Adjunto</h4>
                                <p className="text-sm text-muted-foreground">Pega aquí el enlace a tu factura o recibo.</p>
                                <FormField
                                    control={form.control}
                                    name="attachmentUrl"
                                    render={({ field }) => (
                                        <Input {...field} placeholder="https://..." />
                                    )}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                    <Button
                        className="w-full h-14 rounded-2xl text-lg font-bold bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-none"
                        onClick={onNextStep} // Or Submit?
                    >
                        Selecciona una categoría
                    </Button>
                </div>
            </div>
        </div>
    )
}
