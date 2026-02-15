"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { ArrowLeft, Loader2, CheckCircle, FileText } from "lucide-react"
import { useCreatePettyCashSettlement } from "@/hooks/usePettyCash"
import { toast } from "sonner"

const formSchema = z.object({
    settlementDate: z.string().min(1, "Fecha requerida"),
    responsibleName: z.string().min(1, "Responsable requerido"),
    receivedBy: z.string().optional(),
    notes: z.string().optional(),
})

interface DetailsStepProps {
    settlementCode: string
    fundId: string
    fundCode: string
    expenseIds: string[]
    totalAmount: number
    expenseCount: number
    defaultResponsibleName: string
    onBack: () => void
    onSuccess: (settlementId: string) => void
}

export function DetailsStep({
    settlementCode,
    fundId,
    fundCode,
    expenseIds,
    totalAmount,
    expenseCount,
    defaultResponsibleName,
    onBack,
    onSuccess
}: DetailsStepProps) {
    const { mutateAsync: createSettlement, isPending } = useCreatePettyCashSettlement()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            settlementDate: new Date().toISOString().split('T')[0],
            responsibleName: defaultResponsibleName,
            receivedBy: "",
            notes: "",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            const result = await createSettlement({
                settlement_code: settlementCode,
                fundId,
                expenseIds,
                settlementDate: new Date(values.settlementDate).toISOString(),
                responsibleName: values.responsibleName,
                receivedBy: values.receivedBy || undefined,
                notes: values.notes || undefined,
            })

            if (result) {
                toast.success("Liquidación creada exitosamente")
                onSuccess(result.id)
            }
        } catch (error: any) {
            toast.error(error.message || "Error al crear liquidación")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-border/40 px-4 py-3 flex items-center gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="rounded-full w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">Liquidar Fondo {fundCode}</h1>
                    <p className="text-xs text-muted-foreground">Paso 4 de 4 • Detalles y Confirmación</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto p-6 md:p-12">
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-4xl font-black mb-3">
                        Confirmar Liquidación
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Revisa los detalles y completa la información
                    </p>
                </div>

                {/* Summary Card */}
                <Card className="p-6 mb-8 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-900 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Código de Liquidación</p>
                            <p className="text-2xl font-black font-mono text-orange-900 dark:text-orange-100">{settlementCode}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-200 dark:border-orange-900">
                        <div>
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Fondo</p>
                            <p className="font-bold text-orange-900 dark:text-orange-100">{fundCode}</p>
                        </div>
                        <div>
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Comprobantes</p>
                            <p className="font-bold text-orange-900 dark:text-orange-100">{expenseCount} gasto(s)</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Total a Liquidar</p>
                            <p className="text-3xl font-black text-orange-600">S/ {totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Settlement Date */}
                            <FormField
                                control={form.control}
                                name="settlementDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Fecha de Liquidación</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                className="h-12 rounded-xl"
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Responsible Name */}
                            <FormField
                                control={form.control}
                                name="responsibleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Responsable que Liquida</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Nombre del responsable"
                                                className="h-12 rounded-xl"
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            Quien entrega la liquidación
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Received By */}
                        <FormField
                            control={form.control}
                            name="receivedBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Recibido por (Finanzas)</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Nombre de quien recibe en finanzas (opcional)"
                                            className="h-12 rounded-xl"
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-xs">
                                        Persona de finanzas que recibe la liquidación
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Notas (opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Observaciones adicionales sobre esta liquidación..."
                                            className="resize-none rounded-xl min-h-[100px]"
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBack}
                                disabled={isSubmitting}
                                className="h-14 px-8 rounded-2xl"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Atrás
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Creando Liquidación...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-5 w-5" />
                                        CREAR LIQUIDACIÓN
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    )
}
