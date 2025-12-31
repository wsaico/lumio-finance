import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'

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

        // 1. Get current total balance of all accounts
        const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('current_balance, currency_code')
            .eq('user_id', user.id)

        if (accountsError) throw accountsError

        // Determine base currency (assuming PEN for simplicity or getting from settings)
        // For now, we'll sum everything as is if same currency, or just grab the primary ones.
        // ideally we convert. For this implementation, let's assume simple summation or just main currency accounts
        // To be accurate, we really should convert. Let's rely on the fact that we maintain 'current_balance' in the DB.

        // BETTER APPROACH:
        // We need to query transactions to reverse-engineer the balance.
        // Current Balance = Initial Balance + All Time Transactions
        // Balance at Date X = Current Balance - (Transactions after Date X)

        // 1. Calculate Current Total Balance (converted to PEN roughly for trend if mixed, or just sums)
        // Note: Real conversion requires exchange rates. For trend, let's stick to the user's base currency if possible.
        // Let's assume the user viewing the dashboard sees the total in PEN (as per previous widgets).

        let currentTotalBalance = 0
        // We need exchange rates to be accurate. 
        // Let's fetch exchange rates roughly or just sum PEN accounts for the trend to avoid complexity 
        // if we don't have a backend conversion service handy in this specific route.
        // However, referencing 'use-accounts.ts', frontend does conversion.
        // Doing it in backend is safer.

        // simplified: Just sum PEN accounts for the trend, or converting all to PEN 
        // assuming static rates for history (approximation).

        // simplified: Just sum PEN accounts for the trend, or converting all to PEN 
        // assuming static rates for history (approximation).

        // This table might not exist or be populated well.

        // Let's go with: Sum of "current_balance" of accounts, converting roughly.
        // Actually, let's look at accounts.
        for (const acc of accounts) {
            let amount = Number(acc.current_balance)
            if (acc.currency_code === 'USD') {
                amount = amount * 3.75 // Approx rate or fetch recent
            }
            currentTotalBalance += amount
        }

        // 2. Get transactions for the lookback period to now
        const startDate = startOfMonth(subMonths(new Date(), monthsToLookBack - 1))

        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount, transaction_type, transaction_date, currency_code, account:accounts(currency_code)')
            .eq('user_id', user.id)
            .gte('transaction_date', startDate.toISOString())
            .order('transaction_date', { ascending: false })

        if (txError) throw txError

        // 3. Reconstruct monthly balances
        // We start with current balance and subtract transactions to go back in time.
        // But wait, "Trend" charts usually show the balance at the END of each month.

        const trendData = []
        let runningBalance = currentTotalBalance
        const now = new Date()

        // Loop from current month back to start month
        for (let i = 0; i < monthsToLookBack; i++) {
            const targetMonthDate = subMonths(now, i)
            const monthLabel = format(targetMonthDate, 'MMM', { locale: es })
            const fullDateLabel = format(targetMonthDate, 'MMMM yyyy', { locale: es })

            // Define the time window relative to the running balance pointer (which starts at "now" aka end of current chart)
            // Actually, easier way:
            // Point A: Now. Balance = X.
            // Point B: End of Last Month. Balance = X - (Transactions in Current Month up to Now).
            // Point C: End of Month Before. Balance = BalanceAtB - (Transactions in Last Month).

            // transactions are ordered DESC (newest first).
            // We can iterate transactions.

            const monthStart = startOfMonth(targetMonthDate)
            const monthEnd = endOfMonth(targetMonthDate)

            // If i=0 (current month), the balance at "End of Month" isn't known yet, 
            // but the "Current Balance" is effectively the balance chart point for "Now".
            // However, charts usually align to month boundaries.
            // Let's define the point as "Balance at the end of this month (projected)" or "Current Balance".

            // Let's simply snapshot the balance at the end of each month.
            // For the current month, it's the current balance.
            // For previous months, we subtract transactions that happened AFTER that month's end.

            if (i > 0) {
                // Filter transactions that happened AFTER the end of targetMonthDate
                // But we are doing this loop iteratively? No, that's inefficient.
                // Let's just calculate it.
            }
        }

        // Easier Algorithm:
        // 1. Start with `currentTotalBalance`. This is the value for "Today".
        // 2. Iterate backwards through months.
        // 3. For each step back, identify transactions that occurred in the interval [End of Month N, Today].
        //    Actually, simpler:
        //    Balance_End_Month_N = Current_Balance - Sum(Transactions > End_Month_N)

        const monthlyBalances = []

        for (let i = 0; i < monthsToLookBack; i++) {
            const date = subMonths(now, i)
            const endOfThatMonth = endOfMonth(date)

            // To get balance at `endOfThatMonth`, we subtract all transactions that happened AFTER it.
            // Note: If transaction is INCOME, we essentially "un-earn" it (subtract).
            // If EXPENSE, we "un-spend" it (add).

            const txsAfter = transactions?.filter(tx => new Date(tx.transaction_date) > endOfThatMonth) || []

            let adjustment = 0
            txsAfter.forEach(tx => {
                let amount = Number(tx.amount)
                // Convert to PEN if needed
                const acc = Array.isArray(tx.account) ? tx.account[0] : tx.account
                const currency = tx.currency_code || acc?.currency_code || 'PEN'
                if (currency === 'USD') amount *= 3.75

                if (tx.transaction_type === 'INCOME') {
                    adjustment += amount // We had it, so to go back, we subtract it? No.
                    // Balance_Now = Balance_Old + Income - Expense
                    // Balance_Old = Balance_Now - Income + Expense
                    // So we SUBTRACT income.
                } else if (tx.transaction_type === 'EXPENSE') {
                    adjustment -= amount // We spent it, so to go back, we add it back?
                    // Balance_Old = Balance_Now + Expense
                    // So we ADD expense (subtract negative?)
                    // Logic check:
                    // Start $100. Spend $20. End $80.
                    // To get Start from End: $80 + $20 = $100.
                }
            })

            // Wait, my adjustment variable logic above is slightly mixed.
            // Let's do:
            // historicBalance = currentTotalBalance - (Income_After) + (Expense_After)

            let totalIncomeAfter = 0
            let totalExpenseAfter = 0

            txsAfter.forEach(tx => {
                let amount = Number(tx.amount)
                const acc = Array.isArray(tx.account) ? tx.account[0] : tx.account
                const currency = tx.currency_code || acc?.currency_code || 'PEN'
                if (currency === 'USD') amount *= 3.75

                if (tx.transaction_type === 'INCOME') totalIncomeAfter += amount
                if (tx.transaction_type === 'EXPENSE') totalExpenseAfter += amount
                // Transfers? Ideally net 0 if internal, but what if cross-currency? Ignored for now.
            })

            const historicBalance = currentTotalBalance - totalIncomeAfter + totalExpenseAfter

            monthlyBalances.push({
                month: format(date, 'MMM', { locale: es }),
                fullDate: format(date, 'MM/yyyy'),
                balance: historicBalance
            })
        }

        return NextResponse.json(monthlyBalances.reverse())

    } catch (error) {
        console.error('[BALANCE_TREND]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
