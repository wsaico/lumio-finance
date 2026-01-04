"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useMemo, useCallback } from "react"

export function useExchangeRates() {
    let queryClient;
    try {
        queryClient = useQueryClient()
    } catch (e) {
        return {
            rates: [],
            isLoading: true,
            error: null,
            syncRates: { mutate: () => { } } as any,
            convert: (amount: number) => amount
        }
    }

    const { data: rates, isLoading, error } = useQuery({
        queryKey: ['exchange-rates'],
        queryFn: async () => {
            const res = await fetch('/api/exchange-rates')
            if (!res.ok) throw new Error('Failed to fetch rates')
            return res.json()
        }
    })

    const rateMap = useMemo(() => {
        if (!rates) return {}
        const map: Record<string, number> = {}
        rates.forEach((r: any) => {
            map[`${r.from_currency}_${r.to_currency}`] = r.rate
        })
        return map
    }, [rates])

    const convert = useCallback((amount: number, from: string, to: string) => {
        if (!amount) return 0
        if (from === to) return amount

        // Direct
        const directKey = `${from}_${to}`
        if (rateMap[directKey]) return amount * rateMap[directKey]

        // Inverse
        const inverseKey = `${to}_${from}`
        if (rateMap[inverseKey]) return amount / rateMap[inverseKey]

        // Cross (via USD)
        const toUsdKey = `${from}_USD`
        const usdToTargetKey = `USD_${to}`
        if (rateMap[toUsdKey] && rateMap[usdToTargetKey]) {
            return (amount * rateMap[toUsdKey]) * rateMap[usdToTargetKey]
        }

        // Fallback: return un-converted amount if rate is missing to avoid "0"
        return amount
    }, [rateMap])

    const syncRates = useMutation({
        mutationFn: async (baseCurrency: string = 'USD') => {
            const res = await fetch('/api/exchange-rates/sync', {
                method: 'POST',
                body: JSON.stringify({ baseCurrency }),
            })
            if (!res.ok) throw new Error('Failed to sync rates')
            return res.json()
        },
        onSuccess: () => {
            toast.success("Tasas de cambio actualizadas")
            queryClient.invalidateQueries({ queryKey: ['exchange-rates'] })
        },
        onError: () => {
            toast.error("Error al actualizar tasas")
        }
    })

    return {
        rates,
        isLoading,
        error,
        syncRates,
        convert
    }
}
