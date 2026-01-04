
import { SupabaseClient } from '@supabase/supabase-js'

export type ExchangeRateMap = Record<string, number>

/**
 * Fetches all exchange rates from the database and returns a simplified map
 * Key format: "FROM_TO" (e.g. "USD_PEN")
 * Value: The rate
 */
export async function getExchangeRatesMap(supabase: SupabaseClient): Promise<ExchangeRateMap> {
    const { data: rates } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency, rate')
        .order('effective_date', { ascending: false })

    // Use a Map to store the *latest* rate for each pair (since we ordered by date desc)
    // Actually, simple object is enough if we just process sequentially and ignore duplicates (first one wins)
    const rateMap: ExchangeRateMap = {}

    if (rates) {
        rates.forEach(r => {
            const key = `${r.from_currency}_${r.to_currency}`
            if (!rateMap[key]) {
                rateMap[key] = Number(r.rate)
            }
        })
    }

    // Ensure we have self-rates (e.g. USD_USD = 1) just in case
    // (Optional, usually handled in convert function, but safer here)
    return rateMap
}

/**
 * Converts an amount from one currency to another using the provided rate map.
 * Supports Direct (USD->PEN), Inverse (PEN->USD), and Cross (EUR->PEN via USD) conversion.
 */
export function convertAmount(
    amount: number,
    from: string | null | undefined,
    to: string,
    rateMap: ExchangeRateMap
): number {
    const safeAmount = Number(amount) || 0
    const fromCode = from || 'PEN' // Default fallback if missing
    const toCode = to || 'PEN'

    if (fromCode === toCode) return safeAmount

    // 1. Direct Rule
    const directKey = `${fromCode}_${toCode}`
    if (rateMap[directKey] !== undefined) {
        return safeAmount * rateMap[directKey]
    }

    // 2. Inverse Rule
    const inverseKey = `${toCode}_${fromCode}`
    if (rateMap[inverseKey] !== undefined && rateMap[inverseKey] !== 0) {
        return safeAmount / rateMap[inverseKey]
    }

    // 3. Cross Rule (via USD as standard bridge)
    // Target = Amount * (From->USD) * (USD->To)

    // Step A: From -> USD
    let amountInUSD = 0
    if (fromCode === 'USD') {
        amountInUSD = safeAmount
    } else {
        const toUsdKey = `${fromCode}_USD`
        const usdToFromKey = `USD_${fromCode}`

        if (rateMap[toUsdKey]) {
            amountInUSD = safeAmount * rateMap[toUsdKey]
        } else if (rateMap[usdToFromKey]) {
            amountInUSD = safeAmount / rateMap[usdToFromKey]
        } else {
            // Cannot convert to USD, return original (better than 0)
            return safeAmount
        }
    }

    // Step B: USD -> To
    if (toCode === 'USD') {
        return amountInUSD
    }

    const usdToTargetKey = `USD_${toCode}`
    const targetToUsdKey = `${toCode}_USD`

    if (rateMap[usdToTargetKey]) {
        return amountInUSD * rateMap[usdToTargetKey]
    } else if (rateMap[targetToUsdKey]) {
        return amountInUSD / rateMap[targetToUsdKey]
    }

    return safeAmount // Fallback
}
