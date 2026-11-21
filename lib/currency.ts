import { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_CURRENCY, FALLBACK_USD_RATES } from '@/lib/currencies'

export type ExchangeRateMap = Record<string, number>

/**
 * Fetches all exchange rates from the database and returns a simplified map
 * Key format: "FROM_TO" (e.g. "USD_PEN", "USD_COP", "USD_BOB")
 * Value: The latest rate for that pair
 */
export async function getExchangeRatesMap(supabase: SupabaseClient): Promise<ExchangeRateMap> {
    const { data: rates } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency, rate')
        .order('effective_date', { ascending: false })

    const rateMap: ExchangeRateMap = {}

    if (rates) {
        rates.forEach((r) => {
            const key = `${r.from_currency}_${r.to_currency}`
            if (!rateMap[key] && Number(r.rate) > 0) {
                rateMap[key] = Number(r.rate)
            }
        })
    }

    return rateMap
}

/**
 * Resolves the effective exchange rate (1 `from` = X `to`) using:
 * 1. Identity (`from === to` -> 1)
 * 2. Direct pair (`FROM_TO`)
 * 3. Inverse pair (`1 / TO_FROM`)
 * 4. Cross bridge via USD hub (supporting both `FROM_USD` and `1 / USD_FROM`, and `USD_TO` / `1 / TO_USD`)
 * 5. Safe reference fallback via `FALLBACK_USD_RATES` so distinct currencies are never summed 1:1
 */
export function getEffectiveRate(
    from: string | null | undefined,
    to: string | null | undefined,
    rateMap: ExchangeRateMap
): { rate: number; isFallback: boolean } {
    const fromCode = (from || DEFAULT_CURRENCY).toUpperCase()
    const toCode = (to || DEFAULT_CURRENCY).toUpperCase()

    if (fromCode === toCode) return { rate: 1, isFallback: false }

    // 1. Direct
    const direct = rateMap[`${fromCode}_${toCode}`]
    if (direct && direct > 0) return { rate: direct, isFallback: false }

    // 2. Inverse
    const inverse = rateMap[`${toCode}_${fromCode}`]
    if (inverse && inverse > 0) return { rate: 1 / inverse, isFallback: false }

    // 3. Cross via USD hub
    let fromToUsd: number | null = null
    if (fromCode === 'USD') {
        fromToUsd = 1
    } else if (rateMap[`${fromCode}_USD`] > 0) {
        fromToUsd = rateMap[`${fromCode}_USD`]
    } else if (rateMap[`USD_${fromCode}`] > 0) {
        fromToUsd = 1 / rateMap[`USD_${fromCode}`]
    }

    let usdToTarget: number | null = null
    if (toCode === 'USD') {
        usdToTarget = 1
    } else if (rateMap[`USD_${toCode}`] > 0) {
        usdToTarget = rateMap[`USD_${toCode}`]
    } else if (rateMap[`${toCode}_USD`] > 0) {
        usdToTarget = 1 / rateMap[`${toCode}_USD`]
    }

    if (fromToUsd !== null && usdToTarget !== null) {
        return { rate: fromToUsd * usdToTarget, isFallback: false }
    }

    // 4. Hybrid fallback: use DB rate where available and FALLBACK_USD_RATES for the missing leg
    const fallbackFrom = fromToUsd ?? (FALLBACK_USD_RATES[fromCode] ? 1 / FALLBACK_USD_RATES[fromCode] : null)
    const fallbackTo = usdToTarget ?? (FALLBACK_USD_RATES[toCode] ?? null)

    if (fallbackFrom !== null && fallbackTo !== null) {
        return { rate: fallbackFrom * fallbackTo, isFallback: true }
    }

    return { rate: 1, isFallback: true }
}

/**
 * Converts an amount from one currency to another using the provided rate map.
 * Works identically on both client and server.
 */
export function convertAmount(
    amount: number,
    from: string | null | undefined,
    to: string | null | undefined,
    rateMap: ExchangeRateMap
): number {
    const safeAmount = Number(amount) || 0
    if (safeAmount === 0) return 0
    const { rate } = getEffectiveRate(from, to, rateMap)
    return safeAmount * rate
}
