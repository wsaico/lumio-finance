import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    // Get all transaction dates
    const { data, error } = await supabase
        .from('transactions')
        .select('transaction_date')
        .eq('user_id', user.id)

    if (error) return new NextResponse(error.message, { status: 500 })

    // Aggregate in memory (simple for debug)
    const counts: Record<string, number> = {}
    data?.forEach((t: any) => {
        const year = new Date(t.transaction_date).getFullYear()
        const month = new Date(t.transaction_date).getMonth() + 1
        const key = `${year}-${month.toString().padStart(2, '0')}`
        counts[key] = (counts[key] || 0) + 1
    })

    return NextResponse.json(counts)
}
