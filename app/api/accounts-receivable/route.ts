export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'
import { mapLoanAccountRow } from '@/lib/loans'
import {
    createLoanAccount,
    deleteLoanAccount,
    listLoanAccounts,
    registerLoanPayment,
} from '@/lib/server/loans-service'
import { getUserEntitlementsServer } from '@/lib/server/entitlements'

const createReceivableSchema = z.object({
    contactName: z.string().trim().min(1, 'El nombre del contacto es requerido'),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    amount: z.number().positive('El monto debe ser positivo'),
    currencyCode: z.string().length(3),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    interestRate: z.number().min(0).max(100).optional(),
    accountId: z.string().uuid('Cuenta inválida'),
    interestType: z.enum(['SIMPLE', 'COMPOUND']).default('SIMPLE'),
    paymentFrequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'SINGLE']).default('MONTHLY'),
    totalInstallments: z.number().int().positive().default(1),
})

const paymentSchema = z.object({
    paymentAmount: z.number().positive('El monto debe ser positivo'),
    principalAmount: z.number().min(0).optional(),
    interestAmount: z.number().min(0).optional(),
    accountId: z.string().uuid('Cuenta inválida'),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER']).optional(),
    notes: z.string().optional(),
})

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const data = await listLoanAccounts(supabase, user.id, 'RECEIVABLE', status)
        return NextResponse.json(data)
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        console.error('[ACCOUNTS_RECEIVABLE_GET] Error:', error)
        return NextResponse.json(
            { error: 'Error al obtener cuentas por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { entitlements } = await getUserEntitlementsServer(supabase, user)
        if (!entitlements.canAccessPremiumWrite) {
            return NextResponse.json(
                { error: 'Cuentas por cobrar requiere Plan Premium.', code: 'PREMIUM_REQUIRED' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const validated = createReceivableSchema.parse(body)
        const result = await createLoanAccount(supabase, user.id, 'RECEIVABLE', validated)

        if ('error' in result && result.error) {
            return NextResponse.json(result.error.body, { status: result.error.status })
        }

        return NextResponse.json(result.data, { status: 201 })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
        }
        console.error('[ACCOUNTS_RECEIVABLE_POST] Error:', error)
        return NextResponse.json(
            { error: 'Error al crear cuenta por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { entitlements } = await getUserEntitlementsServer(supabase, user)
        if (!entitlements.canAccessPremiumWrite) {
            return NextResponse.json(
                { error: 'Cuentas por cobrar requiere Plan Premium.', code: 'PREMIUM_REQUIRED' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        if (updateData.paymentAmount !== undefined) {
            const validated = paymentSchema.parse(updateData)
            const result = await registerLoanPayment(supabase, user.id, 'RECEIVABLE', id, validated)
            if ('error' in result && result.error) {
                return NextResponse.json(result.error.body, { status: result.error.status })
            }
            return NextResponse.json(result.data)
        }

        // Whitelisted metadata update
        const safeUpdates: Record<string, any> = {}
        if (typeof updateData.contactName === 'string' && updateData.contactName.trim()) {
            safeUpdates.contact_name = updateData.contactName.trim()
        }
        if (updateData.contactEmail !== undefined) safeUpdates.contact_email = updateData.contactEmail || null
        if (updateData.contactPhone !== undefined) safeUpdates.contact_phone = updateData.contactPhone || null
        if (updateData.notes !== undefined) safeUpdates.notes = updateData.notes || null
        if (updateData.dueDate !== undefined) safeUpdates.due_date = updateData.dueDate || null

        if (Object.keys(safeUpdates).length === 0) {
            return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
        }

        safeUpdates.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('accounts_receivable')
            .update(safeUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(mapLoanAccountRow(data, 'RECEIVABLE'))
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
        }
        console.error('[ACCOUNTS_RECEIVABLE_PATCH] Error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar cuenta por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        const result = await deleteLoanAccount(supabase, user.id, 'RECEIVABLE', id)
        if ('error' in result && result.error) {
            return NextResponse.json(result.error.body, { status: result.error.status })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        console.error('[ACCOUNTS_RECEIVABLE_DELETE] Error:', error)
        return NextResponse.json(
            { error: 'Error al eliminar el préstamo', details: error.message },
            { status: 500 }
        )
    }
}
