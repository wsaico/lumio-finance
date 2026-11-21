"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTransactions } from "@/hooks/useTransactions"
import { useAccounts } from "@/hooks/useAccounts"
import { useCategories } from "@/hooks/useCategories"
import { useSavingsGoals } from "@/hooks/useSavingsGoals"
import { useLoans } from "@/hooks/useLoans"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { DEFAULT_CURRENCY } from "@/lib/currencies"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export const transactionFormSchema = z.object({
    amount: z.string().min(1, "Ingresa un monto válido"),
    description: z.string().trim().min(1, "Ingresa una descripción"),
    transactionDate: z.date(),
    accountId: z.string().min(1, "Selecciona una cuenta"),
    categoryId: z.string().optional(),
    subcategoryId: z.string().optional(),
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
    mode: z.string().optional(),
    scheduledType: z.enum(["MANUAL", "AUTO"]),
    isAutoExecute: z.boolean(),
    recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
    recurrenceInterval: z.number(),
    recurrenceUnit: z.enum(["days", "weeks", "months", "years"]),
    initialPaymentState: z.enum(["PENDING", "PAID_TODAY"]).optional(),
    recurrenceLimitMode: z.enum(["FOREVER", "UNTIL_DATE", "COUNT"]).optional(),
    recurrenceEndDate: z.string().optional().nullable(),
    recurrenceCount: z.number().optional(),
    reminderDays: z.number().optional(),
    contactName: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    attachmentUrl: z.string().optional(),
    transferToAccountId: z.string().optional(),
    loanId: z.string().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function useTransactionForm(
    initialData?: any,
    onSuccess?: () => void,
    initialType?: "EXPENSE" | "INCOME" | "TRANSFER",
    initialAccountId?: string,
    initialToAccountId?: string
) {
    const router = useRouter()
    const { createTransaction, updateTransaction, deleteTransaction } = useTransactions({})
    const { accounts } = useAccounts()
    const { categories } = useCategories()
    const { data: goalsData } = useSavingsGoals()
    const { loans } = useLoans()

    const resolvedInitialType: "EXPENSE" | "INCOME" | "TRANSFER" =
        initialData?.transaction_type ||
        initialData?.transactionType ||
        initialData?.type ||
        initialType ||
        "EXPENSE"

    const [activeTab, setActiveTab] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(resolvedInitialType)

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: {
            amount: initialData?.amount?.toString() || "",
            description: initialData?.description || "",
            transactionDate: initialData?.transaction_date
                ? new Date(initialData.transaction_date)
                : initialData?.transactionDate
                    ? new Date(initialData.transactionDate)
                    : initialData?.date
                        ? new Date(initialData.date)
                        : new Date(),
            accountId: initialData?.account_id || initialData?.accountId || initialAccountId || accounts?.[0]?.id || "",
            categoryId:
                initialData?.expense_category_id ||
                initialData?.expenseCategoryId ||
                initialData?.income_category_id ||
                initialData?.incomeCategoryId ||
                initialData?.categoryId ||
                "",
            subcategoryId: initialData?.sub_category_id || initialData?.subcategoryId || "",
            type: resolvedInitialType,
            mode: initialData?.metadata?.mode || "DEFAULT",
            scheduledType:
                initialData?.metadata?.scheduledType ||
                (useSettingsStore.getState().defaultAutoPayRecurring ? "AUTO" : "MANUAL"),
            isAutoExecute:
                initialData?.metadata?.isAutoExecute ??
                useSettingsStore.getState().defaultAutoPayRecurring,
            recurrence: initialData?.metadata?.recurrence || "NONE",
            recurrenceInterval: initialData?.metadata?.recurrenceInterval || 1,
            recurrenceUnit: initialData?.metadata?.recurrenceUnit || "months",
            initialPaymentState: initialData?.metadata?.initialPaymentState || "PENDING",
            recurrenceLimitMode: initialData?.metadata?.recurrenceLimitMode || "FOREVER",
            recurrenceEndDate: initialData?.metadata?.recurrenceEndDate || null,
            recurrenceCount: initialData?.metadata?.recurrenceCount || 12,
            reminderDays: initialData?.metadata?.reminderDays ?? 3,
            contactName: initialData?.metadata?.contactName || "",
            notes: initialData?.notes || "",
            tags: Array.isArray(initialData?.tags) ? initialData.tags : [],
            attachmentUrl: initialData?.attachment_url || initialData?.attachmentUrl || "",
            transferToAccountId:
                initialData?.transfer_to_account_id || initialData?.transferToAccountId || initialToAccountId || "",
            loanId: initialData?.loan_id || initialData?.loanId || "",
        },
    })

    // Sync initial account / destination account once loaded
    useEffect(() => {
        if (!accounts || accounts.length === 0) return

        if (initialType === "TRANSFER" && initialToAccountId) {
            if (!form.getValues("transferToAccountId") && accounts.some((a) => a.id === initialToAccountId)) {
                form.setValue("transferToAccountId", initialToAccountId)
            }
            const curAcc = form.getValues("accountId")
            if (!curAcc || curAcc === initialToAccountId) {
                const candidate =
                    accounts.find((a) => a.id !== initialToAccountId && a.accountType !== "CREDIT_CARD") ||
                    accounts.find((a) => a.id !== initialToAccountId)
                if (candidate) form.setValue("accountId", candidate.id)
            }
            return
        }

        if (initialAccountId && accounts.some((a) => a.id === initialAccountId)) {
            if (!form.getValues("accountId")) {
                form.setValue("accountId", initialAccountId)
            }
            return
        }

        if (!form.getValues("accountId")) {
            form.setValue("accountId", accounts[0].id)
        }
    }, [accounts, form, initialType, initialAccountId, initialToAccountId])

    // Sync activeTab when initialData or initialType changes
    useEffect(() => {
        if (initialData) {
            const type =
                initialData.transaction_type ||
                initialData.transactionType ||
                initialData.type ||
                "EXPENSE"
            setActiveTab(type)
            form.setValue("type", type)
        } else if (initialType) {
            setActiveTab(initialType)
            form.setValue("type", initialType)
        }
    }, [initialData, initialType, form])

    const onSubmit = async (values: TransactionFormValues, stayOnPage = false) => {
        const parsedAmount = parseFloat(values.amount)
        if (!parsedAmount || parsedAmount <= 0) {
            toast.error("Ingresa un monto mayor a 0")
            return
        }

        const trimmedDescription = (values.description || "").trim()
        if (!trimmedDescription) {
            toast.error("Ingresa una descripción para este movimiento")
            return
        }

        if (!values.accountId) {
            toast.error("Selecciona una cuenta")
            return
        }

        if (values.type === "TRANSFER") {
            if (!values.transferToAccountId) {
                toast.error("Selecciona la cuenta de destino")
                return
            }
            if (values.transferToAccountId === values.accountId) {
                toast.error("La cuenta de origen y destino deben ser diferentes")
                return
            }
        } else if (!values.categoryId) {
            toast.error("Selecciona una categoría")
            return
        }

        try {
            const sourceAcc = accounts?.find((a) => a.id === values.accountId)
            const isSpecialScheduledMode =
                values.mode === "SUBSCRIPTION" ||
                values.mode === "RECURRING" ||
                values.mode === "UPCOMING"

            // Compute end date if recurrenceLimitMode === "COUNT"
            let resolvedEndDate: string | null = null
            if (
                (values.mode === "SUBSCRIPTION" || values.mode === "RECURRING") &&
                values.recurrenceLimitMode === "UNTIL_DATE" &&
                values.recurrenceEndDate
            ) {
                resolvedEndDate = values.recurrenceEndDate
            } else if (
                (values.mode === "SUBSCRIPTION" || values.mode === "RECURRING") &&
                values.recurrenceLimitMode === "COUNT" &&
                values.recurrenceCount &&
                values.recurrenceCount > 1
            ) {
                const endD = new Date(values.transactionDate)
                const step = Math.max(1, Number(values.recurrenceInterval || 1)) * (values.recurrenceCount - 1)
                if (values.recurrence === "DAILY") endD.setDate(endD.getDate() + step)
                else if (values.recurrence === "WEEKLY") endD.setDate(endD.getDate() + step * 7)
                else if (values.recurrence === "YEARLY") endD.setFullYear(endD.getFullYear() + step)
                else endD.setMonth(endD.getMonth() + step)
                resolvedEndDate = endD.toISOString().slice(0, 10)
            }

            const effectivePaymentState =
                values.mode === "UPCOMING"
                    ? "PENDING"
                    : isSpecialScheduledMode
                      ? values.initialPaymentState || "PENDING"
                      : "PAID_TODAY"

            const payload: any = {
                ...values,
                description: trimmedDescription,
                amount: parsedAmount,
                date: values.transactionDate.toISOString(),
                recurrenceEndDate: resolvedEndDate,
                currency:
                    sourceAcc?.currencyCode ||
                    useSettingsStore.getState().currencyCode ||
                    DEFAULT_CURRENCY,
                metadata: {
                    mode: values.mode,
                    contactName: values.contactName,
                    scheduledType: values.isAutoExecute ? "AUTO" : "MANUAL",
                    isAutoExecute: values.isAutoExecute,
                    recurrence: values.recurrence,
                    recurrenceInterval: Math.max(1, Number(values.recurrenceInterval || 1)),
                    recurrenceUnit: values.recurrenceUnit,
                    initialPaymentState: effectivePaymentState,
                    dueDate: values.transactionDate.toISOString().slice(0, 10),
                    recurrenceLimitMode: values.recurrenceLimitMode || "FOREVER",
                    recurrenceEndDate: resolvedEndDate,
                    recurrenceCount: values.recurrenceCount || null,
                    reminderDays: Number(values.reminderDays ?? 3),
                },
                categoryId: values.type === "TRANSFER" ? undefined : values.categoryId || undefined,
                subcategoryId: values.type === "TRANSFER" ? undefined : values.subcategoryId || undefined,
                transferToAccountId:
                    values.type === "TRANSFER" ? values.transferToAccountId || undefined : undefined,
                loanId: values.loanId || undefined,
            }

            if (initialData) {
                await updateTransaction.mutateAsync({ id: initialData.id, ...payload })
            } else {
                await createTransaction.mutateAsync(payload)
            }

            // Teach smart category engine silently
            if (values.description && payload.categoryId && values.type !== "TRANSFER") {
                fetch("/api/smart-categories/learn", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        description: values.description,
                        categoryId: payload.categoryId,
                        subcategoryId: payload.subcategoryId,
                    }),
                }).catch(() => undefined)
            }

            const shouldStay = stayOnPage === true && !initialData
            if (shouldStay) {
                // Reset form for next entry while preserving account and date
                form.setValue("amount", "")
                form.setValue("description", "")
                form.setValue("notes", "")
                form.setValue("tags", [])
                form.setValue("attachmentUrl", "")
                toast.success("Guardado · listo para el siguiente", { id: "tx-saved" })
            } else {
                if (!initialData) {
                    const isScheduledPending =
                        (values.mode === "SUBSCRIPTION" ||
                            values.mode === "RECURRING" ||
                            values.mode === "UPCOMING") &&
                        (values.mode === "UPCOMING" || values.initialPaymentState !== "PAID_TODAY")

                    toast.success(
                        isScheduledPending
                            ? values.mode === "SUBSCRIPTION"
                                ? "Suscripción programada"
                                : "Movimiento programado"
                            : "Transacción guardada",
                        {
                            id: "tx-saved",
                            action: {
                                label: isScheduledPending
                                    ? "Ver programados"
                                    : "+ Registrar otra",
                                onClick: () =>
                                    router.push(
                                        isScheduledPending
                                            ? "/dashboard/subscriptions"
                                            : `/dashboard/transactions/new?type=${values.type}`
                                    ),
                            },
                        }
                    )
                    if (onSuccess) onSuccess()
                    else if (isScheduledPending) router.push("/dashboard/subscriptions")
                    else router.push("/dashboard/transactions")
                    return
                }
                if (onSuccess) onSuccess()
                else router.push("/dashboard/transactions")
            }
        } catch (error: any) {
            // useTransactions mutation onError already presents detailed toast feedback
            console.error(error)
        }
    }

    return {
        form,
        activeTab,
        setActiveTab,
        onSubmit,
        accounts: accounts || [],
        categories: categories || [],
        goals: goalsData || [],
        loans: loans || [],
        deleteTransaction,
    }
}
