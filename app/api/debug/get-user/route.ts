
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
        return NextResponse.json({ id: profiles?.[0]?.id })
    } catch (error: any) {
        return NextResponse.json({ error: error.message })
    }
}
