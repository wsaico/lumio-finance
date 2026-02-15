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
import { Loader2, RefreshCw, Wallet } from "lucide-react"
import { useCreatePettyCashReplenishment } from "@/hooks/usePettyCash"

const formSchema = z.object({
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK', 'OTROS']),
    referenceNumber: z.string().optional(),
    receivedBy: z.string().min(1, "Receptor requerido"),
    approvedBy: z.string().min(1, "Aprobador requerido"),
    notes: z.string().optional(),
})

interface ReplenishmentDialogProps {
    settlementId: string
    fundId: string
    totalAmount: number
    settlementCode: string
    userId: string // For Solopreneur mode, we default approver/receiver to current user
    userName: string
    trigger?: React.ReactNode
}

export function ReplenishmentDialog({
    settlementId,
    fundId,
    totalAmount,
    settlementCode,
    userId,
    userName,
    trigger
}: ReplenishmentDialogProps) {
    const [open, setOpen] = useState(false)
    const { mutateAsync: createReplenishment, isPending: isLoading } = useCreatePettyCashReplenishment()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paymentMethod: "TRANSFER" as const,
            referenceNumber: "",
            receivedBy: userName,
            approvedBy: userName,
            notes: "Reposición rápida (Modo Solopreneur)",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const today = new Date().toISOString()
        const result = await createReplenishment({
            fundId,
            settlementId,
            replenishmentDate: today,
            amount: totalAmount, // This is technically ignored by backend as it takes from settlement, but good for type safety
            paymentMethod: values.paymentMethod,
            referenceNumber: values.referenceNumber,
            approvedBy: values.approvedBy,
            receivedBy: values.receivedBy,
            deliveredBy: values.approvedBy,
            notes: values.notes,
            status: 'CONFIRMED' // Force auto-confirmation
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
                    <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                        <RefreshCw className="h-4 w-4" />
                        Reponer Ahora
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wallet className="h-5 w-5 text-orange-600" />
                        Reponer Fondo
                    </DialogTitle>
                    <DialogDescription>
                        Confirmar reposición para la liquidación <strong>{settlementCode}</strong> por <strong>S/ {Number(totalAmount).toFixed(2)}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
                    <p className="text-sm text-orange-800 font-medium">✨ Modo Solopreneur Activo</p>
                    <p className="text-xs text-orange-600 mt-1">
                        Al confirmar, el sistema registrará la transferencia y actualizará tu saldo disponible automáticamente.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de Pago</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione método" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="TRANSFER">Transferencia Bancaria</SelectItem>
                                            <SelectItem value="CASH">Efectivo</SelectItem>
                                            <SelectItem value="CHECK">Cheque</SelectItem>
                                            <SelectItem value="OTROS">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {form.watch('paymentMethod') !== 'CASH' && (
                            <FormField
                                control={form.control}
                                name="referenceNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número de Operación / Referencia</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: OP-123456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="bg-orange-600 hover:bg-orange-700 font-bold"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                PREPARAR Y CONFIRMAR
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
