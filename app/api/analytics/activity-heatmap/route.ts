export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { subDays, format } from 'date-fns'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const today = new Date()
        const startDate = subDays(today, 365) // Last year

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('transaction_date') // Only need date
            .eq('user_id', user.id)
            .gte('transaction_date', startDate.toISOString())

        if (error) throw error

        // Group by day -> count
        const dailyCounts: Record<string, number> = {}

        transactions?.forEach(t => {
            const date = format(new Date(t.transaction_date), 'yyyy-MM-dd')
            dailyCounts[date] = (dailyCounts[date] || 0) + 1
        })

        const heatmapData = Object.entries(dailyCounts).map(([date, count]) => ({
            date,
            count
        }))

        return NextResponse.json(heatmapData)

    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[ACTIVITY_HEATMAP]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
