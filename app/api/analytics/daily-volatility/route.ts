export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { startOfDay, subDays, format, eachDayOfInterval } from 'date-fns'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const userCurrency = user.user_metadata?.currency || 'PEN'
        const today = new Date()
        const startDate = subDays(today, 29) // Last 30 days including today

        // Fetch everything in parallel
        const [rateMap, accountsRes, transactionsRes] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code').eq('user_id', user.id),
            supabase.from('transactions')
                .select('amount, transaction_date, currency_code, account_id')
                .eq('user_id', user.id)
                .eq('transaction_type', 'EXPENSE')
                .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
        ])

        if (transactionsRes.error) throw transactionsRes.error

        const accounts = accountsRes.data || []
        const accountCurrencyMap: Record<string, string> = {}
        accounts.forEach(acc => {
            accountCurrencyMap[acc.id] = acc.currency_code
        })

        // Group transactions by date string
        const dailyRaw: Record<string, any[]> = {}
        transactionsRes.data?.forEach(t => {
            const dateStr = format(new Date(t.transaction_date), 'yyyy-MM-dd')
            if (!dailyRaw[dateStr]) dailyRaw[dateStr] = []
            dailyRaw[dateStr].push(t)
        })

        // Generate full 30-day series
        const days = eachDayOfInterval({ start: startDate, end: today })

        const chartData = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayTransactions = dailyRaw[dateStr] || []

            let totalConverted = 0
            dayTransactions.forEach(t => {
                const amount = Number(t.amount) || 0
                const currency = t.currency_code || accountCurrencyMap[t.account_id as string] || 'PEN'
                totalConverted += convertAmount(amount, currency, userCurrency, rateMap)
            })

            return {
                date: dateStr,
                displayDate: format(day, 'dd/MM'),
                amount: totalConverted
            }
        })

        const total = chartData.reduce((acc, curr) => acc + curr.amount, 0)
        const avg = total / chartData.length

        // Find last day with activity if today is 0
        const activeHistory = [...chartData].reverse()
        const lastActive = activeHistory.find(d => d.amount > 0)?.amount || 0

        return NextResponse.json({
            history: chartData,
            avg,
            yesterdayData: chartData[chartData.length - 2] || { amount: 0 },
            todayData: chartData[chartData.length - 1] || { amount: 0 },
            lastActive
        })

    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[DAILY_VOLATILITY]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
