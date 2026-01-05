export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }


        const body = await req.json()
        const { budgeting_method } = body

        if (!budgeting_method) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        // 1. Update Profile Preference
        const { data, error } = await supabase
            .from('profiles')
            .update({
                budgeting_method,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[PROFILE_UPDATE]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        // 2. If activating 50/30/20, run Auto-Categorization Logic
        if (budgeting_method === '50_30_20') {
            try {
                // Fetch all expense categories
                const { data: categories } = await supabase
                    .from('expense_categories')
                    .select('id, name')
                    .eq('user_id', user.id)

                if (categories && categories.length > 0) {
                    const updates = categories.map(cat => {
                        let rule = 'WANT' // Default
                        const lowerName = cat.name.toLowerCase()

                        // Logic mirrored from cleanup_and_migrate_50_30_20.sql
                        const NEED_KEYWORDS = ['vivienda', 'alimentación', 'comida', 'salud', 'educación', 'transporte', 'servicious', 'impuestos', 'seguros', 'alquiler', 'luz', 'agua', 'internet']
                        const WANT_KEYWORDS = ['ocio', 'compras', 'cuidado', 'regalos', 'tecnología', 'restaurante', 'viajes', 'entretenimiento', 'vicios', 'mascotas', 'streaming', 'suscripciones']
                        const SAVINGS_KEYWORDS = ['ahorro', 'inversión', 'deudas', 'fondo', 'emergencia']

                        if (NEED_KEYWORDS.some(k => lowerName.includes(k))) rule = 'NEED'
                        else if (SAVINGS_KEYWORDS.some(k => lowerName.includes(k))) rule = 'SAVINGS'
                        else if (WANT_KEYWORDS.some(k => lowerName.includes(k))) rule = 'WANT'

                        return {
                            id: cat.id,
                            budget_rule: rule,
                            updated_at: new Date().toISOString()
                        }
                    })

                    // Perform bulk update (or individual if supabase client limitations)
                    // Supabase JS client doesn't support bulk update with different values easily in one query without RPC
                    // We will do parallel promises for simplicity as category count is low per user
                    await Promise.all(updates.map(update =>
                        supabase
                            .from('expense_categories')
                            .update({ budget_rule: update.budget_rule })
                            .eq('id', update.id)
                    ))
                }
            } catch (autoConfigError) {
                console.error('[AUTO_CONFIG_50_30_20]', autoConfigError)
                // We don't fail the request if this part fails, but we log it
            }
        }

        return NextResponse.json(data)


    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PROFILE_UPDATE]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('budgeting_method')
            .eq('id', user.id)
            .single()

        if (error) {
            console.error('[PROFILE_GET]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PROFILE_GET]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
