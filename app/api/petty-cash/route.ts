import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// MOCK DATA as Fallback if DB Schema is not updated
const MOCK_PETTY_CASH = {
    cashBalance: 450.00,
    fixedFund: 1500.00,
    provisionals: 200.00,
    pendingLiquidation: 850.00,
    liquidations: [],
    transactions: []
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        // Returning mock for UI demo purposes until migration is fixed
        return NextResponse.json(MOCK_PETTY_CASH)

    } catch (error) {
        console.error('[PETTY_CASH_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
