export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_CURRENCY } from '@/lib/currencies'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'

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

        const currency = user.user_metadata?.currency || DEFAULT_CURRENCY
        const [rateMap, accountsRes] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code').eq('user_id', user.id)
        ])
        const accountCurrencyMap: Record<string, string> = {}
        ;(accountsRes.data || []).forEach(a => { accountCurrencyMap[a.id] = a.currency_code })
        const toBase = (amount: number, tx: any) => convertAmount(Number(amount) || 0, tx.currency_code || accountCurrencyMap[tx.account_id], currency, rateMap)

        // 0. Fetch Categories explicitly (Robust Split queries for RLS safety)
        const [userExp, sysExp] = await Promise.all([
            supabase.from('expense_categories').select('id, budget_rule').eq('user_id', user.id),
            supabase.from('expense_categories').select('id, budget_rule').is('user_id', null)
        ])
        const categoryMap: Record<string, string> = {}
        const allExpCats = [...(userExp.data || []), ...(sysExp.data || [])]
        allExpCats.forEach(c => { categoryMap[c.id] = c.budget_rule })

        // 1. Fetch Total Income (Base for 100%)
        const { data: incomeData, error: incomeError } = await supabase
            .from('transactions')
            .select('amount, currency_code, account_id')
            .eq('user_id', user.id)
            .eq('transaction_type', 'INCOME')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

        if (incomeError) throw incomeError

        const totalIncome = incomeData.reduce((sum, t) => sum + toBase(t.amount, t), 0)

        // 2. Fetch All Outflows (Expenses, Loan Payments, Savings Deposits)
        const { data: outflows, error: outflowError } = await supabase
            .from('transactions')
            .select('amount, currency_code, account_id, transaction_type, loan_id, savings_goal_id, expense_category_id')
            .eq('user_id', user.id)
            .in('transaction_type', ['EXPENSE', 'LOAN_PAYMENT', 'SAVINGS_DEPOSIT', 'DEBT_PAYMENT'])
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

        if (outflowError) throw outflowError

        // Calculate Totals
        let needs = 0
        let wants = 0
        let savings = 0

        // Process Outflows
        outflows.forEach((tx: any) => {
            const amount = toBase(tx.amount, tx)
            const type = tx.transaction_type
            const rule = tx.expense_category_id ? categoryMap[tx.expense_category_id] : null
            const hasLoan = !!tx.loan_id
            const hasSavingsGoal = !!tx.savings_goal_id

            // Priority Logic:
            // 1. Explicit Savings (Type or Linked Goal)
            if (type === 'SAVINGS_DEPOSIT' || hasSavingsGoal) {
                savings += amount
                return
            }

            // 2. Debt Payments (Loans = Financial Freedom portion of 20%)
            if (hasLoan || type === 'LOAN_PAYMENT' || type === 'DEBT_PAYMENT') {
                savings += amount
                return
            }

            // 3. Categorized Expenses
            if (rule === 'NEED') {
                needs += amount
            } else if (rule === 'WANT') {
                wants += amount
            } else if (rule === 'SAVINGS') {
                savings += amount
            } else {
                // 4. Unclassified -> Default to WANT (Conservative)
                wants += amount
            }
        })

        // Calculate Percentages
        // Base is Total Income. If Income is 0, use Total Spend as 100% basis (fallback)
        const totalSpent = needs + wants + savings
        const base = totalIncome > 0 ? totalIncome : totalSpent

        // Fetch user profile for budgeting method
        const { data: profile } = await supabase
            .from('profiles')
            .select('budgeting_method')
            .eq('id', user.id)
            .single()

        return NextResponse.json({
            budgetingMethod: profile?.budgeting_method || 'TRADITIONAL',
            totalIncome,
            totalSpent,
            currency,
            baseUsed: base, // Inform frontend what was used as 100%
            analysis: {
                needs: {
                    amount: needs,
                    percent: base > 0 ? (needs / base) * 100 : 0,
                    target: 50,
                    status: (needs / base) * 100 > 50 ? 'WARNING' : 'OK'
                },
                wants: {
                    amount: wants,
                    percent: base > 0 ? (wants / base) * 100 : 0,
                    target: 30,
                    status: (wants / base) * 100 > 30 ? 'WARNING' : 'OK'
                },
                savings: {
                    amount: savings,
                    percent: base > 0 ? (savings / base) * 100 : 0,
                    target: 20,
                    status: (savings / base) * 100 < 20 ? 'WARNING' : 'OK'
                }
            }
        })

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ANALYTICS_50_30_20]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
