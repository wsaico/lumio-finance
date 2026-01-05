export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'
import { format } from 'date-fns'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const month = searchParams.get('month')
        const year = searchParams.get('year')

        if (!month || !year) {
            return new NextResponse('Month and Year required', { status: 400 })
        }

        const startDate = new Date(Number(year), Number(month) - 1, 1)
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59)

        const startDateStr = format(startDate, 'yyyy-MM-dd')
        const endDateStr = format(endDate, 'yyyy-MM-dd HH:mm:ss')

        // Parallel fetch for ALL required data
        const [
            rateMapRes,
            accountsRes,
            incomeRes,
            expenseRes,
            countRes
        ] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code').eq('user_id', user.id),
            supabase.from('transactions')
                .select('amount, currency_code, account_id')
                .eq('user_id', user.id)
                .eq('transaction_type', 'INCOME')
                .gte('transaction_date', startDateStr)
                .lte('transaction_date', endDateStr),
            supabase.from('transactions')
                .select('amount, currency_code, account_id')
                .eq('user_id', user.id)
                .eq('transaction_type', 'EXPENSE')
                .gte('transaction_date', startDateStr)
                .lte('transaction_date', endDateStr),
            supabase.from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('transaction_date', startDateStr)
                .lte('transaction_date', endDateStr)
        ])

        if (incomeRes.error) throw incomeRes.error
        if (expenseRes.error) throw expenseRes.error
        if (countRes.error) throw countRes.error

        const rateMap = rateMapRes
        const userCurrencyCode = user.user_metadata?.currency || 'PEN'
        const accounts = accountsRes.data || []
        const incomeData = incomeRes.data || []
        const expenseData = expenseRes.data || []
        const transactionCount = countRes.count || 0

        const accountCurrencyMap: Record<string, string> = {}
        accounts.forEach(acc => {
            accountCurrencyMap[acc.id] = acc.currency_code
        })

        // Calculate converted income
        let totalIncome = 0
        for (const t of incomeData) {
            const amount = Number(t.amount) || 0
            const currency = t.currency_code || accountCurrencyMap[t.account_id as string] || 'PEN'
            totalIncome += convertAmount(amount, currency, userCurrencyCode, rateMap)
        }

        // Calculate converted expense
        let totalExpense = 0
        for (const t of expenseData) {
            const amount = Number(t.amount) || 0
            const currency = t.currency_code || accountCurrencyMap[t.account_id as string] || 'PEN'
            totalExpense += convertAmount(amount, currency, userCurrencyCode, rateMap)
        }

        return NextResponse.json({
            month: Number(month),
            year: Number(year),
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            transactionCount: transactionCount || 0,
            currency: userCurrencyCode
        })

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ANALYTICS_MONTHLY_SUMMARY] CRITICAL_ERROR:', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details,
            stack: error.stack
        })

        return NextResponse.json({
            error: 'Internal Error',
            details: error.message || String(error),
            code: error.code
        }, { status: 500 })
    }
}
