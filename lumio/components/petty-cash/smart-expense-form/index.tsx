"use client"

import { SmartExpenseWrapper } from "./smart-expense-wrapper"

interface SmartPettyCashExpenseFormProps {
    onSuccess?: () => void
    defaultFundId?: string
}

export function SmartPettyCashExpenseForm({ onSuccess, defaultFundId }: SmartPettyCashExpenseFormProps) {
    return (
        <SmartExpenseWrapper
            defaultFundId={defaultFundId}
            onSuccess={onSuccess}
        />
    )
}

export { SmartExpenseWrapper } from "./smart-expense-wrapper"
export { usePettyCashExpenseForm, RECEIPT_TYPES, PERU_TAX_RATES, COMMON_VENDORS } from "./use-petty-cash-expense-form"
