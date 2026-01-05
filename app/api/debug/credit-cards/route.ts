export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: accounts } = await supabase.from('accounts').select('*').ilike('name', '%BCP%')
        if (!accounts || accounts.length === 0) return NextResponse.json({ error: 'Not found' })

        const b = accounts[0]
        return NextResponse.json({
            name: b.name,
            id: b.id,
            type: b.account_type,
            limit: b.credit_limit,
            used: b.used_balance,
            current: b.current_balance,
            currency: b.currency_code,
            initial: b.initial_balance
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        return NextResponse.json({ error: error.message })
    }
}
