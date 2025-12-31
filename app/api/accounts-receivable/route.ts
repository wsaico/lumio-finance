import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReceivableSchema = z.object({
    contactName: z.string().min(1, 'El nombre del contacto es requerido'),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    amount: z.number().positive('El monto debe ser positivo'),
    currencyCode: z.string().length(3),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    interestRate: z.number().min(0).max(100).optional(),
    accountId: z.string().uuid('Cuenta inválida'),
})

const updateBalanceSchema = z.object({
    paymentAmount: z.number().positive('El monto debe ser positivo'),
    accountId: z.string().uuid(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK', 'CARD', 'OTHER']).optional(),
    notes: z.string().optional(),
})

// ============================================
// MAPPERS
// ============================================

function mapAccountReceivable(row: any): any {
    if (!row) return null
    return {
        id: row.id,
        userId: row.user_id,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        originalAmount: Number(row.original_amount),
        outstandingBalance: Number(row.outstanding_balance),
        currencyCode: row.currency_code,
        status: row.status,
        loanDate: row.created_at,
        dueDate: row.due_date,
        notes: row.notes,
        interestRate: Number(row.interest_rate || 0),
        linkedTransactionId: row.linked_transaction_id,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        payments: (row.payments || []).map((p: any) => ({
            id: p.id,
            amount: Number(p.amount),
            currencyCode: p.currency_code,
            paymentDate: p.payment_date,
            notes: p.notes,
            paymentMethod: p.payment_method,
        })),
        totalPaid: Number(row.totalPaid || 0),
        percentPaid: Number(row.percentPaid || 0),
        daysOverdue: row.daysOverdue,
    }
}

// ============================================
// GET - List all accounts receivable
// ============================================

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // Filter by status

        let query = supabase
            .from('accounts_receivable')
            .select(`
                *,
                payments:loan_payments(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (status && status !== 'ALL') {
            query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) {
            console.error('[ACCOUNTS_RECEIVABLE_GET] Query Error:', error)
            throw error
        }


        // Enrich with computed fields
        const enriched = (data || []).map((receivable: any) => {
            const totalPaid = receivable.original_amount - receivable.outstanding_balance
            const percentPaid = (totalPaid / receivable.original_amount) * 100

            let daysOverdue = 0
            if (receivable.due_date && receivable.outstanding_balance > 0) {
                const dueDate = new Date(receivable.due_date)
                const today = new Date()
                const diffTime = today.getTime() - dueDate.getTime()
                daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (daysOverdue < 0) daysOverdue = 0
            }

            return {
                ...receivable,
                totalPaid,
                percentPaid,
                daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
            }
        })

        return NextResponse.json(enriched.map(mapAccountReceivable))
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_GET] Error:', error)
        return NextResponse.json(
            { error: 'Error al obtener cuentas por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// POST - Create new account receivable
// ============================================

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = createReceivableSchema.parse(body)

        // VALIDATION: Check balance before lending money
        const { data: accountData } = await supabase
            .from('accounts')
            .select('current_balance, name')
            .eq('id', validated.accountId)
            .single()

        if (!accountData) {
            return NextResponse.json(
                { error: 'Cuenta no encontrada' },
                { status: 404 }
            )
        }

        const currentBalance = Number(accountData.current_balance)
        const requestedAmount = validated.amount

        if (currentBalance < requestedAmount) {
            const shortage = requestedAmount - currentBalance
            return NextResponse.json(
                {
                    error: 'Saldo insuficiente',
                    details: `La cuenta "${accountData.name}" tiene un saldo de ${currentBalance.toFixed(2)} pero intentas prestar ${requestedAmount.toFixed(2)}. Faltan ${shortage.toFixed(2)} ${validated.currencyCode}`,
                    balanceInfo: {
                        currentBalance,
                        requestedAmount,
                        shortage
                    }
                },
                { status: 400 }
            )
        }

        // 1. Create cash outflow transaction (money leaving your account)
        const transactionPayload = {
            user_id: user.id,
            transaction_type: 'EXPENSE',
            account_id: validated.accountId,
            amount: validated.amount,
            currency_code: validated.currencyCode,
            transaction_date: new Date().toISOString(),
            description: `Préstamo otorgado a ${validated.contactName}`,
            metadata: {
                isLoanMovement: true,
                hideFromList: true, // Hide from normal transaction list
                loanType: 'LENT',
            },
        }

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert(transactionPayload)
            .select()
            .single()

        if (txError) throw txError

        // 1.1 Update Account Balance (Financial Outflow)
        const newBalance = currentBalance - validated.amount
        await supabase
            .from('accounts')
            .update({ current_balance: newBalance })
            .eq('id', validated.accountId)

        // 2. Create account receivable record
        const receivablePayload = {
            user_id: user.id,
            contact_name: validated.contactName,
            contact_email: validated.contactEmail || null,
            contact_phone: validated.contactPhone || null,
            original_amount: validated.amount,
            outstanding_balance: validated.amount, // Initially full amount
            currency_code: validated.currencyCode,
            due_date: validated.dueDate || null,
            notes: validated.notes || null,
            interest_rate: validated.interestRate || 0,
            linked_transaction_id: transaction.id,
            metadata: {},
        }


        const { data: receivable, error: recError } = await supabase
            .from('accounts_receivable')
            .insert(receivablePayload)
            .select()
            .single()

        if (recError) {
            console.error('[ACCOUNTS_RECEIVABLE_POST] Insert Error:', recError)
            throw recError
        }


        return NextResponse.json(mapAccountReceivable(receivable), { status: 201 })
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_POST] Error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Error al crear cuenta por cobrar', details: error.message },
            { status: 500 }
        )
    }
}

// ============================================
// PATCH - Update account receivable (partial payment)
// ============================================

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
        }

        // If it's a payment, handle specially
        if (updateData.paymentAmount) {
            const validated = updateBalanceSchema.parse(updateData)

            // Get current receivable
            const { data: receivable, error: fetchError } = await supabase
                .from('accounts_receivable')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (fetchError || !receivable) {
                return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
            }

            if (validated.paymentAmount > receivable.outstanding_balance) {
                return NextResponse.json(
                    { error: 'El monto del pago excede el saldo pendiente' },
                    { status: 400 }
                )
            }

            // 1. Create income transaction (money coming back)
            const incomePayload = {
                user_id: user.id,
                transaction_type: 'INCOME',
                account_id: validated.accountId,
                amount: validated.paymentAmount,
                currency_code: receivable.currency_code,
                transaction_date: new Date().toISOString(),
                description: `Cobro de préstamo: ${receivable.contact_name}`,
                metadata: {
                    isLoanCollection: true,
                    accountReceivableId: id,
                },
            }

            const { data: transaction, error: txError } = await supabase
                .from('transactions')
                .insert(incomePayload)
                .select()
                .single()

            if (txError) throw txError

            // 1.1 Update Account Balance (Financial Inflow)
            const { data: account } = await supabase
                .from('accounts')
                .select('current_balance')
                .eq('id', validated.accountId)
                .single()

            if (account) {
                const updatedBalance = Number(account.current_balance) + validated.paymentAmount
                await supabase
                    .from('accounts')
                    .update({ current_balance: updatedBalance })
                    .eq('id', validated.accountId)
            }

            // 2. Record payment
            const paymentPayload = {
                user_id: user.id,
                account_receivable_id: id,
                amount: validated.paymentAmount,
                currency_code: receivable.currency_code,
                transaction_id: transaction.id,
                payment_method: validated.paymentMethod || 'TRANSFER',
                notes: validated.notes || null,
            }

            const { error: paymentError } = await supabase
                .from('loan_payments')
                .insert(paymentPayload)

            if (paymentError) throw paymentError

            // 3. Update outstanding balance
            const newBalance = receivable.outstanding_balance - validated.paymentAmount

            const { data: updated, error: updateError } = await supabase
                .from('accounts_receivable')
                .update({ outstanding_balance: newBalance })
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            return NextResponse.json(mapAccountReceivable(updated))
        }

        // Regular update (notes, contact info, etc.)
        const { data, error } = await supabase
            .from('accounts_receivable')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(mapAccountReceivable(data))
    } catch (error: any) {
        console.error('[ACCOUNTS_RECEIVABLE_PATCH] Error:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Error al actualizar cuenta', details: error.message },
            { status: 500 }
        )
    }
}
