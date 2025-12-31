"use client"

import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFilterBar } from "@/components/transactions/transaction-filter-bar"

export default function TransactionsPage() {

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight">Transacciones</h2>
                <p className="text-muted-foreground text-sm">
                    Historial de movimientos e ingresos inteligentes.
                </p>
            </div>

            <div className="bg-background/40 backdrop-blur-sm border border-muted-foreground/10 rounded-2xl p-4 shadow-sm">
                <TransactionFilterBar />
            </div>

            <div className="rounded-2xl border bg-background/50 backdrop-blur-sm p-4 shadow-sm">
                <TransactionList />
            </div>
        </div>
    )
}
