"use client"

import { SmartTransactionWrapper } from "./form/smart-transaction-wrapper"

interface SmartTransactionFormProps {
    onSuccess: () => void
    initialData?: any
    defaultOpenTitle?: boolean
}

export function SmartTransactionForm({ onSuccess, initialData, defaultOpenTitle = false }: SmartTransactionFormProps) {
    return (
        <SmartTransactionWrapper
            initialData={initialData}
            onSuccess={onSuccess}
            defaultOpenWizard={defaultOpenTitle}
        />
    )
}
