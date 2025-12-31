import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useCallback, useMemo } from 'react'

export interface ExchangeRate {
    id: string
    from_currency: string
    to_currency: string
    rate: number
    source: string
    effective_date: string
    created_at: string
    updated_at: string
}

export interface ConversionResult {
    amount: number
    from: string
    to: string
    converted: number
    rate: number
    rateDate?: string
    source?: string
    isInverse?: boolean
}

export function useExchangeRates() {
    const queryClient = useQueryClient()

    // Fetch all current exchange rates
    const { data: rates, isLoading, error } = useQuery<ExchangeRate[]>({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const res = await fetch('/api/exchange-rates')
            if (!res.ok) throw new Error('Error fetching exchange rates')
            return res.json()
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    })

    // Convert amount from one currency to another
    const convert = useCallback(async (
        amount: number,
        from: string,
        to: string
    ): Promise<number> => {
        if (from === to) return amount

        try {
            const res = await fetch('/api/exchange-rates/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, from, to }),
            })

            if (!res.ok) {
                console.error(`No exchange rate found for ${from} to ${to}`)
                return amount // Return original if conversion fails
            }

            const result: ConversionResult = await res.json()
            return result.converted
        } catch (err) {
            console.error('Error converting currency:', err)
            return amount
        }
    }, [])

    // Get specific rate between two currencies
    const getRate = useCallback((from: string, to: string): number | null => {
        if (from === to) return 1

        const rate = rates?.find(
            r => r.from_currency === from && r.to_currency === to
        )

        if (rate) return Number(rate.rate)

        // Try inverse
        const inverseRate = rates?.find(
            r => r.from_currency === to && r.to_currency === from
        )

        if (inverseRate) return 1 / Number(inverseRate.rate)

        return null
    }, [rates])

    // Update exchange rate
    const updateRate = useMutation({
        mutationFn: async (data: {
            from_currency: string
            to_currency: string
            rate: number
            source?: string
        }) => {
            const res = await fetch('/api/exchange-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Error updating exchange rate')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
            queryClient.invalidateQueries({ queryKey: ['accounts'] })
            toast.success('Tasa de cambio actualizada')
        },
        onError: (error) => {
            toast.error('Error al actualizar tasa de cambio')
            console.error(error)
        },
    })

    // Get all unique currencies from rates
    const currencies = useMemo(() => {
        if (!rates) return []
        const currencySet = new Set<string>()
        rates.forEach(r => {
            currencySet.add(r.from_currency)
            currencySet.add(r.to_currency)
        })
        return Array.from(currencySet).sort()
    }, [rates])

    return {
        rates,
        isLoading,
        error,
        convert,
        getRate,
        updateRate,
        currencies,
    }
}
