
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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

        // Try to fetch from real DB if schema exists
        try {
            // This will fail if DB columns don't exist
            /*
            const account = await prisma.account.findFirst({
                where: { userId: user.id, accountType: 'PETTY_CASH' }
            })
            */
            // Returning mock for UI demo purposes until migration is fixed
            return NextResponse.json(MOCK_PETTY_CASH)
        } catch (e) {
            return NextResponse.json(MOCK_PETTY_CASH)
        }

    } catch (error) {
        console.error('[PETTY_CASH_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
