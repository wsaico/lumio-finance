"use client"

import { SmartPettyCashExpenseForm } from "@/components/petty-cash/smart-expense-form"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function NewExpenseContent() {
    const searchParams = useSearchParams()
    const fundId = searchParams.get('fundId') || undefined

    return <SmartPettyCashExpenseForm defaultFundId={fundId} />
}

export default function NewPettyCashExpensePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
        }>
            <NewExpenseContent />
        </Suspense>
    )
}
