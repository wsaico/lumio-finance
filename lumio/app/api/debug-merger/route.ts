import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { count: userCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', 'fe143875-91af-4f60-85c1-e3ded605a4a2')

    const { count: systemCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', 'e1000000-0000-0000-0000-000000000015')

    return NextResponse.json({
        user_deudas_count: userCount,
        system_deudas_count: systemCount
    })
}
