"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExchangeRates } from './useExchangeRates'
import { useSettingsStore } from './useSettingsStore'
import { useMemo } from 'react'

const EMPTY_ARRAY: any[] = []

type Account = any

export function useAccounts() {
    const queryClient = useQueryClient()
    const { convert } = useExchangeRates()
    const { currencyCode: baseCurrency } = useSettingsStore()

    const { data: accounts, isLoading, error } = useQuery<Account[]>({
        queryKey: ['accounts'],
        queryFn: async () => {
            const res = await fetch('/api/accounts')
            if (!res.ok) throw new Error('Error al obtener cuentas')
            return res.json()
        },
    })

    const summary = useMemo(() => {
        const list = accounts || EMPTY_ARRAY
        let liquidBalanceConverted = 0
        let totalCreditDebtConverted = 0
        let totalCreditLimitConverted = 0
        const balancesByCurrency: Record<string, number> = {}

        for (const account of list) {
            const currency = account.currencyCode || baseCurrency

            if (account.accountType === 'CREDIT_CARD') {
                const limit = Math.max(0, Number(account.creditLimit) || 0)
                const used = Math.abs(Number(account.usedBalance) || 0)
                totalCreditLimitConverted += convert(limit, currency, baseCurrency)
                totalCreditDebtConverted += convert(used, currency, baseCurrency)
            } else {
                const balance = Number(account.currentBalance) || 0
                balancesByCurrency[currency] = (balancesByCurrency[currency] || 0) + balance
                liquidBalanceConverted += convert(balance, currency, baseCurrency)
            }
        }

        const totalCreditAvailableConverted = Math.max(
            0,
            totalCreditLimitConverted - totalCreditDebtConverted
        )
        const netWorthConverted = liquidBalanceConverted - totalCreditDebtConverted

        return {
            totalBalanceConverted: liquidBalanceConverted,
            liquidBalanceConverted,
            totalCreditDebtConverted,
            totalCreditLimitConverted,
            totalCreditAvailableConverted,
            netWorthConverted,
            balancesByCurrency,
        }
    }, [accounts, baseCurrency, convert])

    const createAccount = useMutation({
        mutationFn: async (newAccount: Partial<Account>) => {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAccount),
            })
            if (!res.ok) throw new Error('Error al crear cuenta')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] })
            toast.success('Cuenta creada exitosamente')
        },
        onError: () => {
            toast.error('No se pudo crear la cuenta')
        },
    })

    const updateAccount = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
            const res = await fetch(`/api/accounts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Error al actualizar cuenta')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] })
            toast.success('Cuenta actualizada')
        },
        onError: () => toast.error('No se pudo actualizar la cuenta'),
    })

    const deleteAccount = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/accounts/${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const contentType = res.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json()
                    throw new Error(errorData.message || 'Error al eliminar cuenta')
                }
                const errorText = await res.text()
                throw new Error(errorText || 'Error al eliminar cuenta')
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] })
            toast.success('Cuenta eliminada')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'No se pudo eliminar la cuenta')
        },
    })

    const transactionAccounts = useMemo(() => accounts || EMPTY_ARRAY, [accounts])

    return {
        accounts: accounts || EMPTY_ARRAY,
        transactionAccounts,
        isLoading,
        error,
        ...summary,
        createAccount,
        updateAccount,
        deleteAccount,
    }
}
