export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const monthsParam = searchParams.get('months')
        const monthsToLookBack = monthsParam ? parseInt(monthsParam) : 6

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Fetch rates Map early
        const rateMap = await getExchangeRatesMap(supabase)
        const targetCurrency = user.user_metadata?.currency || 'PEN'

        // 1. Get current total balance of all accounts
        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id, current_balance, currency_code')
            .eq('user_id', user.id)

        if (accountsError) throw accountsError

        let currentTotalBalance = 0
        const accountsData = accounts || []
        const accountCurrencyMap: Record<string, string> = {}

        accountsData.forEach((acc: any) => {
            accountCurrencyMap[acc.id] = acc.currency_code

            const amount = Number(acc.current_balance)
            const currency = acc.currency_code
            currentTotalBalance += convertAmount(amount, currency, targetCurrency, rateMap)
        })

        // 2. Get transactions for the lookback period to now
        const startDate = startOfMonth(subMonths(new Date(), monthsToLookBack - 1))

        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount, transaction_type, transaction_date, currency_code, account_id')
            .eq('user_id', user.id)
            .gte('transaction_date', startDate.toISOString())
            .order('transaction_date', { ascending: false })

        if (txError) throw txError

        // ... existing logic ...

        const monthlyBalances = []
        const now = new Date()

        for (let i = 0; i < monthsToLookBack; i++) {
            const date = subMonths(now, i)
            const endOfThatMonth = endOfMonth(date)

            // transactions that happened AFTER the end of that month
            const txsAfter = transactions?.filter(tx => new Date(tx.transaction_date) > endOfThatMonth) || []

            let totalIncomeAfter = 0
            let totalExpenseAfter = 0

            txsAfter.forEach(tx => {
                const rawAmount = Number(tx.amount)
                const currency = tx.currency_code || accountCurrencyMap[tx.account_id] || 'PEN'
                const amount = convertAmount(rawAmount, currency, targetCurrency, rateMap)

                if (tx.transaction_type === 'INCOME') totalIncomeAfter += amount
                if (tx.transaction_type === 'EXPENSE') totalExpenseAfter += amount
            })

            // Calculate historic balance
            const historicBalance = currentTotalBalance - totalIncomeAfter + totalExpenseAfter

            monthlyBalances.push({
                month: format(date, 'MMM', { locale: es }),
                fullDate: format(date, 'MM/yyyy'),
                balance: historicBalance
            })

        }

        return NextResponse.json(monthlyBalances.reverse())

    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[BALANCE_TREND]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
