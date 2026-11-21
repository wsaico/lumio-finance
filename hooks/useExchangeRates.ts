"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useMemo, useCallback } from "react"
import { convertAmount, getEffectiveRate, ExchangeRateMap } from "@/lib/currency"

export interface ExchangeRateRecord {
    id: string
    from_currency: string
    to_currency: string
    rate: number
    source?: string
    effective_date: string
}

export function useExchangeRates() {
    const queryClient = useQueryClient()

    const { data: rates, isLoading, error } = useQuery<ExchangeRateRecord[]>({
        queryKey: ["exchange-rates"],
        queryFn: async () => {
            const res = await fetch("/api/exchange-rates")
            if (!res.ok) throw new Error("Error al obtener tasas de cambio")
            return res.json()
        },
        staleTime: 1000 * 60 * 5,
    })

    const rateMap = useMemo<ExchangeRateMap>(() => {
        if (!rates) return {}
        const map: ExchangeRateMap = {}
        rates.forEach((r) => {
            const key = `${r.from_currency}_${r.to_currency}`
            if (!map[key] && Number(r.rate) > 0) {
                map[key] = Number(r.rate)
            }
        })
        return map
    }, [rates])

    const convert = useCallback(
        (amount: number, from: string, to: string) => {
            return convertAmount(amount, from, to, rateMap)
        },
        [rateMap]
    )

    const getRate = useCallback(
        (from: string, to: string) => {
            return getEffectiveRate(from, to, rateMap)
        },
        [rateMap]
    )

    const syncRates = useMutation({
        mutationFn: async (options?: { forceOverwriteManual?: boolean; currency?: string }) => {
            const res = await fetch("/api/exchange-rates/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(options || {}),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || "Error al sincronizar tasas")
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["exchange-rates"] })
            queryClient.invalidateQueries({ queryKey: ["accounts"] })
            const preserved = Number(data?.preservedManual || 0)
            toast.success("Tasas de cambio actualizadas", {
                description:
                    preserved > 0
                        ? `${data.synced} monedas actualizadas · ${preserved} tasa(s) manuales conservadas`
                        : `${data.synced || 0} monedas sincronizadas en vivo`,
            })
        },
        onError: (err: any) => {
            toast.error("No se pudieron actualizar las tasas", {
                description: err?.message,
            })
        },
    })

    const saveManualRate = useMutation({
        mutationFn: async (payload: {
            from_currency: string
            to_currency: string
            rate: number
        }) => {
            const res = await fetch("/api/exchange-rates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, source: "MANUAL" }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || "Error al guardar tasa manual")
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["exchange-rates"] })
            queryClient.invalidateQueries({ queryKey: ["accounts"] })
            toast.success("Tasa personalizada guardada", {
                description: `1 ${variables.from_currency} = ${variables.rate} ${variables.to_currency}`,
            })
        },
        onError: (err: any) => {
            toast.error("No se pudo guardar la tasa", {
                description: err?.message,
            })
        },
    })

    return {
        rates: rates || [],
        rateMap,
        isLoading,
        error,
        syncRates,
        saveManualRate,
        convert,
        getRate,
    }
}
