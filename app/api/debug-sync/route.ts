export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Get PayPal account
        const { data: accounts } = await supabase
            .from('accounts')
            .select('*')
            .ilike('name', '%PayPal%')

        if (!accounts || accounts.length === 0) {
            return NextResponse.json({ error: 'PayPal account not found' })
        }

        const paypal = accounts[0]

        // Get transactions for this account
        const { data: txs } = await supabase
            .from('transactions')
            .select('amount, transaction_type, description, transaction_date')
            .eq('account_id', paypal.id)
            .order('transaction_date', { ascending: false })

        const netChange = (txs || []).reduce((sum, tx) => {
            const amt = Number(tx.amount)
            if (tx.transaction_type === 'INCOME') return sum + amt
            if (tx.transaction_type === 'EXPENSE') return sum - amt
            return sum
        }, 0)

        const expected = Number(paypal.initial_balance || 0) + netChange

        return NextResponse.json({
            account: {
                id: paypal.id,
                name: paypal.name,
                initial: paypal.initial_balance,
                current: paypal.current_balance,
                expected: expected,
                diff: expected - Number(paypal.current_balance)
            },
            transactionCount: txs?.length || 0,
            transactions: txs?.slice(0, 5)
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
