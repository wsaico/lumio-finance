
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: profiles } = await supabase.from('profiles').select('*')
        if (!profiles) return new NextResponse("NONE")

        const out = profiles.map(p => [
            `ID=${p.id}`,
            `NAME=${p.full_name}`,
            `EMAIL=${p.email}`
        ].join('|')).join('\n')

        return new NextResponse(out)
    } catch (error: any) {
        return new NextResponse("ERROR:" + error.message)
    }
}
