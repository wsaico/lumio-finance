
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Check } from "lucide-react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCategories } from "@/hooks/useCategories"
import { IconPicker } from "@/components/ui/icon-picker"
import { BUDGET_RULES } from "@/types/budget-methodology"

// Simplified color palette
const COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6",
    "#d946ef", "#f43f5e", "#64748b"
]


const formSchema = z.object({
    name: z.string().min(1, "Nombre requerido"),
    type: z.enum(["EXPENSE", "INCOME"]),
    color: z.string().min(1),
    icon: z.string().min(1),
    budgetRule: z.enum(["NEED", "WANT", "SAVINGS"]).optional(),
})

interface CategoryFormModalProps {
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onCreated?: (id: string) => void
    data?: any // Data for editing
    defaultType?: string
}

export function CategoryFormModal({ trigger, open: openProp, onOpenChange, onCreated, data, defaultType = "EXPENSE" }: CategoryFormModalProps) {
    const [open, setOpen] = useState(openProp || false);

    // Sync internal state with external prop
    useEffect(() => {
        if (openProp !== undefined) {
            setOpen(openProp);
        }
    }, [openProp]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (onOpenChange) {
            onOpenChange(newOpen);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {
                trigger ? (
                    <DialogTrigger asChild> {trigger}</DialogTrigger>
                ) : trigger === null ? null : (
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Nueva Categoría
                        </Button>
                    </DialogTrigger>
                )}
            <DialogContent className="sm:max-w-[425px]">
                <CategoryFormContent
                    onSuccess={() => handleOpenChange(false)}
                    onCreated={onCreated}
                    initialData={data}
                    defaultType={defaultType}
                />
            </DialogContent>
        </Dialog>
    )
}

// Extracted Content to handle Form Logic internally
function CategoryFormContent({ onSuccess, onCreated, initialData, defaultType }: { onSuccess: () => void, onCreated?: (id: string) => void, initialData?: any, defaultType?: string }) {
    const { createCategory, updateCategory } = useCategories()
    const [activeType, setActiveType] = useState(initialData?.type || defaultType || "EXPENSE")

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            type: initialData?.type || defaultType || "EXPENSE",
            color: initialData?.color || "#3b82f6",
            icon: initialData?.icon || "shopping-cart",
            budgetRule: initialData?.budget_rule || undefined
        },
    })

    const onSubmit = async (values: any) => {
        try {
            if (initialData) {
                await updateCategory.mutateAsync({ id: initialData.id, ...values })
            } else {
                const res = await createCategory.mutateAsync(values)
                if (onCreated && res.id) onCreated(res.id)
            }
            onSuccess()
            form.reset()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{initialData ? "Editar Categoría" : "Crear Categoría"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Tabs value={activeType} onValueChange={(v) => {
                        setActiveType(v)
                        form.setValue('type', v as any)
                    }} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="EXPENSE">Gasto</TabsTrigger>
                            <TabsTrigger value="INCOME">Ingreso</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Comida, Transporte..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Color</FormLabel>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={cn(
                                                "w-8 h-8 rounded-full transition-all border-2",
                                                field.value === color ? "border-black dark:border-white scale-110" : "border-transparent"
                                            )}
                                            style={{ backgroundColor: color }}
                                            onClick={() => field.onChange(color)}
                                        >
                                            {field.value === color && <Check className="w-4 h-4 text-white mx-auto" />}
                                        </button>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Icono</FormLabel>
                                <FormControl>
                                    <IconPicker value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {activeType === "EXPENSE" && (
                        <FormField
                            control={form.control}
                            name="budgetRule"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Regla 50/30/20 (Opcional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una clasificación" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(BUDGET_RULES).map(([key, rule]) => (
                                                <SelectItem key={key} value={key}>
                                                    {rule.label} ({rule.percent}%)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <Button type="submit" className="w-full">
                        {initialData ? "Guardar Cambios" : "Crear"}
                    </Button>
                </form>
            </Form>
        </>
    )
}
