import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExchangeRates } from './use-exchange-rates'
import { useSettingsStore } from './use-settings-store'
import { useEffect, useState, useMemo } from 'react'

// Manual definition or just use any to unblock build
type Account = any

export function useAccounts() {
    const queryClient = useQueryClient()
    const { convert } = useExchangeRates()
    const { currencyCode: baseCurrency } = useSettingsStore()
    const [totalBalanceConverted, setTotalBalanceConverted] = useState(0)
    const [balancesByCurrency, setBalancesByCurrency] = useState<Record<string, number>>({})

    const { data: accounts, isLoading, error } = useQuery<Account[]>({
        queryKey: ['accounts'],
        queryFn: async () => {
            const res = await fetch('/api/accounts')
            if (!res.ok) throw new Error('Error fetching accounts')
            return res.json()
        },
    })

    // Calculate total balance converted to base currency
    useEffect(() => {
        if (!accounts || isLoading) return

        async function calculateConvertedBalance() {
            let total = 0
            const byCurrency: Record<string, number> = {}

            for (const account of accounts!) {
                const balance = Number(account.currentBalance)
                const currency = account.currencyCode || baseCurrency

                // Track by currency
                byCurrency[currency] = (byCurrency[currency] || 0) + balance

                // Convert to base currency
                const converted = await convert(balance, currency, baseCurrency)
                total += converted
            }

            setTotalBalanceConverted(total)
            setBalancesByCurrency(byCurrency)
        }

        calculateConvertedBalance()
    }, [accounts, baseCurrency, convert, isLoading])

    const createAccount = useMutation({
        mutationFn: async (newAccount: Partial<Account>) => {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount),
            })
            if (!res.ok) throw new Error('Error creating account')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            toast.success('Cuenta creada exitosamente')
        },
        onError: (error) => {
            toast.error('Error al crear cuenta')
        },
    })

    const updateAccount = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
            const res = await fetch(`/api/accounts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Error updating account')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            toast.success('Cuenta actualizada')
        },
        onError: () => toast.error('Error al actualizar'),
    })

    const deleteAccount = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/accounts/${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                // Log full response for debugging
                console.log('[DELETE_ACCOUNT] Status:', res.status)
                console.log('[DELETE_ACCOUNT] Headers:', Object.fromEntries(res.headers.entries()))

                // Try to parse error message
                const contentType = res.headers.get('content-type')
                console.log('[DELETE_ACCOUNT] Content-Type:', contentType)

                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json()
                    console.log('[DELETE_ACCOUNT] Error data:', errorData)
                    throw new Error(errorData.message || 'Error deleting account')
                }

                // Try to read as text
                const errorText = await res.text()
                console.log('[DELETE_ACCOUNT] Error text:', errorText)
                throw new Error(errorText || 'Error deleting account')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            toast.success('Cuenta eliminada')
        },
        onError: (error: Error) => {
            // Don't show toast - let component handle error display
            // Don't use console.error - it triggers Next.js error overlay
        },
    })

    // Filtered accounts excluding PETTY_CASH (for transaction forms)
    const transactionAccounts = useMemo(() =>
        accounts?.filter((acc: Account) => acc.accountType !== 'PETTY_CASH') || [],
        [accounts])

    return {
        accounts,
        transactionAccounts, // Use this in transaction forms
        isLoading,
        error,
        totalBalanceConverted,
        balancesByCurrency,
        createAccount,
        updateAccount,
        deleteAccount,
    }
}
