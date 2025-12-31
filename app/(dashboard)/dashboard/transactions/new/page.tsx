"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { SmartCommandCenter } from "@/components/transactions/v2/smart-command-center"
import { SmartTransactionForm } from "@/components/transactions/smart-transaction-form"
import { toast } from "sonner"

export default function NewTransactionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Read initial type from URL
    const typeFromUrl = searchParams.get('type') as any
    const initialType = ["EXPENSE", "INCOME", "TRANSFER"].includes(typeFromUrl)
        ? typeFromUrl
        : undefined

    return (
        <div className="fixed inset-0 z-40 h-full w-full bg-background flex flex-col animate-in fade-in duration-300">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <h1 className="text-xl font-semibold tracking-tight">
                    Nueva Transacción
                </h1>
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Content Area - Designed for Focus */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black">
                <SmartCommandCenter
                    initialType={initialType}
                    onConfirm={(data) => {
                        toast.success("Transacción registrada con éxito")
                        router.push('/dashboard/transactions')
                    }}
                />
            </div>
        </div>
    )
}
