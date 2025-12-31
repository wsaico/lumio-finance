import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json({ error: 'Code parameter required' }, { status: 400 })
        }

        // Check if settlement code already exists for this user
        const { data: existing } = await supabase
            .from('petty_cash_settlements')
            .select('id')
            .eq('settlement_code', code)
            .eq('user_id', user.id)
            .single()

        return NextResponse.json({
            available: !existing,
            code
        })
    } catch (error: any) {
        console.error('[SETTLEMENT_CODE_CHECK]', error)
        return NextResponse.json(
            { error: 'Internal Error', details: error.message },
            { status: 500 }
        )
    }
}
