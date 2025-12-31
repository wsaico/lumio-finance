"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTransactions } from "@/hooks/use-transactions"
import { useAccounts } from "@/hooks/use-accounts"
import { useCategories } from "@/hooks/use-categories"
import { useSavingsGoals } from "@/hooks/use-savings-goals"
import { useLoans } from "@/hooks/use-loans"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Comprehensive Schema
export const transactionFormSchema = z.object({
    amount: z.string().min(1, "El monto es requerido"),
    description: z.string().optional(),
    transactionDate: z.date(),
    accountId: z.string().min(1, "Cuenta requerida"),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
    mode: z.string().optional(),
    scheduledType: z.enum(["MANUAL", "AUTO"]),
    isAutoExecute: z.boolean(),
    recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
    recurrenceInterval: z.number(),
    recurrenceUnit: z.enum(["days", "weeks", "months"]),
    contactName: z.string().optional(),
    notes: z.string().optional(),
    attachmentUrl: z.string().optional(),
    transferToAccountId: z.string().optional(),
    loanId: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function useTransactionForm(initialData?: any, onSuccess?: () => void) {
    const router = useRouter()
    const { createTransaction, updateTransaction, deleteTransaction } = useTransactions({})
    const { transactionAccounts: accounts } = useAccounts() // Uses filtered accounts (excludes PETTY_CASH)
    const { categories } = useCategories()

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false)
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE")

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: {
            amount: initialData?.amount?.toString() || "",
            description: initialData?.description || "",
            transactionDate: initialData?.transaction_date ? new Date(initialData.transaction_date) :
                initialData?.transactionDate ? new Date(initialData.transactionDate) :
                    initialData?.date ? new Date(initialData.date) : new Date(),
            accountId: initialData?.account_id || initialData?.accountId || accounts?.[0]?.id || "",
            categoryId: initialData?.expense_category_id || initialData?.expenseCategoryId ||
                initialData?.income_category_id || initialData?.incomeCategoryId ||
                initialData?.categoryId || "",
            subcategoryId: initialData?.sub_category_id || initialData?.subcategoryId || "",
            type: initialData?.transaction_type || initialData?.transactionType || initialData?.type || "EXPENSE",
            mode: initialData?.metadata?.mode || "DEFAULT",
            scheduledType: initialData?.metadata?.scheduledType || "MANUAL",
            isAutoExecute: initialData?.metadata?.isAutoExecute ?? false,
            recurrence: initialData?.metadata?.recurrence || "NONE",
            recurrenceInterval: initialData?.metadata?.recurrenceInterval || 1,
            recurrenceUnit: initialData?.metadata?.recurrenceUnit || "days",
            contactName: initialData?.metadata?.contactName || "",
            notes: initialData?.notes || "",
            attachmentUrl: initialData?.attachment_url || initialData?.attachmentUrl || "",
            transferToAccountId: initialData?.transfer_to_account_id || initialData?.transferToAccountId || "",
            loanId: initialData?.loan_id || initialData?.loanId || "",
        },
    })

    // Sync activeTab with type
    useEffect(() => {
        if (initialData) {
            const type = initialData.transaction_type || initialData.transactionType || initialData.type || "EXPENSE"
            setActiveTab(type)
        }
    }, [initialData])

    // Auto-open wizard if description is empty (New Transaction Flow)
    useEffect(() => {
        if (!initialData && !form.getValues("description")) {
            setIsWizardOpen(true)
        }
    }, [initialData])

    const onSubmit = async (values: TransactionFormValues) => {
        try {
            const payload: any = {
                ...values,
                amount: parseFloat(values.amount),
                date: values.transactionDate,
                currency: accounts?.find(a => a.id === values.accountId)?.currencyCode || 'USD',
                metadata: {
                    mode: values.mode,
                    contactName: values.contactName,
                    scheduledType: values.scheduledType,
                    isAutoExecute: values.isAutoExecute,
                    recurrence: values.recurrence,
                    recurrenceInterval: values.recurrenceInterval,
                    recurrenceUnit: values.recurrenceUnit
                },
                categoryId: values.categoryId || undefined,
                subcategoryId: values.subcategoryId || undefined,
                transferToAccountId: values.transferToAccountId || undefined,
                loanId: values.loanId || undefined,
            }

            // Explicitly ensure we don't send empty strings for IDs
            if (payload.categoryId === "") payload.categoryId = undefined;
            if (payload.subcategoryId === "") payload.subcategoryId = undefined;
            if (payload.transferToAccountId === "") payload.transferToAccountId = undefined;
            if (payload.loanId === "") payload.loanId = undefined;

            if (initialData) {
                await updateTransaction.mutateAsync({ id: initialData.id, ...payload })
            } else {
                await createTransaction.mutateAsync(payload)
            }

            if (onSuccess) onSuccess()
            else router.push('/dashboard')

        } catch (error: any) {
            console.error(error)
            const errorData = error.response?.data || {}

            // Handle PETTY_CASH account error
            if (errorData.accountType === 'PETTY_CASH' || error.message?.includes('Caja Chica')) {
                toast.error("Cuenta de Caja Chica", {
                    description: "Los gastos de caja chica deben registrarse en el módulo de Caja Chica para mantener el control interno.",
                    action: {
                        label: "Ir a Caja Chica",
                        onClick: () => router.push('/dashboard/petty-cash')
                    },
                    duration: 8000
                })
            } else if (errorData.error === 'Saldo insuficiente' || error.message?.includes('Saldo insuficiente')) {
                toast.error("Saldo Insuficiente", { description: "No tienes fondos suficientes en esta cuenta." })
            } else {
                toast.error("Error al guardar", { description: errorData.details || error.message })
            }
        }
    }

    const { data: goalsData } = useSavingsGoals()
    const { loans } = useLoans()

    return {
        form,
        isWizardOpen,
        setIsWizardOpen,
        isCategoryPickerOpen,
        setIsCategoryPickerOpen,
        activeTab,
        setActiveTab,
        onSubmit,
        accounts,
        categories,
        goals: (goalsData as any)?.goals || [],
        loans: loans || [],
        deleteTransaction
    }
}
