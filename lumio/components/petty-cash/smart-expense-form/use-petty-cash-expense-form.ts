"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCreatePettyCashExpense, usePettyCashFunds } from "@/hooks/use-petty-cash"
import { usePettyCashCategories, useSmartPettyCash, useRecentVendors, PERU_TAX_RATES, COMMON_VENDORS } from "@/hooks/use-smart-petty-cash"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const pettyCashExpenseSchema = z.object({
    fundId: z.string().min(1, "Selecciona un fondo"),
    expenseDate: z.date(),
    amount: z.string().default(""),
    description: z.string().min(1, "Descripción requerida"),
    categoryId: z.string().default(""),
    subcategoryId: z.string().default(""),
    receiptType: z.enum(["BOLETA", "FACTURA", "RECIBO", "TICKET", "OTRO"]),
    receiptNumber: z.string().default(""),
    vendor: z.string().default(""),
    taxableAmount: z.string().default(""),
    taxRate: z.string().default("18"),
    taxAmount: z.string().default(""),
    justification: z.string().default(""),
    attachmentUrl: z.string().default(""),
})

export type PettyCashExpenseFormValues = z.infer<typeof pettyCashExpenseSchema>

// Receipt type options
export const RECEIPT_TYPES = [
    { value: "BOLETA", label: "Boleta", shortcut: "B", color: "bg-blue-500", description: "Persona natural" },
    { value: "FACTURA", label: "Factura", shortcut: "F", color: "bg-emerald-500", description: "Con IGV deducible" },
    { value: "RECIBO", label: "R.H.", shortcut: "R", color: "bg-amber-500", description: "Honorarios" },
    { value: "TICKET", label: "Ticket", shortcut: "T", color: "bg-purple-500", description: "Máquina registradora" },
    { value: "OTRO", label: "Otro", shortcut: "O", color: "bg-slate-500", description: "Sin comprobante" },
]

export { PERU_TAX_RATES, COMMON_VENDORS }

