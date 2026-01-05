export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { differenceInDays, parseISO } from 'date-fns'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // 1. Fetch History (Income & Expense)
        // We limit to last 500 transactions to keep it fast but accurate enough for recent history
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('id, amount, transaction_date, transaction_type, category:expense_categories(name)')
            .eq('user_id', user.id)
            .order('transaction_date', { ascending: true }) // Oldest first for FIFO simulation
            .limit(500)

        if (error) throw error
        if (!transactions || transactions.length === 0) return NextResponse.json({ age: 0, status: 'NO_DATA' })

        // 2. FIFO Simulation
        let incomeQueue: { date: string, amount: number }[] = []
        let ages: number[] = []

        const totalExpenses = transactions.filter(t => t.transaction_type === 'EXPENSE').length
        const cutoffIndex = Math.max(0, totalExpenses - 20) // Analyze last 20 stats only
        let processedExpenses = 0

        for (const txn of transactions) {
            const amount = Math.abs(txn.amount)

            if (txn.transaction_type === 'INCOME') {
                incomeQueue.push({ date: txn.transaction_date, amount: amount })
            } else if (txn.transaction_type === 'EXPENSE') {
                processedExpenses++
                let expenseRemaining = amount

                // FIFO Matching
                let weightedAgeSum = 0
                let totalMatched = 0

                while (expenseRemaining > 0 && incomeQueue.length > 0) {
                    const incomeBucket = incomeQueue[0]
                    const matchAmount = Math.min(incomeBucket.amount, expenseRemaining)

                    // Calculate Age
                    const days = differenceInDays(parseISO(txn.transaction_date), parseISO(incomeBucket.date))
                    const validDays = Math.max(0, days)

                    weightedAgeSum += validDays * matchAmount
                    totalMatched += matchAmount

                    // Update State
                    expenseRemaining -= matchAmount
                    incomeBucket.amount -= matchAmount

                    if (incomeBucket.amount <= 0.01) {
                        incomeQueue.shift() // Bucket exhausted
                    }
                }

                if (totalMatched > 0) {
                    const avgAgeForTxn = weightedAgeSum / totalMatched

                    // Only record if it's in our "Recent" window
                    if (processedExpenses > cutoffIndex) {
                        ages.push(avgAgeForTxn)
                    }
                }
            }
        }

        // 3. Final Calculation
        if (ages.length === 0) return NextResponse.json({ age: 0, status: 'NOT_ENOUGH_DATA' })

        const totalAge = ages.reduce((a, b) => a + b, 0)
        const ageOfMoney = Math.round(totalAge / ages.length)

        return NextResponse.json({ age: ageOfMoney })

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error("AOM Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
