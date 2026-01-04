"use client"

import { TransactionList } from "@/components/transactions/transaction-list"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const TransactionFilterBar = dynamic(
    () => import("@/components/transactions/transaction-filter-bar").then((mod) => mod.TransactionFilterBar),
    {
        ssr: false,
        loading: () => <div className="w-full h-32 space-y-4">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-[300px] rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
        </div>
    }
)

export default function TransactionsPage() {

    return (
        <div className="space-y-6">


            <div className="bg-background/40 backdrop-blur-sm border border-muted-foreground/10 rounded-2xl p-4 shadow-sm">
                <TransactionFilterBar />
            </div>

            <div className="rounded-2xl border bg-background/50 backdrop-blur-sm p-4 shadow-sm">
                <TransactionList />
            </div>
        </div>
    )
}
