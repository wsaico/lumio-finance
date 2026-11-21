export const dynamic = 'force-dynamic'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { processDueRecurringRules } from '@/lib/server/smart-notifications'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
    }

    try {
        // Use Service Role client in Cron so RLS does not block background execution across users
        const supabase =
            process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
                ? createAdminClient(
                      process.env.NEXT_PUBLIC_SUPABASE_URL,
                      process.env.SUPABASE_SERVICE_ROLE_KEY,
                      { auth: { persistSession: false } }
                  )
                : await createServerClient()

        const { processed, results } = await processDueRecurringRules(supabase)

        return NextResponse.json({
            success: true,
            processed,
            results,
        })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }

        console.error('[CRON_RECURRING]', error)
        return NextResponse.json({ error: error?.message || 'Internal Error' }, { status: 500 })
    }
}
