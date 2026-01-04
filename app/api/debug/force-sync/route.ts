
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Ejecutar la reconciliación SQL (RPC) únicamente
        const { data, error: rpcError } = await supabase.rpc('recalculate_all_account_balances')

        if (rpcError) {
            console.error('RPC Error:', rpcError)
            return NextResponse.json({ error: rpcError.message, code: rpcError.code }, { status: 500 })
        }

        // Verificar resultado en BCP
        const { data: bcp } = await supabase.from('accounts').select('name, used_balance, current_balance').ilike('name', '%BCP%').single()

        return NextResponse.json({
            status: 'SUCCESS',
            rpc_result: data,
            bcp_status: bcp
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
