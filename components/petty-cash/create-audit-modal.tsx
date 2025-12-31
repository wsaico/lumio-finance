"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useCreatePettyCashAudit, usePettyCashFunds } from "@/hooks/use-petty-cash"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
    fundId: z.string().min(1, "Selecciona un fondo"),
    auditDate: z.string().min(1, "Fecha requerida"),
    auditType: z.enum(["SURPRISE", "SCHEDULED", "ANNUAL", "REQUESTED"]),
    actualCash: z.string().min(1, "Monto requerido"),
    pendingExpenses: z.string(),
    auditedBy: z.string().min(1, "Auditor requerido"),
    responsiblePresent: z.boolean(),
    findings: z.string().optional(),
    recommendations: z.string().optional(),
})

interface CreateAuditModalProps {
    trigger?: React.ReactNode
}

export function CreateAuditModal({ trigger }: CreateAuditModalProps) {
    const [open, setOpen] = useState(false)
    const { mutateAsync: createAudit, isPending: isLoading } = useCreatePettyCashAudit()
    const { data: funds } = usePettyCashFunds("ACTIVE")

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fundId: "",
            auditDate: new Date().toISOString().split('T')[0],
            auditType: "SURPRISE" as const,
            actualCash: "",
            pendingExpenses: "0",
            auditedBy: "",
            responsiblePresent: true,
            findings: "",
            recommendations: "",
        },
    })

    const selectedFundId = form.watch("fundId")
    const actualCash = form.watch("actualCash")

    const selectedFund = funds?.find((f: any) => f.id === selectedFundId)
    const expectedCash = selectedFund ? Number(selectedFund.currentBalance) : 0
    const actualCashNum = actualCash ? parseFloat(actualCash) : 0
    const variance = actualCashNum - expectedCash
    const variancePercentage = expectedCash > 0 ? Math.abs(variance / expectedCash) * 100 : 0

    // Auto-fill expected cash when fund changes
    useEffect(() => {
        if (selectedFund) {
            // Don't auto-fill to avoid bias in surprise audits
        }
    }, [selectedFund])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const result = await createAudit({
            fundId: values.fundId,
            auditDate: new Date(values.auditDate).toISOString(),
            auditType: values.auditType,
            expectedCash: expectedCash,
            actualCash: parseFloat(values.actualCash),
            pendingExpenses: parseFloat(values.pendingExpenses),
            auditedBy: values.auditedBy,
            responsiblePresent: values.responsiblePresent,
            findings: values.findings || undefined,
            recommendations: values.recommendations || undefined,
        })

        if (result) {
            setOpen(false)
            form.reset()
        }
    }

    const getVarianceColor = () => {
        if (variance === 0) return "text-emerald-600"
        if (variancePercentage > 5) return "text-red-600"
        if (variancePercentage > 1) return "text-amber-600"
        return "text-blue-600"
    }

    const getVarianceIcon = () => {
        if (variance === 0) return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        if (variancePercentage > 5) return <AlertTriangle className="h-5 w-5 text-red-600" />
        if (variancePercentage > 1) return <AlertTriangle className="h-5 w-5 text-amber-600" />
        return null
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return trigger || (
            <Button variant="outline" className="gap-2">
                <Calculator className="h-4 w-4" />
                Arqueo
            </Button>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Arqueo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Arqueo de Caja Chica
                    </DialogTitle>
                    <DialogDescription>
                        Verificación del efectivo físico vs. registros contables
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Fund Selection */}
                        <FormField
                            control={form.control}
                            name="fundId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fondo de Caja Chica</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona fondo..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {funds?.map((fund: any) => (
                                                <SelectItem key={fund.id} value={fund.id}>
                                                    {fund.fundCode} - {fund.fundName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedFund && (
                                        <FormDescription>
                                            Saldo esperado según registros: <span className="font-semibold">S/ {expectedCash.toFixed(2)}</span>
                                        </FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            {/* Audit Date */}
                            <FormField
                                control={form.control}
                                name="auditDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha del Arqueo</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Audit Type */}
                            <FormField
                                control={form.control}
                                name="auditType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Arqueo</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SURPRISE">Sorpresivo</SelectItem>
                                                <SelectItem value="SCHEDULED">Programado</SelectItem>
                                                <SelectItem value="ANNUAL">Anual</SelectItem>
                                                <SelectItem value="REQUESTED">Solicitado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Actual Cash */}
                            <FormField
                                control={form.control}
                                name="actualCash"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Efectivo Físico Contado</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Monto real contado físicamente
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Pending Expenses */}
                            <FormField
                                control={form.control}
                                name="pendingExpenses"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gastos Pendientes</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Con comprobante pero no registrados
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Variance Display */}
                        {selectedFundId && actualCash && (
                            <Card className={`p-4 ${variance === 0 ? 'bg-emerald-50' : variancePercentage > 5 ? 'bg-red-50' : variancePercentage > 1 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {getVarianceIcon()}
                                        <div>
                                            <p className="text-sm font-medium">Diferencia Detectada</p>
                                            <p className="text-xs text-muted-foreground">
                                                {variance === 0 ? "Arqueo cuadrado" : variancePercentage > 5 ? "Crítico - Requiere investigación" : variancePercentage > 1 ? "Atención requerida" : "Diferencia menor"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${getVarianceColor()}`}>
                                            {variance > 0 ? "+" : ""}S/ {variance.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {variancePercentage.toFixed(2)}% de variación
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Audited By */}
                        <FormField
                            control={form.control}
                            name="auditedBy"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Auditor / Verificador</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del auditor" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Responsible Present */}
                        <FormField
                            control={form.control}
                            name="responsiblePresent"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">
                                            ¿Responsable presente?
                                        </FormLabel>
                                        <FormDescription>
                                            El encargado del fondo estuvo presente durante el arqueo
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {/* Findings */}
                        <FormField
                            control={form.control}
                            name="findings"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hallazgos del Arqueo</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe cualquier hallazgo o anomalía..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Recommendations */}
                        <FormField
                            control={form.control}
                            name="recommendations"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recomendaciones</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Recomendaciones para mejorar el control..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Registrar Arqueo
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
