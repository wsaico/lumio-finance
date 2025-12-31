
"use client"

import { Button } from "@/components/ui/button"
import { Plus, ArrowRightLeft, Download } from "lucide-react"
import { TransactionFormModal } from "@/components/transactions/transaction-form-modal"
import { AccountFormModal } from "@/components/accounts/account-form-modal"

export function QuickActions() {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2">
            <TransactionFormModal />
            <AccountFormModal trigger={
                <Button variant="outline" className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> Nueva Cuenta
                </Button>
            } />
            {/* Examples of other actions */}
            <Button variant="outline" className="shadow-sm">
                <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
            </Button>
            <Button variant="outline" className="shadow-sm">
                <Download className="mr-2 h-4 w-4" /> Reporte
            </Button>
        </div>
    )
}
