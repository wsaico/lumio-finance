export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapPettyCashFund } from '@/lib/mappers'

const fundSchema = z.object({
    fundName: z.string().min(1, 'Nombre requerido'),
    fundCode: z.string().min(1, 'Código de liquidación requerido'),
    assignedAmount: z.number().positive('Monto debe ser positivo'),
    currencyCode: z.string().length(3).default('PEN'),
    responsibleName: z.string().min(1, 'Responsable requerido'),
    responsibleId: z.string().optional(),
    department: z.string().optional(),
    description: z.string().optional(),
    settlementThreshold: z.number().min(0).max(100).default(70),
})

const updateFundSchema = z.object({
    fundName: z.string().min(1).optional(),
    fundCode: z.string().min(1).optional(),
    responsibleName: z.string().min(1).optional(),
    responsibleId: z.string().optional(),
    department: z.string().optional(),
    description: z.string().optional(),
    settlementThreshold: z.number().min(0).max(100).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
})

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const department = searchParams.get('department')

        let query = supabase
            .from('petty_cash_funds')
            .select(`
                *,
                account:accounts(id, name, currency_code),
                expenses:petty_cash_expenses(count),
                settlements:petty_cash_settlements(count),
                audits:petty_cash_audits(count)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('status', status)
        }

        if (department) {
            query = query.eq('department', department)
        }

        const { data: funds, error } = await query

        if (error) {
            console.error('[PETTY_CASH_FUNDS_GET]', error)
            return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 })
        }

        return NextResponse.json(funds?.map(mapPettyCashFund) || [])
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_FUNDS_GET]', error)
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
        const validData = fundSchema.parse(body)

        // Create PETTY_CASH account automatically
        const accountName = `Caja Chica - ${validData.fundCode}`
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .insert({
                user_id: user.id,
                name: accountName,
                account_type: 'PETTY_CASH',
                currency_code: validData.currencyCode,
                initial_balance: validData.assignedAmount,
                current_balance: validData.assignedAmount,
                is_active: true,
                include_in_total: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select('id')
            .single()

        if (accountError || !account) {
            console.error('[PETTY_CASH_ACCOUNT_CREATE]', accountError)
            return new NextResponse(
                JSON.stringify({
                    error: 'Error al crear cuenta de caja chica',
                    details: accountError?.message
                }),
                { status: 500 }
            )
        }

        // Create fund linked to the new account
        const { data: fund, error: fundError } = await supabase
            .from('petty_cash_funds')
            .insert({
                user_id: user.id,
                account_id: account.id,
                fund_name: validData.fundName,
                fund_code: validData.fundCode,
                assigned_amount: validData.assignedAmount,
                current_balance: validData.assignedAmount,
                currency_code: validData.currencyCode,
                responsible_name: validData.responsibleName,
                responsible_id: validData.responsibleId,
                department: validData.department,
                description: validData.description,
                settlement_threshold: validData.settlementThreshold,
                status: 'ACTIVE'
            })
            .select()
            .single()

        if (fundError) {
            console.error('[PETTY_CASH_FUND_CREATE]', fundError)
            return new NextResponse(JSON.stringify({ error: fundError.message }), { status: 500 })
        }

        return NextResponse.json(mapPettyCashFund(fund))
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_FUND_POST]', error)
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

        const validData = updateFundSchema.parse(updates)

        // Update fund
        const { data: fund, error: updateError } = await supabase
            .from('petty_cash_funds')
            .update({
                fund_name: validData.fundName,
                fund_code: validData.fundCode,
                responsible_name: validData.responsibleName,
                responsible_id: validData.responsibleId,
                department: validData.department,
                description: validData.description,
                settlement_threshold: validData.settlementThreshold,
                status: validData.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (updateError) {
            console.error('[PETTY_CASH_FUND_UPDATE]', updateError)
            return new NextResponse(JSON.stringify({ error: updateError.message }), { status: 500 })
        }

        return NextResponse.json(mapPettyCashFund(fund))
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify({ error: 'Datos inválidos', details: error.issues }), { status: 400 })
        }
        console.error('[PETTY_CASH_FUND_PATCH]', error)
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

        // Check if fund has active expenses or settlements
        const { data: fund } = await supabase
            .from('petty_cash_funds')
            .select(`
                id,
                status,
                current_balance,
                assigned_amount,
                expenses:petty_cash_expenses(id, status),
                settlements:petty_cash_settlements(id, status)
            `)
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (!fund) {
            return new NextResponse(JSON.stringify({ error: 'Fondo no encontrado' }), { status: 404 })
        }

        const hasActiveExpenses = fund.expenses?.some((e: any) => e.status !== 'SETTLED')
        const hasPendingSettlements = fund.settlements?.some((s: any) => s.status === 'PENDING')

        if (hasActiveExpenses || hasPendingSettlements) {
            return new NextResponse(
                JSON.stringify({
                    error: 'No se puede cerrar el fondo',
                    details: 'Existen gastos activos o liquidaciones pendientes. Completa todos los procesos primero.'
                }),
                { status: 400 }
            )
        }

        // Close fund (soft delete)
        const { error: closeError } = await supabase
            .from('petty_cash_funds')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id)

        if (closeError) {
            console.error('[PETTY_CASH_FUND_DELETE]', closeError)
            return new NextResponse(JSON.stringify({ error: closeError.message }), { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Fondo cerrado exitosamente' })
    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[PETTY_CASH_FUND_DELETE]', error)
        return new NextResponse(JSON.stringify({ error: 'Internal Error', details: error.message }), { status: 500 })
    }
}
