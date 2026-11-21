"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TransactionEditor } from "@/components/transactions/transaction-editor"
import { Loader2 } from "lucide-react"

function NewTransactionContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const typeFromUrl = searchParams.get("type") as "EXPENSE" | "INCOME" | "TRANSFER" | null
    const accountIdFromUrl = searchParams.get("accountId") || undefined
    const toAccountIdFromUrl = searchParams.get("toAccountId") || undefined
    const initialType =
        typeFromUrl && ["EXPENSE", "INCOME", "TRANSFER"].includes(typeFromUrl)
            ? typeFromUrl
            : "EXPENSE"

    return (
        <TransactionEditor
            initialType={initialType}
            initialAccountId={accountIdFromUrl}
            initialToAccountId={toAccountIdFromUrl}
            onSuccess={() => {
                router.push("/dashboard/transactions")
                router.refresh()
            }}
        />
    )
}

export default function NewTransactionPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <NewTransactionContent />
        </Suspense>
    )
}
