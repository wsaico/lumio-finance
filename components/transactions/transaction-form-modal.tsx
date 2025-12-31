"use client"

import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SmartTransactionForm } from "./smart-transaction-form"

interface TransactionFormModalProps {
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    transactionToEdit?: any
}

export function TransactionFormModal({
    trigger,
    open: controlledOpen,
    onOpenChange,
    transactionToEdit
}: TransactionFormModalProps = {}) {
    const isControlled = controlledOpen !== undefined

    // For now, if uncontrolled, we don't support it well in this wrapper refactor
    // But usually it's controlled.
    // Let's assume controlled for the main use case or simple pass-through.

    return (
        <Dialog open={controlledOpen} onOpenChange={onOpenChange}>
            {!isControlled && !trigger && (
                <DialogTrigger asChild>
                    <Button className="shadow-lg shadow-primary/20 hover:scale-105 transition-all bg-primary text-primary-foreground">
                        Registrar Transacción
                    </Button>
                </DialogTrigger>
            )}
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

            <DialogContent className="sm:max-w-[750px] p-0 gap-0 bg-white dark:bg-zinc-950 border-none shadow-3xl rounded-[2.5rem] overflow-hidden">
                <DialogTitle className="sr-only">Editar Transacción</DialogTitle>
                <div className="h-full flex flex-col">
                    <SmartTransactionForm
                        initialData={transactionToEdit}
                        onSuccess={() => onOpenChange && onOpenChange(false)}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
