import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapPettyCashSettlement } from '@/lib/mappers'

const settlementSchema = z.object({
    settlementCode: z.string().min(8, 'Código debe tener al menos 8 caracteres'),
    fundId: z.string().uuid(),
    settlementDate: z.string(),
    expenseIds: z.array(z.string().uuid()).min(1, 'Debe incluir al menos un gasto'),
    responsibleName: z.string().min(1, 'Responsable requerido'),
    receivedBy: z.string().optional(),
    notes: z.string().optional(),
})

const updateSettlementSchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ACCOUNTED']).optional(),
    approvedBy: z.string().optional(),
    accountedBy: z.string().optional(),
    accountingCode: z.string().optional(),
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
            .from('petty_cash_settlements')
            .select(`
                *,
                fund:petty_cash_funds(id, fund_code, fund_name, responsible_name),
                expenses:petty_cash_expenses(
                    id,
                    expense_code,
                    expense_date,
                    amount,
                    description,
                    vendor,
                    receipt_number,
                    receipt_type,
                    category:expense_categories(name, color)
                ),
                replenishment:petty_cash_replenishments(
                    id,
                    replenishment_code,
                    amount,
                    status,
                    payment_method
                )
            `)
            .eq('user_id', user.id)
            .order('settlement_date', { ascending: false })

        if (fundId) {
            query = query.eq('fund_id', fundId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (startDate) {
            query = query.gte('settlement_date', startDate)
        }

        if (endDate) {
            query = query.lte('settlement_date', endDate)
        }

        const { data: settlements, error } = await query

        if (error) {
            console.error('[PETTY_CASH_SETTLEMENTS_GET]', error)
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
        }

        return NextResponse.json(settlements?.map(mapPettyCashSettlement) || [])
    } catch (error: any) {
        console.error('[PETTY_CASH_SETTLEMENTS_GET]', error)
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
        const validData = settlementSchema.parse(body)

        // Validate fund exists and is active
        const { data: fund, error: fundError } = await supabase
            .from('petty_cash_funds')
            .select('id, fund_name, status, responsible_name')
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

        // Validate all expenses exist, belong to fund, and are not already settled
        const { data: expenses, error: expensesError } = await supabase
            .from('petty_cash_expenses')
            .select('id, amount, status, settlement_id, fund_id')
            .in('id', validData.expenseIds)
            .eq('user_id', user.id)

        if (expensesError || !expenses || expenses.length !== validData.expenseIds.length) {
            return new NextResponse(
                JSON.stringify({ error: 'Uno o más gastos no encontrados' }),
                { status: 404 }
            )
        }

        // Validate all expenses belong to the fund
        const invalidFundExpenses = expenses.filter(e => e.fund_id !== validData.fundId)
        if (invalidFundExpenses.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Gastos no pertenecen al fondo',
                    details: 'Todos los gastos deben pertenecer al mismo fondo'
                }),
                { status: 400 }
            )
        }

        // Validate none are already settled
        const alreadySettled = expenses.filter(e => e.settlement_id !== null)
        if (alreadySettled.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Gastos ya liquidados',
                    details: `${alreadySettled.length} gasto(s) ya están incluidos en otra liquidación`
                }),
                { status: 400 }
            )
        }

        // Calculate total amount
        const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

        // Check if settlement code already exists
        const { data: existingCode } = await supabase
            .from('petty_cash_settlements')
            .select('id')
            .eq('settlement_code', validData.settlementCode)
            .eq('user_id', user.id)
            .single()

        if (existingCode) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Código de liquidación ya existe',
                    details: `El código "${validData.settlementCode}" ya está en uso. Usa un código diferente.`
                }),
                { status: 400 }
            )
        }

        // Create settlement with manual settlement code
        const { data: settlement, error: settlementError } = await supabase
            .from('petty_cash_settlements')
            .insert({
                user_id: user.id,
                fund_id: validData.fundId,
                settlement_code: validData.settlementCode, // Manual code
                settlement_date: validData.settlementDate,
                total_amount: totalAmount,
                expense_count: expenses.length,
                responsible_name: validData.responsibleName,
                received_by: validData.receivedBy,
                notes: validData.notes,
                status: 'ACCOUNTED', // Auto-approved for Solopreneur Mode
                approved_at: new Date().toISOString(),
                accounted_at: new Date().toISOString(),
                approved_by: user.id, // User approves their own settlement
                accounted_by: user.id
            })
            .select()
            .single()

        if (settlementError) {
            console.error('[PETTY_CASH_SETTLEMENT_CREATE]', settlementError)
            return new NextResponse(JSON.stringify({ error: settlementError.message }), { status: 500 })
        }

        // Link expenses to settlement
        const { error: linkError } = await supabase
            .from('petty_cash_expenses')
            .update({
                settlement_id: settlement.id,
                status: 'SETTLED',
                updated_at: new Date().toISOString()
            })
            .in('id', validData.expenseIds)

        if (linkError) {
            console.error('[PETTY_CASH_SETTLEMENT_LINK_EXPENSES]', linkError)
            // Rollback settlement
            await supabase.from('petty_cash_settlements').delete().eq('id', settlement.id)
            return new NextResponse(JSON.stringify({ error: 'Error al vincular gastos' }), { status: 500 })
        }

        return NextResponse.json(mapPettyCashSettlement(settlement))
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_SETTLEMENT_POST]', error)
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

        const validData = updateSettlementSchema.parse(updates)

        // Get current settlement
        const { data: currentSettlement } = await supabase
            .from('petty_cash_settlements')
            .select('status, fund_id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!currentSettlement) {
            return new NextResponse(JSON.stringify({ error: 'Liquidación no encontrada' }), { status: 404 })
        }

        // Build update object
        const updateData: any = { ...validData, updated_at: new Date().toISOString() }

        // Set timestamps based on status change
        if (validData.status === 'APPROVED' && currentSettlement.status !== 'APPROVED') {
            updateData.approved_at = new Date().toISOString()
        }

        if (validData.status === 'ACCOUNTED' && currentSettlement.status !== 'ACCOUNTED') {
            updateData.accounted_at = new Date().toISOString()
        }

        // Update settlement
        const { data: settlement, error: updateError } = await supabase
            .from('petty_cash_settlements')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('[PETTY_CASH_SETTLEMENT_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({ error: updateError.message }), { status: 500 })
        }

        return NextResponse.json(mapPettyCashSettlement(settlement))
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_SETTLEMENT_PATCH]', error)
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

        // Get settlement
        const { data: settlement } = await supabase
            .from('petty_cash_settlements')
            .select(`
                id,
                status,
                replenishment:petty_cash_replenishments(id, status)
            `)
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!settlement) {
            return new NextResponse(JSON.stringify({ error: 'Liquidación no encontrada' }), { status: 404 })
        }

        // Cannot delete if accounted or has replenishment
        if (settlement.status === 'ACCOUNTED' || settlement.status === 'APPROVED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede eliminar',
                    details: 'Solo se pueden eliminar liquidaciones en estado PENDING o REJECTED'
                }),
                { status: 400 }
            )
        }

        if (settlement.replenishment && settlement.replenishment.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede eliminar',
                    details: 'Esta liquidación ya tiene una reposición asociada'
                }),
                { status: 400 }
            )
        }

        // Unlink expenses first
        await supabase
            .from('petty_cash_expenses')
            .update({
                settlement_id: null,
                status: 'APPROVED',
                updated_at: new Date().toISOString()
            })
            .eq('settlement_id', id)

        // Delete settlement
        const { error: deleteError } = await supabase
            .from('petty_cash_settlements')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('[PETTY_CASH_SETTLEMENT_DELETE]', deleteError)
            return new NextResponse(JSON.stringify({ error: deleteError.message }), { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Liquidación eliminada exitosamente' })
    } catch (error: any) {
        console.error('[PETTY_CASH_SETTLEMENT_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}