export function usePettyCashExpenseForm(defaultFundId?: string, onSuccess?: () => void) {
    const router = useRouter()
    const { mutateAsync: createExpense, isPending: isLoading } = useCreatePettyCashExpense()
    const { data: funds } = usePettyCashFunds("ACTIVE")
    const { data: categories, isLoading: loadingCategories } = usePettyCashCategories()
    const { data: recentVendors } = useRecentVendors()
    const { pettyCashSimpleMode, enableAIReceiptScanning } = useSettingsStore()

    // UI State
    const [step, setStep] = useState<'wizard' | 'details'>('wizard')
    const [isUploading, setIsUploading] = useState(false)
    const [isScanning, setIsScanning] = useState(false)

    const form = useForm<PettyCashExpenseFormValues>({
        resolver: zodResolver(pettyCashExpenseSchema),
        defaultValues: {
            fundId: defaultFundId || "",
            expenseDate: new Date(),
            amount: "",
            description: "",
            categoryId: "",
            subcategoryId: "",
            receiptType: "BOLETA",
            receiptNumber: "",
            vendor: "",
            taxableAmount: "",
            taxRate: "18",
            taxAmount: "",
            justification: "",
            attachmentUrl: "",
        },
    })

    // Watch values
    const description = form.watch("description")
    const fundId = form.watch("fundId")
    const receiptType = form.watch("receiptType")
    const receiptNumber = form.watch("receiptNumber")
    const taxableAmount = form.watch("taxableAmount")
    const taxRate = form.watch("taxRate")
    const amount = form.watch("amount")
    const categoryId = form.watch("categoryId")
    const subcategoryId = form.watch("subcategoryId")
    const vendor = form.watch("vendor")
    const taxAmount = form.watch("taxAmount")

    // Smart suggestions based on description
    const { suggestions, learn } = useSmartPettyCash(description, categories || [])

    // Auto-apply suggestions when typing
    useEffect(() => {
        if (suggestions && suggestions.confidence > 0.6) {
            // Auto-fill vendor if not set
            if (!vendor && suggestions.vendor) {
                form.setValue('vendor', suggestions.vendor)
            }
            // Auto-fill category if not set
            if (!categoryId && suggestions.categoryId) {
                form.setValue('categoryId', suggestions.categoryId)
            }
            // Auto-fill receipt type if not set or still default
            if (suggestions.receiptType && receiptType === 'BOLETA') {
                form.setValue('receiptType', suggestions.receiptType as any)
            }
        }
    }, [suggestions, vendor, categoryId, receiptType, form])

    // Auto-select fund if only one available or not set
    useEffect(() => {
        if (funds && funds.length > 0 && !fundId) {
            // Predictably select the first active fund
            form.setValue('fundId', funds[0].id)
        }
    }, [funds, fundId, form])

    // Auto-detect receipt type from number
    useEffect(() => {
        if (!receiptNumber) return
        const upperNumber = receiptNumber.toUpperCase()
        if (upperNumber.startsWith('F')) {
            form.setValue('receiptType', 'FACTURA')
        } else if (upperNumber.startsWith('B')) {
            form.setValue('receiptType', 'BOLETA')
        } else if (upperNumber.startsWith('E')) {
            form.setValue('receiptType', 'RECIBO')
        }
    }, [receiptNumber, form])

    // Calculate IGV for FACTURA
    useEffect(() => {
        if (receiptType !== 'FACTURA' || taxRate === 'inafecto') {
            form.setValue('taxAmount', "0.00")
            return
        }

        const base = parseFloat(taxableAmount || "0")
        const rate = parseFloat(taxRate || "18") / 100
        const igv = base * rate

        form.setValue('taxAmount', igv.toFixed(2))
    }, [taxableAmount, taxRate, receiptType, form])

    // Selected fund
    const selectedFund = useMemo(() => {
        return funds?.find((f: any) => f.id === fundId)
    }, [funds, fundId])

    // Selected category
    const selectedCategory = useMemo(() => {
        const cat = categories?.find((c: any) => c.id === categoryId)
        if (!cat) return null

        if (subcategoryId && cat.subcategories) {
            const sub = cat.subcategories.find((s: any) => s.id === subcategoryId)
            if (sub) {
                return { ...cat, subcategoryName: sub.name }
            }
        }
        return cat
    }, [categories, categoryId, subcategoryId])

    // Calculate total
    const calculatedTotal = useMemo(() => {
        if (receiptType === 'FACTURA') {
            const base = parseFloat(taxableAmount || "0")
            const igv = parseFloat(taxAmount || "0")
            return base + igv
        }
        return parseFloat(amount || "0")
    }, [receiptType, taxableAmount, taxAmount, amount])

    // Insufficient funds check
    const insufficientFunds = useMemo(() => {
        if (!selectedFund) return false
        return calculatedTotal > Number(selectedFund.currentBalance)
    }, [calculatedTotal, selectedFund])

    // Submit handler
    const onSubmit = async (values: PettyCashExpenseFormValues) => {
        try {
            let finalAmount: number
            let finalTaxableAmount: number | undefined
            let finalTaxAmount: number | undefined

            if (values.receiptType === "FACTURA" && values.taxRate !== 'inafecto') {
                const base = parseFloat(values.taxableAmount || "0")
                const igv = parseFloat(values.taxAmount || "0")
                finalAmount = base + igv
                finalTaxableAmount = base
                finalTaxAmount = igv
            } else {
                finalAmount = parseFloat(values.amount || "0")
                finalTaxableAmount = undefined
                finalTaxAmount = undefined
            }

            const payload: any = {
                fundId: values.fundId,
                expenseDate: values.expenseDate.toISOString(),
                amount: finalAmount,
                description: values.description,
                receiptType: values.receiptType,
                status: pettyCashSimpleMode ? 'APPROVED' : 'PENDING'
            }

            if (values.categoryId?.trim()) payload.categoryId = values.categoryId
            if (values.subcategoryId?.trim()) payload.subcategoryId = values.subcategoryId
            if (values.vendor?.trim()) payload.vendor = values.vendor
            if (values.receiptNumber?.trim()) payload.receiptNumber = values.receiptNumber
            if (values.justification?.trim()) payload.justification = values.justification
            if (values.attachmentUrl?.trim()) payload.attachmentUrl = values.attachmentUrl
            if (finalTaxableAmount !== undefined) payload.taxableAmount = finalTaxableAmount
            if (finalTaxAmount !== undefined) payload.taxAmount = finalTaxAmount

            await createExpense(payload)

            // Learn from this submission
            learn({
                description: values.description,
                vendor: values.vendor,
                categoryId: values.categoryId || '',
                subcategoryId: values.subcategoryId,
                receiptType: values.receiptType,
                amount: finalAmount
            })

            toast.success("Gasto registrado")

            if (onSuccess) {
                onSuccess()
            } else {
                router.push('/dashboard/petty-cash')
            }
        } catch (error: any) {
            console.error(error)
            toast.error("Error al registrar", {
                description: error.message || "Intenta de nuevo"
            })
        }
    }

    // Upload to Google Drive (with auto-convert to PDF for images)
    const uploadFile = async (file: File) => {
        setIsUploading(true)
        try {
            // Get current form values for filename generation
            const receiptNumber = form.getValues('receiptNumber') || 'SN'
            const currentVendor = form.getValues('vendor') || 'PROVEEDOR'

            // Generate filename: NUMFACTURA-PROVEEDOR
            // Clean vendor name: uppercase, no special chars, use hyphens
            const cleanVendor = currentVendor
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 30) // Limit length

            const customFilename = `${receiptNumber}-${cleanVendor}`

            const formData = new FormData()
            formData.append('file', file)
            // Always convert images to PDF for better organization
            formData.append('convertToPdf', 'true')
            // Include vendor for PDF metadata
            formData.append('vendor', currentVendor)
            // Include fund code for folder structure (Año/Mes/CódigoFondo)
            console.log('[UPLOAD_HOOK] selectedFund:', selectedFund)
            if (selectedFund?.fundCode) {
                formData.append('fundCode', selectedFund.fundCode)
                console.log('[UPLOAD_HOOK] Sending fundCode:', selectedFund.fundCode)
            } else {
                console.log('[UPLOAD_HOOK] No fundCode available, selectedFund:', selectedFund)
            }
            // IMPORTANT: Set document type to PETTY_CASH
            formData.append('documentType', 'PETTY_CASH')

            const response = await fetch('/api/google-drive/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.status === 403) {
                const data = await response.json()
                if (data.code === 'DRIVE_NOT_CONNECTED') {
                    toast.error("Google Drive no conectado", {
                        description: "Autoriza el acceso primero",
                        action: {
                            label: "Conectar",
                            onClick: () => {
                                const width = 500, height = 600
                                const left = (window.screen.width / 2) - (width / 2)
                                const top = (window.screen.height / 2) - (height / 2)
                                window.open(data.authUrl, 'GoogleDriveAuth', `width=${width},height=${height},left=${left},top=${top}`)
                            }
                        }
                    })
                    return
                }
            }

            if (!response.ok) throw new Error("Error al subir")

            const result = await response.json()
            form.setValue("attachmentUrl", result.viewLink)
            toast.success(result.converted ? "Convertido a PDF y subido" : "Subido a Drive")
        } catch (error: any) {
            toast.error("Error al subir")
        } finally {
            setIsUploading(false)
        }
    }

    // AI Receipt Scanning
    const scanReceipt = async (file: File) => {
        if (!enableAIReceiptScanning) {
            // Just upload without scanning
            await uploadFile(file)
            return
        }

        setIsScanning(true)
        try {
            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
            if (!validTypes.includes(file.type)) {
                toast.error("Formato no soportado")
                return
            }

            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64Image = reader.result as string

                const response = await fetch('/api/ai/scan-receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64Image })
                })

                if (!response.ok) throw new Error("Error al escanear")

                const data = await response.json()

                // Auto-fill form
                if (data.amount) form.setValue('amount', data.amount.toString())
                if (data.date) form.setValue('expenseDate', new Date(data.date))
                if (data.vendor) form.setValue('vendor', data.vendor)
                if (data.receiptNumber) form.setValue('receiptNumber', data.receiptNumber)
                if (data.receiptType) form.setValue('receiptType', data.receiptType as any)
                if (data.description) form.setValue('description', data.description)

                // Handle Factura
                if (data.receiptType === 'FACTURA' && data.amount) {
                    const total = data.amount
                    const rate = parseFloat(form.getValues('taxRate') || '18') / 100
                    const base = total / (1 + rate)
                    form.setValue('taxableAmount', base.toFixed(2))
                }

                toast.success("Datos extraídos con IA")
                await uploadFile(file)
            }
        } catch (error: any) {
            toast.error("Error al escanear")
            // Still try to upload
            await uploadFile(file)
        } finally {
            setIsScanning(false)
        }
    }

    // Quick fill from vendor
    const fillFromVendor = useCallback((vendorName: string) => {
        form.setValue('vendor', vendorName)

        // Find matching pattern
        const vendorData = COMMON_VENDORS.find(v => v.name === vendorName)
        if (vendorData) {
            // Try to find matching category
            const matchingCategory = categories?.find((c: any) =>
                vendorData.keywords.some(k =>
                    c.name.toLowerCase().includes(k) ||
                    vendorData.name.toLowerCase().includes(c.name.toLowerCase())
                )
            )
            if (matchingCategory) {
                form.setValue('categoryId', matchingCategory.id)
            }
        }
    }, [categories, form])

    return {
        form,
        funds: funds || [],
        categories: categories || [],
        loadingCategories,
        recentVendors: recentVendors || [],
        selectedFund,
        selectedCategory,
        suggestions,
        calculatedTotal,
        insufficientFunds,
        isLoading,
        isUploading,
        isScanning,
        pettyCashSimpleMode,
        enableAIReceiptScanning,
        // Steps
        step,
        setStep,
        // Actions
        onSubmit,
        uploadFile,
        scanReceipt,
        fillFromVendor,
    }
}
