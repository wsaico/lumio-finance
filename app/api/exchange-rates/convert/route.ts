import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Convert amount from one currency to another
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { amount, from, to } = body

        if (amount === undefined || !from || !to) {
            return new NextResponse('Missing required fields: amount, from, to', { status: 400 })
        }

        // Same currency, no conversion needed
        if (from === to) {
            return NextResponse.json({
                amount,
                from,
                to,
                converted: amount,
                rate: 1
            })
        }

        // Get latest exchange rate
        const { data: rates, error } = await supabase
            .from('exchange_rates')
            .select('*')
            .eq('from_currency', from)
            .eq('to_currency', to)
            .order('effective_date', { ascending: false })
            .limit(1)

        if (error) throw error

        if (!rates || rates.length === 0) {
            // Try inverse rate
            const { data: inverseRates, error: inverseError } = await supabase
                .from('exchange_rates')
                .select('*')
                .eq('from_currency', to)
                .eq('to_currency', from)
                .order('effective_date', { ascending: false })
                .limit(1)

            if (inverseError) throw inverseError

            if (!inverseRates || inverseRates.length === 0) {
                return new NextResponse(`No exchange rate found for ${from} to ${to}`, { status: 404 })
            }

            // Use inverse rate
            const inverseRate = Number(inverseRates[0].rate)
            const rate = 1 / inverseRate
            const converted = Number(amount) * rate

            return NextResponse.json({
                amount: Number(amount),
                from,
                to,
                converted,
                rate,
                rateDate: inverseRates[0].effective_date,
                source: inverseRates[0].source,
                isInverse: true
            })
        }

        // Direct rate found
        const rate = Number(rates[0].rate)
        const converted = Number(amount) * rate

        return NextResponse.json({
            amount: Number(amount),
            from,
            to,
            converted,
            rate,
            rateDate: rates[0].effective_date,
            source: rates[0].source,
            isInverse: false
        })

    } catch (error: any) {
        console.error('[EXCHANGE_RATES_CONVERT]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
