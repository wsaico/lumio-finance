"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Check, ChevronsUpDown, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useAccounts } from "@/hooks/useAccounts"
import { BANK_PRESETS } from "@/lib/constants/banks"
import { cn } from "@/lib/utils"

// Manual definition
interface Account {
    id: string
    userId: string
    name: string
    accountType: string
    currencyCode: string
    initialBalance: any
    color: string
    fixedFundAmount?: any
    icon: string
    bankName?: string | null
    accountNumber?: string | null
    customBankName?: string | null
    lastFourDigits?: string | null
    creditLimit?: any
    closingDay?: number | null
    paymentDueDay?: number | null
    cardNetwork?: string | null
    interestRate?: any
    minPaymentPercent?: any
}

const formSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    type: z.enum(["CASH", "BANK", "DIGITAL", "INVESTMENT", "PETTY_CASH", "CREDIT_CARD"]),
    currency: z.string().length(3, "Código de moneda de 3 letras"),
    balance: z.string().refine((val) => !isNaN(Number(val)), {
        message: "Debe ser un número válido",
    }).optional(),
    fixedFund: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional().refine((val) => !val || val.length === 4, {
        message: "Debe tener exactamente 4 dígitos"
    }),
    customBankName: z.string().optional(),
    // Credit Card fields
    lastFourDigits: z.string().optional().refine((val) => !val || val.length === 4, {
        message: "Debe tener exactamente 4 dígitos"
    }),
    creditLimit: z.string().optional(),
    closingDay: z.string().optional(),
    paymentDueDay: z.string().optional(),
    cardNetwork: z.enum(["VISA", "MASTERCARD", "AMEX", "DISCOVER", "OTHER"]).optional(),
    interestRate: z.string().optional(),
    minPaymentPercent: z.string().optional()
}).refine((data) => {
    // If bankName is "custom", customBankName is required
    if (data.bankName === "custom") {
        return data.customBankName && data.customBankName.trim().length > 0
    }
    return true
}, {
    message: "El nombre del banco personalizado es requerido",
    path: ["customBankName"]
})

interface AccountFormModalProps {
    account?: Account
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onCreated?: (id: string) => void
}

