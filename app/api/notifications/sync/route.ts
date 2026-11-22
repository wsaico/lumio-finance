export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncSmartNotifications } from '@/lib/server/smart-notifications'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let mutedTypes: string[] = []
        try {
            const body = await req.json()
            if (Array.isArray(body?.mutedTypes)) {
                mutedTypes = body.mutedTypes.filter((t: unknown) => typeof t === 'string')
            }
        } catch {
            // optional request body
        }

        const result = await syncSmartNotifications(supabase, user.id, { mutedTypes })
        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        console.error('[NOTIFICATIONS_SYNC]', error)
        return NextResponse.json({ error: error?.message || 'Error al sincronizar notificaciones' }, { status: 500 })
    }
}
