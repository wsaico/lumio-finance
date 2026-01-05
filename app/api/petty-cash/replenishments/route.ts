export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapPettyCashReplenishment } from '@/lib/mappers'

const replenishmentSchema = z.object({
    fundId: z.string().uuid(),
    settlementId: z.string().uuid(),
    replenishmentDate: z.string(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK', 'OTROS']),
    referenceNumber: z.string().optional(),
    approvedBy: z.string().min(1, 'Aprobador requerido'),
    deliveredBy: z.string().optional(),
    receivedBy: z.string().min(1, 'Receptor requerido'),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'CONFIRMED']).optional(),
})

const updateReplenishmentSchema = z.object({
    status: z.enum(['PENDING', 'DELIVERED', 'CONFIRMED']).optional(),
    deliveredBy: z.string().optional(),
    notes: z.string().optional(),
})

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fundId = searchParams.get('fundId')
        const status = searchParams.get('status')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        let query = supabase
            .from('petty_cash_replenishments')
            .select(`
                *,
                fund:petty_cash_funds(id, fund_code, fund_name, responsible_name),
                settlement:petty_cash_settlements(
                    id,
                    settlement_code,
                    settlement_date,
                    total_amount,
                    expense_count,
                    status
                )
            `)
            .eq('user_id', user.id)
            .order('replenishment_date', { ascending: false })

        if (fundId) {
            query = query.eq('fund_id', fundId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (startDate) {
            query = query.gte('replenishment_date', startDate)
        }

        if (endDate) {
            query = query.lte('replenishment_date', endDate)
        }

        const { data: replenishments, error } = await query

        if (error) {
            console.error('[PETTY_CASH_REPLENISHMENTS_GET]', error)
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
        }

        return NextResponse.json(replenishments?.map(mapPettyCashReplenishment) || [])
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_REPLENISHMENTS_GET]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await request.json()
        const validData = replenishmentSchema.parse(body)

        // Validate fund exists and is active
        const { data: fund, error: fundError } = await supabase
            .from('petty_cash_funds')
            .select('id, fund_name, status, assigned_amount')
            .eq('id', validData.fundId)
            .eq('user_id', user.id)
            .single()

        if (fundError || !fund) {
            return new NextResponse(
                JSON.stringify({ error: 'Fondo no encontrado o no autorizado' }),
                { status: 404 }
            )
        }

        if (fund.status !== 'ACTIVE') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Fondo no está activo',
                    details: `El fondo "${fund.fund_name}" tiene estado: ${fund.status}`
                }),
                { status: 400 }
            )
        }

        // Validate settlement exists, belongs to fund, and is accounted
        const { data: settlement, error: settlementError } = await supabase
            .from('petty_cash_settlements')
            .select(`
                id,
                settlement_code,
                fund_id,
                total_amount,
                status,
                replenishment:petty_cash_replenishments(id)
            `)
            .eq('id', validData.settlementId)
            .eq('user_id', user.id)
            .single()

        if (settlementError || !settlement) {
            return new NextResponse(
                JSON.stringify({ error: 'Liquidación no encontrada' }),
                { status: 404 }
            )
        }

        if (settlement.fund_id !== validData.fundId) {
            return new NextResponse(
                JSON.stringify({
                    error: 'La liquidación no pertenece al fondo',
                    details: 'La liquidación debe pertenecer al mismo fondo'
                }),
                { status: 400 }
            )
        }

        // Settlement must be ACCOUNTED before replenishment
        if (settlement.status !== 'ACCOUNTED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Liquidación no contabilizada',
                    details: `La liquidación ${settlement.settlement_code} debe estar en estado ACCOUNTED. Estado actual: ${settlement.status}`
                }),
                { status: 400 }
            )
        }

        // Check if settlement already has replenishment
        if (settlement.replenishment && settlement.replenishment.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Liquidación ya tiene reposición',
                    details: `La liquidación ${settlement.settlement_code} ya fue reintegrada`
                }),
                { status: 400 }
            )
        }

        // Replenishment amount must equal settlement amount
        const amount = Number(settlement.total_amount)

        // Create replenishment (replenishment_code auto-generated by trigger)
        // Fund balance will be updated by trigger when status becomes CONFIRMED
        const { data: replenishment, error: replenishmentError } = await supabase
            .from('petty_cash_replenishments')
            .insert({
                user_id: user.id,
                fund_id: validData.fundId,
                settlement_id: validData.settlementId,
                replenishment_date: validData.replenishmentDate,
                amount: amount,
                payment_method: validData.paymentMethod,
                reference_number: validData.referenceNumber,
                approved_by: validData.approvedBy,
                delivered_by: validData.deliveredBy,
                received_by: validData.receivedBy,
                notes: validData.notes,
                status: validData.status || 'PENDING',
                confirmed_at: validData.status === 'CONFIRMED' ? new Date().toISOString() : null,
                delivered_at: validData.status === 'CONFIRMED' ? new Date().toISOString() : null,
            })
            .select()
            .single()

        if (replenishmentError) {
            console.error('[PETTY_CASH_REPLENISHMENT_CREATE]', replenishmentError)
            return new NextResponse(JSON.stringify({ error: replenishmentError.message }), { status: 500 })
        }

        return NextResponse.json({
            replenishment: mapPettyCashReplenishment(replenishment),
            message: 'Reposición creada exitosamente. El fondo se actualizará cuando se confirme la entrega.'
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_REPLENISHMENT_POST]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return new NextResponse(JSON.stringify({ error: 'ID requerido' }), { status: 400 })
        }

        const validData = updateReplenishmentSchema.parse(updates)

        // Get current replenishment
        const { data: currentReplenishment } = await supabase
            .from('petty_cash_replenishments')
            .select('status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!currentReplenishment) {
            return new NextResponse(JSON.stringify({ error: 'Reposición no encontrada' }), { status: 404 })
        }

        // Build update object
        const updateData: any = { ...validData, updated_at: new Date().toISOString() }

        // Set timestamps based on status change
        if (validData.status === 'DELIVERED' && currentReplenishment.status !== 'DELIVERED') {
            updateData.delivered_at = new Date().toISOString()
        }

        if (validData.status === 'CONFIRMED' && currentReplenishment.status !== 'CONFIRMED') {
            updateData.confirmed_at = new Date().toISOString()
            // Trigger will update fund balance automatically
        }

        // Update replenishment
        const { data: replenishment, error: updateError } = await supabase
            .from('petty_cash_replenishments')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('[PETTY_CASH_REPLENISHMENT_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({ error: updateError.message }), { status: 500 })
        }

        let message = 'Reposición actualizada exitosamente'
        if (validData.status === 'CONFIRMED') {
            message = 'Reposición confirmada. El fondo ha sido actualizado.'
        }

        return NextResponse.json({ replenishment: mapPettyCashReplenishment(replenishment), message })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_REPLENISHMENT_PATCH]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return new NextResponse(JSON.stringify({ error: 'ID requerido' }), { status: 400 })
        }

        // Get replenishment
        const { data: replenishment } = await supabase
            .from('petty_cash_replenishments')
            .select('id, status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!replenishment) {
            return new NextResponse(JSON.stringify({ error: 'Reposición no encontrada' }), { status: 404 })
        }

        // Cannot delete if confirmed (balance already updated)
        if (replenishment.status === 'CONFIRMED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede eliminar',
                    details: 'No se puede eliminar una reposición confirmada porque ya actualizó el balance del fondo'
                }),
                { status: 400 }
            )
        }

        // Delete replenishment
        const { error: deleteError } = await supabase
            .from('petty_cash_replenishments')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('[PETTY_CASH_REPLENISHMENT_DELETE]', deleteError)
            return new NextResponse(JSON.stringify({ error: deleteError.message }), { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Reposición eliminada exitosamente' })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_REPLENISHMENT_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}
