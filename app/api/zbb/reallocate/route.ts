import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await request.json()
        const { cycleId, fromId, toId, amount } = body

        if (!cycleId || !fromId || !toId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
        }

        if (fromId === toId) {
            return NextResponse.json({ error: 'El origen y destino no pueden ser iguales' }, { status: 400 })
        }

        // 1. Fetch Source Allocation
        const { data: fromAlloc, error: fromError } = await supabase
            .from('zbb_allocations')
            .select('*, zbb_planning_cycles(status)')
            .eq('id', fromId)
            .eq('user_id', user.id)
            .single()

        if (fromError || !fromAlloc) throw new Error("No se encontró la asignación de origen")

        // 2. Fetch Destination Allocation
        const { data: toAlloc, error: toError } = await supabase
            .from('zbb_allocations')
            .select('*')
            .eq('id', toId)
            .eq('user_id', user.id)
            .single()

        if (toError || !toAlloc) throw new Error("No se encontró la asignación de destino")

        // 3. Determine Currency (Must match or convert? For Phase 2, let's enforce same currency for simplicity)
        // Checking if we need to support Cross-Currency moves. Usually ZBB is strict.
        // Let's assume user moves PEN to PEN or USD to USD.
        // We need to check which currency has the balance.

        let currency = ''
        if (fromAlloc.allocated_amount_pen >= amount) {
            currency = 'PEN'
        } else if (fromAlloc.allocated_amount_usd >= amount) {
            currency = 'USD'
        } else {
            return NextResponse.json({ error: 'Saldo insuficiente en el origen seleccionado' }, { status: 400 })
        }

        // Ensure Destination supports (or is empty, which implies we can assign). 
        // Actually Destination might have mix. We just add to its pool of that currency.

        // 4. Perform Updates (Application-Level Transaction)
        // Ideally we'd use RPC, but strict ordering here:

        // A. Decrement Source
        const { error: decError } = await supabase
            .from('zbb_allocations')
            .update({
                allocated_amount_pen: currency === 'PEN' ? fromAlloc.allocated_amount_pen - amount : fromAlloc.allocated_amount_pen,
                allocated_amount_usd: currency === 'USD' ? fromAlloc.allocated_amount_usd - amount : fromAlloc.allocated_amount_usd
            })
            .eq('id', fromId)

        if (decError) throw new Error("Error al debitar origen")

        // B. Increment Destination
        const { error: incError } = await supabase
            .from('zbb_allocations')
            .update({
                allocated_amount_pen: currency === 'PEN' ? toAlloc.allocated_amount_pen + amount : toAlloc.allocated_amount_pen,
                allocated_amount_usd: currency === 'USD' ? toAlloc.allocated_amount_usd + amount : toAlloc.allocated_amount_usd
            })
            .eq('id', toId)

        if (incError) {
            // ROLLBACK A (Manual)
            await supabase.from('zbb_allocations').update({
                allocated_amount_pen: fromAlloc.allocated_amount_pen,
                allocated_amount_usd: fromAlloc.allocated_amount_usd
            }).eq('id', fromId)
            throw new Error("Error al acreditar destino")
        }

        // C. Update Budgets (If Cycle is Active)
        if (fromAlloc.zbb_planning_cycles?.status === 'active') {
            // Decrement Budget Source
            const { data: fromBudget } = await supabase.from('budgets').select('id, amount').eq('zbb_allocation_id', fromId).single()
            if (fromBudget) {
                await supabase.from('budgets').update({ amount: fromBudget.amount - amount }).eq('id', fromBudget.id)
            }

            // Increment Budget Destination
            const { data: toBudget } = await supabase.from('budgets').select('id, amount').eq('zbb_allocation_id', toId).single()
            if (toBudget) {
                await supabase.from('budgets').update({ amount: toBudget.amount + amount }).eq('id', toBudget.id)
            }
        }

        return NextResponse.json({ success: true, message: "Fondos reasignados correctamente" })

    } catch (error: any) {
        console.error("Reallocation Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
