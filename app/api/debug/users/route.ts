export const dynamic = 'force-dynamic';

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
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        return new NextResponse("ERROR:" + error.message)
    }
}
