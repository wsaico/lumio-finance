"use client"

import { useRouter, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionEditor } from "@/components/transactions/transaction-editor"

export default function EditTransactionPage() {
    const router = useRouter()
    const { id } = useParams()

    const { data: transaction, isLoading, error } = useQuery({
        queryKey: ["transaction", id],
        queryFn: async () => {
            const res = await fetch(`/api/transactions?id=${id}`)
            if (!res.ok) throw new Error("Error al cargar la transacción")
            return res.json()
        },
        enabled: !!id,
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">
                    Cargando transacción...
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                <h3 className="text-xl font-bold text-foreground">Error al cargar</h3>
                <p className="text-muted-foreground max-w-xs">
                    {error instanceof Error
                        ? error.message
                        : "No se pudo encontrar la transacción."}
                </p>
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="mt-2 rounded-2xl"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
            </div>
        )
    }

    return (
        <TransactionEditor
            initialData={transaction}
            onSuccess={() => {
                router.push("/dashboard/transactions")
                router.refresh()
            }}
        />
    )
}
