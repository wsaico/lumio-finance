import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Bypass Auth: Get first user from accounts
    const { data: accounts } = await supabase.from('accounts').select('user_id, id, currency_code').limit(2)
    const userId = accounts?.[0]?.user_id
    const accountA = accounts?.[0]?.id
    const accountB = accounts?.[1]?.id
    const currency = accounts?.[0]?.currency_code || 'PEN'

    if (!userId || !accountA) return NextResponse.json({ error: 'Not sufficient accounts found' })

    const results = []
    let createdIds = { txIds: [] as string[] }

    try {
        // 1. CREATE TRANSACTIONS
        // ----------------------
        const now = new Date().toISOString()
        const txData = [
            // Tx A in Account A ($100)
            { user_id: userId, account_id: accountA, currency_code: currency, amount: 100, transaction_type: 'EXPENSE', transaction_date: now, description: 'Test Expense Acc A' },
            // Tx B in Account B ($50)
            { user_id: userId, account_id: accountB || accountA, currency_code: currency, amount: 50, transaction_type: 'EXPENSE', transaction_date: now, description: 'Test Expense Acc B' }
        ]

        const { data: txs, error: txError } = await supabase.from('transactions').insert(txData).select()
        if (txError) throw new Error('Tx creation failed: ' + txError.message)
        createdIds.txIds = txs.map(t => t.id)
        results.push(`✅ Created ${txs.length} Transactions`)

        // 2. RUN TESTS
        // ------------

        const runBudgetCalc = async (accountIds: string[]) => {
            let query = supabase.from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .in('id', createdIds.txIds)

            if (accountIds.length > 0) {
                query = query.in('account_id', accountIds)
            }

            const { data } = await query
            return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
        }

        // Case A: Global (No account filter) -> Should be 150
        const spentGlobal = await runBudgetCalc([])
        const expectedGlobal = 150

        if (spentGlobal === expectedGlobal) {
            results.push(`✅ TEST 1 PASSED: Global Scope. Spent: ${spentGlobal} (Expected: ${expectedGlobal})`)
        } else {
            results.push(`❌ TEST 1 FAILED: Global Scope. Spent: ${spentGlobal} (Expected: ${expectedGlobal})`)
        }

        // Case B: Specific Account A -> Should be 100
        // Only run if we actually have distinct accounts
        if (accountB && accountA !== accountB) {
            const spentSpecific = await runBudgetCalc([accountA])
            const expectedSpecific = 100

            if (spentSpecific === expectedSpecific) {
                results.push(`✅ TEST 2 PASSED: Specific Account A. Spent: ${spentSpecific} (Expected: ${expectedSpecific})`)
            } else {
                results.push(`❌ TEST 2 FAILED: Specific Account A. Spent: ${spentSpecific} (Expected: ${expectedSpecific})`)
            }
        } else {
            results.push('⚠️ Skipping Test 2: Only 1 account available.')
        }

    } catch (e: any) {
        results.push('❌ CRITICAL ERROR: ' + e.message)
    } finally {
        // 4. CLEANUP
        if (createdIds.txIds.length) await supabase.from('transactions').delete().in('id', createdIds.txIds)
        results.push('🧹 Cleanup Complete')
    }

    return NextResponse.json({ results })
}
