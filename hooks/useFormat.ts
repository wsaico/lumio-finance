import { useCallback } from "react"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { getCurrencySymbol, DEFAULT_CURRENCY } from "@/lib/currencies"

type Amount = number | string | null | undefined

function toNumber(amount: Amount): number | null {
    if (amount === null || amount === undefined) return null
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return Number.isNaN(num) ? null : num
}

/**
 * Formateo único de dinero. Respeta la moneda principal y el estilo de número
 * elegidos en Ajustes; `overrideCurrency` permite mostrar la moneda propia de una cuenta.
 */
export function useFormat() {
    const { numberFormat, currencyCode } = useSettingsStore()
    const baseCurrency = currencyCode || DEFAULT_CURRENCY
    const locale = numberFormat.includes("1.234,56") ? "es-ES" : "en-US"

    const formatMoney = useCallback((amount: Amount, overrideCurrency?: string) => {
        const num = toNumber(amount)
        if (num === null) return ""
        const symbol = getCurrencySymbol(overrideCurrency || baseCurrency)
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
        }).format(num)
        const symbolAfter = /\d\s*(€|\$|S\/\.)\s*$/.test(numberFormat)
        return symbolAfter ? `${formatted} ${symbol}` : `${symbol} ${formatted}`
    }, [locale, numberFormat, baseCurrency])

    const formatCompactMoney = useCallback((amount: Amount, overrideCurrency?: string) => {
        const num = toNumber(amount)
        if (num === null) return ""
        const symbol = getCurrencySymbol(overrideCurrency || baseCurrency)
        const formatted = new Intl.NumberFormat(locale, {
            notation: "compact",
            compactDisplay: "short",
            maximumFractionDigits: 1,
        }).format(num)
        return `${symbol}${formatted}`
    }, [locale, baseCurrency])

    const formatPercentage = useCallback((value: Amount, decimals = 1) => {
        const num = toNumber(value)
        return num === null ? "" : `${num.toFixed(decimals)}%`
    }, [])

    const getSymbol = useCallback(
        (overrideCurrency?: string) => getCurrencySymbol(overrideCurrency || baseCurrency),
        [baseCurrency]
    )

    return {
        formatMoney,
        formatCompactMoney,
        formatPercentage,
        getCurrencySymbol: getSymbol,
        baseCurrency,
    }
}
