import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch all current exchange rates
export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Get latest rates for each currency pair
        const { data: rates, error } = await supabase
            .from('exchange_rates')
            .select('*')
            .order('effective_date', { ascending: false })

        if (error) throw error

        // Group by currency pair and get latest
        const latestRates = rates?.reduce((acc: any[], rate: any) => {
            const key = `${rate.from_currency}_${rate.to_currency}`
            if (!acc.find((r: any) => `${r.from_currency}_${r.to_currency}` === key)) {
                acc.push(rate)
            }
            return acc
        }, [])

        return NextResponse.json(latestRates || [])

    } catch (error: any) {
        console.error('[EXCHANGE_RATES_GET]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

// POST: Update or create exchange rate
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { from_currency, to_currency, rate, source = 'MANUAL' } = body

        if (!from_currency || !to_currency || !rate) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        if (rate <= 0) {
            return new NextResponse('Rate must be greater than 0', { status: 400 })
        }

        if (from_currency === to_currency) {
            return new NextResponse('Cannot convert currency to itself', { status: 400 })
        }

        // Insert new rate
        const { data: newRate, error } = await supabase
            .from('exchange_rates')
            .insert({
                from_currency,
                to_currency,
                rate,
                source,
                effective_date: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(newRate)

    } catch (error: any) {
        console.error('[EXCHANGE_RATES_POST]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
