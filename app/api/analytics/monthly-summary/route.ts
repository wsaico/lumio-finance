import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString()
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString()

        // Fetch Income Transactions
        const { data: incomeData, error: incomeError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'INCOME')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

        if (incomeError) throw incomeError

        const totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        // Fetch Expense Transactions
        const { data: expenseData, error: expenseError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('transaction_type', 'EXPENSE')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

        if (expenseError) throw expenseError

        const totalExpense = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0

        // Count total transactions
        const { count: transactionCount, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

        if (countError) throw countError

        return NextResponse.json({
            month: Number(month),
            year: Number(year),
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            transactionCount: transactionCount || 0,
            currency: user.user_metadata?.currency || 'PEN'
        })

    } catch (error: any) {
        console.error('[ANALYTICS_MONTHLY_SUMMARY]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
