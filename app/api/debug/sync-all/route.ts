
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Call the RPC function defined in the last migration
        const { error } = await supabase.rpc('recalculate_all_account_balances')

        if (error) {
            // If RPC doesn't exist yet, it means migration wasn't applied
            if (error.code === 'P0001' || error.message?.includes('function') || error.message?.includes('does not exist')) {
                return NextResponse.json({
                    status: 'NOT_READY',
                    message: 'La función de reconciliación no existe. Por favor, aplica la migración "20260103_fix_balance_trigger_security.sql" en Supabase primero.'
                })
            }
            throw error
        }

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Todos los saldos han sido reconciliados con el historial de transacciones.'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
