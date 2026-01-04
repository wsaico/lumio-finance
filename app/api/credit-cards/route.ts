
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { data: cards, error } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (error) {
            console.error('[CREDIT_CARDS_GET]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        return NextResponse.json(cards)
    } catch (error) {
        console.error('[CREDIT_CARDS_GET_INTERNAL]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
