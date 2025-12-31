"use client"

import { useRouter, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartTransactionForm } from "@/components/transactions/smart-transaction-form"
import { toast } from "sonner"

export default function EditTransactionPage() {
    const router = useRouter()
    const { id } = useParams()

    const { data: transaction, isLoading, error } = useQuery({
        queryKey: ['transaction', id],
        queryFn: async () => {
            const res = await fetch(`/api/transactions?id=${id}`)
            if (!res.ok) throw new Error('Error al cargar la transacción')
            return res.json()
        },
        enabled: !!id
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Cargando transacción...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-2">
                    <span className="text-2xl text-rose-500">❌</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">Error al cargar</h3>
                <p className="text-muted-foreground max-w-xs">{error instanceof Error ? error.message : 'No se pudo encontrar la transacción.'}</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-4 rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>
        )
    }

    return (
        <SmartTransactionForm
            initialData={transaction}
            onSuccess={() => {
                router.push('/dashboard/transactions')
                router.refresh()
            }}
        />
    )
}
