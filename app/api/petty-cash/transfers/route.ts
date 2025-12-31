import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapPettyCashTransfer } from '@/lib/mappers'

const transferSchema = z.object({
    fromFundId: z.string().uuid(),
    toResponsibleName: z.string().min(1, 'Nuevo responsable requerido'),
    toResponsibleId: z.string().optional(),
    transferDate: z.string(),
    amount: z.number().positive('Monto debe ser positivo'),
    transferType: z.enum(['PARTIAL', 'TOTAL', 'TEMPORARY']),
    reason: z.string().min(1, 'Motivo requerido'),
    receiptNumber: z.string().optional(),
    returnDate: z.string().optional(),
    deliveredBy: z.string().optional(),
    receivedBy: z.string().optional(),
    notes: z.string().optional(),
})

const updateTransferSchema = z.object({
    status: z.enum(['PENDING', 'DELIVERED', 'RETURNED', 'CANCELLED']).optional(),
    deliveredBy: z.string().optional(),
    receivedBy: z.string().optional(),
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
        const transferType = searchParams.get('transferType')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        let query = supabase
            .from('petty_cash_transfers')
            .select(`
                *,
                fund:petty_cash_funds(
                    id,
                    fund_code,
                    fund_name,
                    responsible_name,
                    current_balance
                )
            `)
            .eq('user_id', user.id)
            .order('transfer_date', { ascending: false })

        if (fundId) {
            query = query.eq('from_fund_id', fundId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (transferType) {
            query = query.eq('transfer_type', transferType)
        }

        if (startDate) {
            query = query.gte('transfer_date', startDate)
        }

        if (endDate) {
            query = query.lte('transfer_date', endDate)
        }

        const { data: transfers, error } = await query

        if (error) {
            console.error('[PETTY_CASH_TRANSFERS_GET]', error)
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
        }

        return NextResponse.json(transfers?.map(mapPettyCashTransfer) || [])
    } catch (error: any) {
        console.error('[PETTY_CASH_TRANSFERS_GET]', error)
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
        const validData = transferSchema.parse(body)

        // Validate fund exists and is active
        const { data: fund, error: fundError } = await supabase
            .from('petty_cash_funds')
            .select('id, fund_name, current_balance, assigned_amount, status, responsible_name')
            .eq('id', validData.fromFundId)
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

        // Validate amount based on transfer type
        if (validData.transferType === 'TOTAL' && validData.amount !== Number(fund.current_balance)) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Monto incorrecto para transferencia TOTAL',
                    details: `Para transferir el fondo completo, el monto debe ser S/ ${fund.current_balance}. Monto ingresado: S/ ${validData.amount}`
                }),
                { status: 400 }
            )
        }

        if (validData.transferType === 'PARTIAL' && validData.amount >= Number(fund.current_balance)) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Monto incorrecto para transferencia PARCIAL',
                    details: `Para transferencia parcial, el monto debe ser menor al saldo actual (S/ ${fund.current_balance})`
                }),
                { status: 400 }
            )
        }

        // Validate return date for TEMPORARY transfers
        if (validData.transferType === 'TEMPORARY' && !validData.returnDate) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Fecha de retorno requerida',
                    details: 'Las transferencias temporales deben tener una fecha de retorno programada'
                }),
                { status: 400 }
            )
        }

        // Validate transfer to self
        if (validData.toResponsibleName === fund.responsible_name) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Transferencia inválida',
                    details: 'No se puede transferir el fondo al mismo responsable actual'
                }),
                { status: 400 }
            )
        }

        // Check for pending transfers
        const { data: pendingTransfers } = await supabase
            .from('petty_cash_transfers')
            .select('id')
            .eq('from_fund_id', validData.fromFundId)
            .in('status', ['PENDING', 'DELIVERED'])
            .limit(1)

        if (pendingTransfers && pendingTransfers.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Transferencia pendiente',
                    details: 'Existe una transferencia pendiente para este fondo. Complete o cancele la transferencia anterior.'
                }),
                { status: 400 }
            )
        }

        // Create transfer (transfer_code auto-generated by trigger)
        const { data: transfer, error: transferError } = await supabase
            .from('petty_cash_transfers')
            .insert({
                user_id: user.id,
                from_fund_id: validData.fromFundId,
                to_responsible_name: validData.toResponsibleName,
                to_responsible_id: validData.toResponsibleId,
                transfer_date: validData.transferDate,
                amount: validData.amount,
                transfer_type: validData.transferType,
                reason: validData.reason,
                receipt_number: validData.receiptNumber,
                return_date: validData.returnDate,
                status: 'PENDING',
                delivered_by: validData.deliveredBy,
                received_by: validData.receivedBy,
                notes: validData.notes
            })
            .select()
            .single()

        if (transferError) {
            console.error('[PETTY_CASH_TRANSFER_CREATE]', transferError)
            return new NextResponse(JSON.stringify({ error: transferError.message }), { status: 500 })
        }

        // If TOTAL transfer, update fund responsible (when delivered)
        // This will be handled in PATCH when status changes to DELIVERED

        return NextResponse.json({
            transfer: mapPettyCashTransfer(transfer),
            message: 'Transferencia creada exitosamente. Requiere confirmación de entrega.'
        })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_TRANSFER_POST]', error)
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

        const validData = updateTransferSchema.parse(updates)

        // Get current transfer
        const { data: currentTransfer } = await supabase
            .from('petty_cash_transfers')
            .select('status, transfer_type, from_fund_id, to_responsible_name, to_responsible_id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!currentTransfer) {
            return new NextResponse(JSON.stringify({ error: 'Transferencia no encontrada' }), { status: 404 })
        }

        // Build update object
        const updateData: any = { ...validData, updated_at: new Date().toISOString() }

        // Handle status changes
        if (validData.status === 'RETURNED' && currentTransfer.status !== 'RETURNED') {
            updateData.returned_at = new Date().toISOString()
        }

        // If TOTAL transfer is DELIVERED, update fund responsible
        if (
            validData.status === 'DELIVERED' &&
            currentTransfer.status !== 'DELIVERED' &&
            currentTransfer.transfer_type === 'TOTAL'
        ) {
            await supabase
                .from('petty_cash_funds')
                .update({
                    responsible_name: currentTransfer.to_responsible_name,
                    responsible_id: currentTransfer.to_responsible_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentTransfer.from_fund_id)
        }

        // If transfer is RETURNED and was TOTAL, revert responsible
        if (
            validData.status === 'RETURNED' &&
            currentTransfer.transfer_type === 'TOTAL'
        ) {
            // Get original fund data to revert
            const { data: fund } = await supabase
                .from('petty_cash_funds')
                .select('responsible_name, responsible_id')
                .eq('id', currentTransfer.from_fund_id)
                .single()

            // This would need to store original responsible data in transfer
            // For now, just mark as returned without reverting
        }

        // Update transfer
        const { data: transfer, error: updateError } = await supabase
            .from('petty_cash_transfers')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('[PETTY_CASH_TRANSFER_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({ error: updateError.message }), { status: 500 })
        }

        let message = 'Transferencia actualizada exitosamente'
        if (validData.status === 'DELIVERED') {
            message = 'Transferencia entregada exitosamente'
            if (currentTransfer.transfer_type === 'TOTAL') {
                message += '. El responsable del fondo ha sido actualizado.'
            }
        } else if (validData.status === 'RETURNED') {
            message = 'Transferencia retornada exitosamente'
        }

        return NextResponse.json({ transfer: mapPettyCashTransfer(transfer), message })
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_TRANSFER_PATCH]', error)
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

        // Get transfer
        const { data: transfer } = await supabase
            .from('petty_cash_transfers')
            .select('id, status, transfer_type')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!transfer) {
            return new NextResponse(JSON.stringify({ error: 'Transferencia no encontrada' }), { status: 404 })
        }

        // Cannot delete if delivered or returned
        if (transfer.status === 'DELIVERED' || transfer.status === 'RETURNED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede eliminar',
                    details: 'Solo se pueden eliminar transferencias en estado PENDING o CANCELLED'
                }),
                { status: 400 }
            )
        }

        // Delete transfer
        const { error: deleteError } = await supabase
            .from('petty_cash_transfers')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('[PETTY_CASH_TRANSFER_DELETE]', deleteError)
            return new NextResponse(JSON.stringify({ error: deleteError.message }), { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Transferencia eliminada exitosamente' })
    } catch (error: any) {
        console.error('[PETTY_CASH_TRANSFER_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}
