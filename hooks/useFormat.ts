
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useCallback } from "react"

export function useFormat() {
    const { numberFormat, currencyCode } = useSettingsStore()

    const formatMoney = useCallback((amount: number | string | null | undefined, overrideCurrency?: string) => {
        if (amount === null || amount === undefined) return ''

        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(num)) return ''

        const currencyToUse = overrideCurrency || currencyCode || 'PEN'

        // Map common symbols
        const symbols: Record<string, string> = {
            'PEN': 'S/.',
            'USD': '$',
            'EUR': '€',
            'MXN': 'MX$',
            'COP': 'COL$',
            'ARS': 'AR$',
            'CLP': 'CL$',
            'BRL': 'R$',
        }

        const symbol = symbols[currencyToUse] || currencyToUse

        let formatted = ''

        if (numberFormat.includes('1.234,56')) {
            // Euro style points
            formatted = new Intl.NumberFormat('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num)
        } else {
            // Default US style
            formatted = new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(num)
        }

        // Add prefix/suffix logic
        // If the numberFormat starts with some symbol (like S/.), we place our current symbol at the start
        if (numberFormat.startsWith('S/.') || numberFormat.startsWith('$') || numberFormat.startsWith('€')) {
            return `${symbol} ${formatted}`
        } else if (numberFormat.endsWith('S/.') || numberFormat.endsWith('$') || numberFormat.endsWith('€')) {
            return `${formatted} ${symbol}`
        }

        return `${symbol} ${formatted}` // fallback

    }, [numberFormat, currencyCode])

    const formatCompactMoney = useCallback((amount: number | string | null | undefined, overrideCurrency?: string) => {
        if (amount === null || amount === undefined) return ''

        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        if (isNaN(num)) return ''

        const currencyToUse = overrideCurrency || currencyCode || 'PEN'

        const symbols: Record<string, string> = {
            'PEN': 'S/.',
            'USD': '$',
            'EUR': '€',
            'MXN': 'MX$',
            'COP': 'COL$',
            'ARS': 'AR$',
            'CLP': 'CL$',
            'BRL': 'R$',
        }

        const symbol = symbols[currencyToUse] || currencyToUse

        // Compact formatting (1.2K, 1.5M, etc.)
        const formatted = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1
        }).format(num)

        return `${symbol}${formatted}`

    }, [currencyCode])

    const formatPercentage = useCallback((value: number | string | null | undefined, decimals: number = 1) => {
        if (value === null || value === undefined) return ''

        const num = typeof value === 'string' ? parseFloat(value) : value
        if (isNaN(num)) return ''

        return `${num.toFixed(decimals)}%`
    }, [])

    const getCurrencySymbol = useCallback((overrideCurrency?: string) => {
        const currencyToUse = overrideCurrency || currencyCode || 'PEN'

        const symbols: Record<string, string> = {
            'PEN': 'S/.',
            'USD': '$',
            'EUR': '€',
            'MXN': 'MX$',
            'COP': 'COL$',
            'ARS': 'AR$',
            'CLP': 'CL$',
            'BRL': 'R$',
        }

        return symbols[currencyToUse] || currencyToUse
    }, [currencyCode])

    return {
        formatMoney,
        formatCompactMoney,
        formatPercentage,
        getCurrencySymbol
    }
}