export function AccountFormModal({ account, trigger, open: controlledOpen, onOpenChange, onCreated }: AccountFormModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange : setInternalOpen
    const [openCombobox, setOpenCombobox] = useState(false)

    const { createAccount, updateAccount } = useAccounts()
    const isEdit = !!account

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: "BANK",
            currency: "PEN",
            balance: "0",
            fixedFund: "0",
            color: "#0ea5e9",
            icon: "wallet",
            lastFourDigits: "",
            creditLimit: "",
            closingDay: "",
            paymentDueDay: "",
            cardNetwork: undefined,
            interestRate: "",
            minPaymentPercent: ""
        },
    })

    useEffect(() => {
        if (account && open) {
            form.reset({
                name: account.name,
                type: account.accountType as any,
                currency: account.currencyCode,
                balance: account.initialBalance.toString(),
                fixedFund: account.fixedFundAmount ? account.fixedFundAmount.toString() : "0",
                color: account.color,
                icon: account.icon,
                bankName: account.bankName || undefined,
                accountNumber: account.accountNumber || "",
                customBankName: account.customBankName || undefined,
                lastFourDigits: account.lastFourDigits || "",
                creditLimit: account.creditLimit ? account.creditLimit.toString() : "",
                closingDay: account.closingDay ? account.closingDay.toString() : "",
                paymentDueDay: account.paymentDueDay ? account.paymentDueDay.toString() : "",
                cardNetwork: account.cardNetwork as any || undefined,
                interestRate: account.interestRate ? account.interestRate.toString() : "",
                minPaymentPercent: account.minPaymentPercent ? account.minPaymentPercent.toString() : ""
            })
        } else if (!account && open) {
            form.reset({
                name: "",
                type: "BANK",
                currency: "PEN",
                balance: "0",
                fixedFund: "0",
                color: "#0ea5e9",
                icon: "wallet",
                bankName: undefined,
                accountNumber: "",
                customBankName: undefined,
                lastFourDigits: "",
                creditLimit: "",
                closingDay: "",
                paymentDueDay: "",
                cardNetwork: undefined,
                interestRate: "",
                minPaymentPercent: ""
            })
        }
    }, [account, open, form])

    const handlePresetSelect = (preset: any) => {
        form.setValue('name', preset.name)
        form.setValue('color', preset.color)
        if (preset.type) form.setValue('type', preset.type as any)

        // Set bankName for preset selection
        if (preset.isCustom) {
            form.setValue('bankName', 'custom')
        } else {
            form.setValue('bankName', preset.id)
            form.setValue('customBankName', undefined)
        }

        setOpenCombobox(false)
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            // Si es un banco personalizado, usa customBankName como nombre
            const accountName = values.bankName === 'custom' && values.customBankName
                ? values.customBankName
                : values.name

            const payload: any = {
                name: accountName,
                type: values.type,
                currency: values.currency,
                color: values.color,
                fixedFundAmount: values.type === 'PETTY_CASH' && values.fixedFund ? Number(values.fixedFund) : undefined,
                icon: 'wallet',
                initialBalance: values.balance ? Number(values.balance) : 0,
                bankName: values.bankName,
                accountNumber: values.accountNumber,
                customBankName: values.customBankName
            }

            // Credit Card specific fields
            if (values.type === 'CREDIT_CARD') {
                payload.lastFourDigits = values.lastFourDigits
                payload.creditLimit = values.creditLimit ? Number(values.creditLimit) : undefined
                payload.closingDay = values.closingDay ? Number(values.closingDay) : undefined
                payload.paymentDueDay = values.paymentDueDay ? Number(values.paymentDueDay) : undefined
                payload.cardNetwork = values.cardNetwork
                payload.interestRateAnnual = values.interestRate ? Number(values.interestRate) : undefined
                payload.minPaymentPercent = values.minPaymentPercent ? Number(values.minPaymentPercent) : 5
                payload.usedBalance = 0
                payload.initialBalance = 0 // Credit cards start at 0
            }

            if (isEdit && account) {
                await updateAccount.mutateAsync({
                    id: account.id,
                    data: { ...payload, accountType: values.type, currencyCode: values.currency }
                })
            } else {
                payload.balance = values.balance ? Number(values.balance) : 0
                const res = await createAccount.mutateAsync(payload)
                if (onCreated && res.id) onCreated(res.id)
            }
            if (setOpen) setOpen(false)
            form.reset()
        } catch (error) {
            console.error('Error submitting form:', error)
        }
    }

    const isLoading = createAccount.isPending || updateAccount.isPending

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : trigger === null ? null : !isControlled && (
                <DialogTrigger asChild>
                    <Button className="gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                        <Plus className="h-4 w-4" />
                        Nueva Cuenta
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[600px] border-none shadow-2xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="pb-3 pt-6 px-6 border-b">
                    <DialogTitle className="text-xl">{isEdit ? "Editar Cuenta" : "Crear Nueva Cuenta"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Modifica los detalles de tu cuenta." : "Ingresa el nombre del banco o elije uno de la lista."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">

                            {/* Smart Name Combobox */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-xs font-semibold">Nombre de la Cuenta / Banco</FormLabel>
                                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openCombobox}
                                                        className={cn(
                                                            "w-full justify-between h-10 text-left font-normal bg-muted/30",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value || "Ej. BCP, Interbank, Mi Caja Fuerte..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[450px] p-0" align="start">
                                                <Command>
                                                    <CommandInput
                                                        placeholder="Buscar banco..."
                                                        onValueChange={(search) => {
                                                            // Allow custom typing if name doesn't match preset
                                                            if (search) form.setValue('name', search)
                                                        }}
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <div className="p-2 text-sm text-muted-foreground">
                                                                "{form.watch('name')}" se creará como cuenta personalizada.
                                                            </div>
                                                        </CommandEmpty>
                                                        <CommandGroup heading="Bancos Populares y Apps">
                                                            {BANK_PRESETS.map((bank) => (
                                                                <CommandItem
                                                                    key={bank.id}
                                                                    value={bank.name}
                                                                    onSelect={() => handlePresetSelect(bank)}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <div
                                                                        className="flex items-center justify-center w-8 h-8 rounded-full mr-3 text-[10px] font-bold text-white shadow-sm"
                                                                        style={{ background: `linear-gradient(135deg, ${bank.color}, ${bank.color}aa)` }}
                                                                    >
                                                                        {bank.name.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{bank.name}</span>
                                                                        <span className="text-[10px] text-muted-foreground opacity-80">
                                                                            {bank.type === 'DIGITAL' ? 'Billetera Digital' : bank.type === 'CUSTOM' ? 'Personalizado' : 'Banco'}
                                                                        </span>
                                                                    </div>
                                                                    {field.value === bank.name && <Check className="ml-auto h-4 w-4 opacity-100 text-primary" />}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Tipo de Cuenta</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-muted/30 h-10">
                                                        <SelectValue placeholder="Seleccionar Tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="BANK">Cuenta Bancaria</SelectItem>
                                                    <SelectItem value="CASH">Efectivo</SelectItem>
                                                    <SelectItem value="DIGITAL">Billetera Digital</SelectItem>
                                                    <SelectItem value="INVESTMENT">Inversión</SelectItem>
                                                    <SelectItem value="CREDIT_CARD">Tarjeta de Crédito</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Moneda</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-muted/30 h-10">
                                                        <SelectValue placeholder="USD" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="USD">USD ($)</SelectItem>
                                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                                    <SelectItem value="PEN">PEN (S/)</SelectItem>
                                                    <SelectItem value="MXN">MXN ($)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Custom Bank Name - shown only when "Personalizado" is selected */}
                            {form.watch("bankName") === "custom" && (
                                <FormField
                                    control={form.control}
                                    name="customBankName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Nombre del Banco Personalizado</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ej: Mi Banco, Caja Fuerte Personal, etc."
                                                    className="bg-muted/30 h-10"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                Ingresa el nombre de tu banco o entidad financiera
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Account Number - for Bank/Digital/Investment accounts - ONLY LAST 4 DIGITS */}
                            {(form.watch("type") === "BANK" || form.watch("type") === "DIGITAL" || form.watch("type") === "INVESTMENT") && (
                                <FormField
                                    control={form.control}
                                    name="accountNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Últimos 4 dígitos de la cuenta (opcional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    maxLength={4}
                                                    placeholder="1234"
                                                    className="bg-muted/30 font-mono h-10 text-center"
                                                    {...field}
                                                    value={field.value || ""}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-muted-foreground">
                                                Solo los últimos 4 dígitos para mayor seguridad
                                            </p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem className="hidden">
                                        <Input {...field} />
                                    </FormItem>
                                )}
                            />

                            {/* Hidden field for bankName */}
                            <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <FormItem className="hidden">
                                        <Input {...field} value={field.value || ""} />
                                    </FormItem>
                                )}
                            />

                            {form.watch("type") === "CREDIT_CARD" && (
                                <div className="space-y-3 pt-2 pb-1">
                                    {/* Sección 1: Información de Tarjeta */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos de Tarjeta</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="lastFourDigits"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Últimos 4 dígitos</FormLabel>
                                                        <FormControl>
                                                            <Input maxLength={4} placeholder="1234" className="bg-muted/30 font-mono text-center h-9" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="cardNetwork"
                                                render={({ field }) => (
                                                    <FormItem className="col-span-2">
                                                        <FormLabel className="text-xs">Red de Tarjeta</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-muted/30 h-9">
                                                                    <SelectValue placeholder="Seleccionar" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="VISA">Visa</SelectItem>
                                                                <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                                                                <SelectItem value="AMEX">American Express</SelectItem>
                                                                <SelectItem value="DISCOVER">Discover</SelectItem>
                                                                <SelectItem value="OTHER">Otra</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Sección 2: Límite de Crédito */}
                                    <div className="space-y-2 pt-1">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Límite</h4>
                                        <FormField
                                            control={form.control}
                                            name="creditLimit"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" placeholder="10000.00" className="bg-muted/30 font-mono h-9" {...field} value={field.value || ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Sección 3: Ciclo de Facturación */}
                                    <div className="space-y-2 pt-1">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ciclo de Facturación</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="closingDay"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Día de Corte</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" min="1" max="31" placeholder="15" className="bg-muted/30 h-9" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="paymentDueDay"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Día de Pago</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" min="1" max="31" placeholder="25" className="bg-muted/30 h-9" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Sección 4: Tasas y Pagos */}
                                    <div className="space-y-2 pt-1">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tasas y Pagos</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="interestRate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Interés Anual (%)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" placeholder="24.00" className="bg-muted/30 h-9" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="minPaymentPercent"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Pago Mínimo (%)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" placeholder="5.00" className="bg-muted/30 h-9" {...field} value={field.value || ""} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {form.watch("type") === "PETTY_CASH" && (
                                <FormField
                                    control={form.control}
                                    name="fixedFund"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Fondo Fijo (Recurrente)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="1500.00" className="bg-muted/30 font-mono h-9" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {!isEdit && (
                                <FormField
                                    control={form.control}
                                    name="balance"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold">Saldo Inicial</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" className="text-base font-bold bg-muted/30 h-10" {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                        </div>

                        <DialogFooter className="border-t px-6 py-4 mt-auto bg-muted/10">
                            <Button type="button" variant="outline" onClick={() => setOpen?.(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading} className="min-w-[140px]">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "Guardar" : "Crear Cuenta"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
