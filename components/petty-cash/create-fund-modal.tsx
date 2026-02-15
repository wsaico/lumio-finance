"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Wallet } from "lucide-react"
import { useCreatePettyCashFund } from "@/hooks/usePettyCash"

const formSchema = z.object({
    fundName: z.string().min(1, "Nombre requerido"),
    fundCode: z.string().min(1, "Código de liquidación requerido"),
    assignedAmount: z.string().min(1, "Monto requerido"),
    currencyCode: z.string().length(3).default("PEN"),
    responsibleName: z.string().min(1, "Responsable requerido"),
    responsibleId: z.string().optional(),
    department: z.string().optional(),
    description: z.string().optional(),
    settlementThreshold: z.string().min(1, "Umbral requerido"),
})

interface CreateFundModalProps {
    trigger?: React.ReactNode
}

export function CreateFundModal({ trigger }: CreateFundModalProps) {
    const [open, setOpen] = useState(false)
    const { mutateAsync: createFund, isPending: isLoading } = useCreatePettyCashFund()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fundName: "",
            fundCode: "",
            assignedAmount: "",
            currencyCode: "PEN",
            responsibleName: "",
            responsibleId: "",
            department: "",
            description: "",
            settlementThreshold: "70",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const result = await createFund({
            name: values.fundName,
            fund_code: values.fundCode,
            balance: parseFloat(values.assignedAmount),
            currency: values.currencyCode,
            responsible: values.responsibleName,
            // responsible_id: values.responsibleId || undefined,
            // department: values.department || undefined,
            description: values.description || undefined,
            status: 'ACTIVE'
            // settlementThreshold: parseFloat(values.settlementThreshold),
        })

        if (result) {
            setOpen(false)
            form.reset()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Crear Fondo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Crear Fondo Fijo de Caja Chica
                    </DialogTitle>
                    <DialogDescription>
                        Asigna un fondo fijo a un responsable. La cuenta se creará automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Fund Name */}
                            <FormField
                                control={form.control}
                                name="fundName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Nombre del Fondo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Caja Chica - Administración" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {/* Fund Code */}
                            <FormField
                                control={form.control}
                                name="fundCode"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Código de Liquidación</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: FF-2025-001" className="h-11 rounded-xl font-mono uppercase" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Assigned Amount */}
                            <FormField
                                control={form.control}
                                name="assignedAmount"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Monto Asignado (PEN)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="1500.00"
                                                className="h-11 rounded-xl font-bold"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {/* Settlement Threshold */}
                            <FormField
                                control={form.control}
                                name="settlementThreshold"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Umbral de Liquidación (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                placeholder="70"
                                                className="h-11 rounded-xl"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Responsible Name */}
                            <FormField
                                control={form.control}
                                name="responsibleName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Responsable</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Juan Pérez" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {/* Responsible ID */}
                            <FormField
                                control={form.control}
                                name="responsibleId"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">DNI/ID (opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12345678" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Department */}
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Departamento (opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Administración" className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {/* Description */}
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-semibold text-foreground/70 ml-1 uppercase tracking-wider">Notas Adicionales</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Propósito del fondo..." className="h-11 rounded-xl" {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-6 border-t mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="h-11 px-6 rounded-xl font-bold"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="h-11 px-8 rounded-xl font-black shadow-md shadow-primary/20">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                CREAR FONDO FIJO
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
