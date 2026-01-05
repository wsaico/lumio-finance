export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapPettyCashExpense } from '@/lib/mappers'
import { TransactionService } from '@/lib/services/transaction-service'
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants/default-categories'

const expenseSchema = z.object({
    fundId: z.string().uuid(),
    expenseDate: z.string(),
    amount: z.number().positive('Monto debe ser positivo'),
    categoryId: z.string().optional(),
    subcategoryId: z.string().uuid().optional(),
    description: z.string().min(1, 'Descripción requerida'),
    vendor: z.string().optional(),
    receiptNumber: z.string().optional(),
    receiptType: z.enum(['BOLETA', 'FACTURA', 'RECIBO', 'TICKET', 'OTRO']),
    taxableAmount: z.number().optional(),
    taxAmount: z.number().optional(),
    attachmentUrl: z.string().url().optional(),
    justification: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
})

const updateExpenseSchema = z.object({
    amount: z.number().positive().optional(),
    description: z.string().min(1).optional(),
    vendor: z.string().optional(),
    categoryId: z.string().optional(),
    subcategoryId: z.string().uuid().optional(),
    receiptNumber: z.string().optional(),
    receiptType: z.enum(['BOLETA', 'FACTURA', 'RECIBO', 'TICKET', 'OTRO']).optional(),
    taxableAmount: z.number().optional(),
    taxAmount: z.number().optional(),
    attachmentUrl: z.string().url().optional(),
    justification: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    approvedBy: z.string().optional(),
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
        const settlementId = searchParams.get('settlementId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        let query = supabase
            .from('petty_cash_expenses')
            .select(`
                *,
                fund:petty_cash_funds(id, fund_code, fund_name),
                settlement:petty_cash_settlements(id, settlement_code, status),
                category:expense_categories(id, name, color),
                subcategory:subcategories(id, name)
            `)
            .eq('user_id', user.id)
            .order('expense_date', { ascending: false })

        if (fundId) {
            query = query.eq('fund_id', fundId)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (settlementId) {
            if (settlementId === 'null') {
                query = query.is('settlement_id', null)
            } else {
                query = query.eq('settlement_id', settlementId)
            }
        }

        if (startDate) {
            query = query.gte('expense_date', startDate)
        }

        if (endDate) {
            query = query.lte('expense_date', endDate)
        }

        const { data: expenses, error } = await query

        if (error) {
            console.error('[PETTY_CASH_EXPENSES_GET]', error)
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
        }

        return NextResponse.json(expenses?.map(mapPettyCashExpense) || [])
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_EXPENSES_GET]', error)
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
        const validData = expenseSchema.parse(body)

        // Validate fund exists, belongs to user, and is active
        const { data: fund, error: fundError } = await supabase
            .from('petty_cash_funds')
            .select('id, current_balance, status, fund_name, assigned_amount')
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

        // Validate sufficient balance
        if (Number(fund.current_balance) < validData.amount) {
            const shortage = validData.amount - Number(fund.current_balance)
            return new NextResponse(
                JSON.stringify({
                    error: 'Saldo insuficiente en el fondo',
                    details: `El fondo tiene S/ ${fund.current_balance} pero intentas gastar S/ ${validData.amount}. Faltan S/ ${shortage.toFixed(2)}`,
                    balanceInfo: {
                        currentBalance: Number(fund.current_balance),
                        requestedAmount: validData.amount,
                        shortage
                    }
                }),
                { status: 400 }
            )
        }

        // Resolve category if provided (handles system defaults)
        const resolvedCategoryId = await TransactionService.resolveCategory(
            supabase,
            'expense_categories',
            validData.categoryId,
            user.id,
            DEFAULT_EXPENSE_CATEGORIES
        )

        // Create expense (expense_code auto-generated by trigger, balance updated by trigger)
        const { data: expense, error: expenseError } = await supabase
            .from('petty_cash_expenses')
            .insert({
                user_id: user.id,
                fund_id: validData.fundId,
                expense_date: validData.expenseDate,
                amount: validData.amount,
                category_id: resolvedCategoryId,
                subcategory_id: validData.subcategoryId,
                description: validData.description,
                vendor: validData.vendor,
                receipt_number: validData.receiptNumber,
                receipt_type: validData.receiptType,
                taxable_amount: validData.taxableAmount,
                tax_amount: validData.taxAmount,
                attachment_url: validData.attachmentUrl,
                justification: validData.justification,
                status: validData.status || 'PENDING',
                approved_at: validData.status === 'APPROVED' ? new Date().toISOString() : null
            })
            .select()
            .single()

        if (expenseError) {
            console.error('[PETTY_CASH_EXPENSE_CREATE]', expenseError)
            return new NextResponse(JSON.stringify({ error: expenseError.message }), { status: 500 })
        }

        // Get updated fund balance
        const { data: updatedFund } = await supabase
            .from('petty_cash_funds')
            .select('current_balance, assigned_amount, settlement_threshold')
            .eq('id', validData.fundId)
            .single()

        // Check if threshold reached
        let thresholdReached = false
        if (updatedFund) {
            const percentageSpent = ((Number(updatedFund.assigned_amount) - Number(updatedFund.current_balance)) / Number(updatedFund.assigned_amount)) * 100
            thresholdReached = percentageSpent >= Number(updatedFund.settlement_threshold)
        }

        return NextResponse.json({
            expense: mapPettyCashExpense(expense),
            thresholdReached,
            message: thresholdReached ? 'Gasto registrado. Se alcanzó el umbral de liquidación.' : 'Gasto registrado exitosamente'
        })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_EXPENSE_POST]', error)
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

        const validData = updateExpenseSchema.parse(updates)

        // Get current expense
        const { data: currentExpense } = await supabase
            .from('petty_cash_expenses')
            .select('settlement_id, status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!currentExpense) {
            return new NextResponse(JSON.stringify({ error: 'Gasto no encontrado' }), { status: 404 })
        }

        // Cannot edit if already settled
        if (currentExpense.settlement_id && currentExpense.status === 'SETTLED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede modificar',
                    details: 'Este gasto ya fue incluido en una liquidación'
                }),
                { status: 400 }
            )
        }

        // Build update object
        const updateData: any = { ...validData, updated_at: new Date().toISOString() }

        // If approving, set approved_at
        if (validData.status === 'APPROVED') {
            updateData.approved_at = new Date().toISOString()
        }

        // Update expense
        const { data: expense, error: updateError } = await supabase
            .from('petty_cash_expenses')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('[PETTY_CASH_EXPENSE_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({ error: updateError.message }), { status: 500 })
        }

        return NextResponse.json(mapPettyCashExpense(expense))
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_EXPENSE_PATCH]', error)
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

        // Get expense
        const { data: expense } = await supabase
            .from('petty_cash_expenses')
            .select('settlement_id, status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!expense) {
            return new NextResponse(JSON.stringify({ error: 'Gasto no encontrado' }), { status: 404 })
        }

        // Cannot delete if settled
        if (expense.settlement_id && expense.status === 'SETTLED') {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede eliminar',
                    details: 'Este gasto ya fue incluido en una liquidación'
                }),
                { status: 400 }
            )
        }

        // Delete expense (trigger will restore fund balance)
        const { error: deleteError } = await supabase
            .from('petty_cash_expenses')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('[PETTY_CASH_EXPENSE_DELETE]', deleteError)
            return new NextResponse(JSON.stringify({ error: deleteError.message }), { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Gasto eliminado exitosamente' })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_EXPENSE_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}
