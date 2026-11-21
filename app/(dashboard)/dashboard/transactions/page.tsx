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
        <div className="space-y-3 sm:space-y-4">
            <div className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs">
                <TransactionFilterBar />
            </div>

            <TransactionList />
        </div>
    )
}
