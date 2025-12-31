"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

const formSchema = z.object({
    newInitialBalance: z.string().refine((val) => !isNaN(Number(val)), {
        message: "Debe ser un número válido",
    }),
    reason: z.string().optional(),
})

interface EditInitialBalanceModalProps {
    account: {
        id: string
        name: string
        initialBalance: number
        currentBalance: number
        currencyCode: string
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditInitialBalanceModal({
    account,
    open,
    onOpenChange
}: EditInitialBalanceModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newInitialBalance: account.initialBalance.toString(),
            reason: "",
        },
    })

    const watchedBalance = form.watch("newInitialBalance")
    const newBalance = watchedBalance ? parseFloat(watchedBalance) : account.initialBalance
    const adjustment = newBalance - account.initialBalance

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true)

            const response = await fetch(`/api/accounts/${account.id}/adjust-balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newInitialBalance: parseFloat(values.newInitialBalance),
                    reason: values.reason || undefined
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Error al ajustar saldo')
            }

            const data = await response.json()

            const message = data.adjustmentTransaction
                ? `Saldo ajustado y transacción de auditoría creada`
                : `Saldo inicial actualizado`

            toast.success('Saldo inicial ajustado', {
                description: message
            })

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['accounts'] })

            onOpenChange(false)
            form.reset()
        } catch (error: any) {
            console.error('[ADJUST_BALANCE_ERROR]', error)
            toast.error('Error al ajustar saldo', {
                description: error.message || 'Ocurrió un error inesperado'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Ajustar Saldo Inicial</DialogTitle>
                    <DialogDescription>
                        Cuenta: <span className="font-semibold">{account.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Current Status */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                            <div>
                                <p className="text-xs text-muted-foreground">Saldo Inicial Actual</p>
                                <p className="text-lg font-bold">
                                    {account.currencyCode} {account.initialBalance.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Saldo Actual</p>
                                <p className="text-lg font-bold">
                                    {account.currencyCode} {account.currentBalance.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* New Initial Balance */}
                        <FormField
                            control={form.control}
                            name="newInitialBalance"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nuevo Saldo Inicial</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="text-lg font-mono"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Impact Preview */}
                        {adjustment !== 0 && (
                            <Alert className={adjustment > 0 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                                <div className="flex items-start gap-3">
                                    {adjustment > 0 ? (
                                        <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <AlertDescription>
                                            <p className="font-semibold mb-2">
                                                {adjustment > 0 ? 'Incremento' : 'Reducción'} de{' '}
                                                <span className={adjustment > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                                                    {account.currencyCode} {Math.abs(adjustment).toFixed(2)}
                                                </span>
                                            </p>
                                            <div className="text-sm space-y-1">
                                                <p>
                                                    • Saldo inicial: {account.initialBalance.toFixed(2)} → <strong>{newBalance.toFixed(2)}</strong>
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    El saldo actual se recalculará automáticamente basándose en tus transacciones.
                                                </p>
                                            </div>
                                        </AlertDescription>
                                    </div>
                                </div>
                            </Alert>
                        )}

                        {/* Warning */}
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                <strong>Importante:</strong> Este ajuste modificará el saldo inicial y recalculará
                                el saldo actual basándose en tus transacciones. Se creará una transacción de
                                "Ajuste de Apertura" para mantener la trazabilidad contable.
                            </AlertDescription>
                        </Alert>

                        {/* Reason */}
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo del Ajuste (opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Ej: Corrección de saldo inicial por error de registro"
                                            className="resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Documenta la razón del ajuste para mantener claridad en los registros
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading || adjustment === 0}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ajustar Saldo
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
