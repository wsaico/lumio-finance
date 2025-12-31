"use client"

import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet"
import { SmartTransactionForm } from "./smart-transaction-form"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface TransactionFormSheetProps {
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    transactionToEdit?: any
    mode?: 'create' | 'edit'
}

export function TransactionFormSheet({
    open: controlledOpen,
    onOpenChange,
    transactionToEdit,
    mode = 'create'
}: TransactionFormSheetProps) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open)
        }

        // If closing and it was opened via route, navigate back
        if (!open) {
            // Give a small delay for the animation to finish
            setTimeout(() => {
                // If we are in a sub-route (like /transactions/new), we want to go back
                // This logic is generic, callers can handle more specific navigation if needed
            }, 300)
        }
    }

    return (
        <Sheet open={controlledOpen} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                className="p-0 border-none shadow-3xl bg-white dark:bg-zinc-950 w-full sm:max-w-[620px] gap-0 overflow-visible rounded-l-[3rem]"
            >
                <SheetTitle className="sr-only">
                    {transactionToEdit ? 'Editar Transacción' : 'Nueva Transacción'}
                </SheetTitle>

                <div className="h-full flex flex-col pt-8">
                    <SmartTransactionForm
                        initialData={transactionToEdit}
                        onSuccess={() => {
                            if (onOpenChange) onOpenChange(false)
                        }}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
