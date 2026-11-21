export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getExchangeRatesMap, getEffectiveRate } from '@/lib/currency'

// POST: Convert amount between any two currencies (direct, inverse, or cross via USD hub)
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { amount, from, to } = body

        if (amount === undefined || !from || !to) {
            return NextResponse.json(
                { error: 'Missing required fields: amount, from, to' },
                { status: 400 }
            )
        }

        const numericAmount = Number(amount)
        const fromCode = String(from).toUpperCase()
        const toCode = String(to).toUpperCase()

        if (fromCode === toCode) {
            return NextResponse.json({
                amount: numericAmount,
                from: fromCode,
                to: toCode,
                converted: numericAmount,
                rate: 1,
                isFallback: false,
            })
        }

        const rateMap = await getExchangeRatesMap(supabase)
        const { rate, isFallback } = getEffectiveRate(fromCode, toCode, rateMap)
        const converted = numericAmount * rate

        return NextResponse.json({
            amount: numericAmount,
            from: fromCode,
            to: toCode,
            converted,
            rate,
            isFallback,
        })
    } catch (error: any) {
        if (
            error &&
            (error.digest === 'DYNAMIC_SERVER_USAGE' ||
                String(error).includes('Dynamic server usage'))
        ) {
            throw error
        }

        console.error('[EXCHANGE_RATES_CONVERT]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
