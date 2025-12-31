import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

const accountUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['CASH', 'BANK', 'DIGITAL', 'CREDIT_CARD', 'INVESTMENT', 'PETTY_CASH']).optional(),
    currency: z.string().length(3).optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    isActive: z.boolean().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    customBankName: z.string().optional(),
    excludeFromStats: z.boolean().optional(),
    archived: z.boolean().optional(),
})


export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    try {
        const { id } = await params
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const validData = accountUpdateSchema.parse(body)

        // Build update object with snake_case for Supabase
        const updateData: any = {}
        if (validData.name !== undefined) updateData.name = validData.name
        if (validData.type !== undefined) updateData.account_type = validData.type
        if (validData.currency !== undefined) updateData.currency_code = validData.currency
        if (validData.color !== undefined) updateData.color = validData.color
        if (validData.icon !== undefined) updateData.icon = validData.icon
        if (validData.isActive !== undefined) updateData.is_active = validData.isActive
        if (validData.bankName !== undefined) updateData.bank_name = validData.bankName
        if (validData.accountNumber !== undefined) updateData.account_number = validData.accountNumber
        if (validData.customBankName !== undefined) updateData.custom_bank_name = validData.customBankName
        if (validData.excludeFromStats !== undefined) updateData.exclude_from_stats = validData.excludeFromStats
        if (validData.archived !== undefined) updateData.archived = validData.archived

        // Update
        const { data: account, error } = await supabase
            .from('accounts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[ACCOUNT_PATCH_SUPABASE]', error)
            // Handle 404 implicitly if updated row count is 0? 
            // Supabase error PGRST116 usually means data is empty/row not found for single().
            if (error.code === 'PGRST116') {
                return new NextResponse('Not Found', { status: 404 })
            }
            return new NextResponse('Database Error', { status: 500 })
        }

        // Map back to camelCase for frontend?
        // The original code returned the raw Prisma object (camelCase).
        // Frontend expects camelCase.
        const mappedAccount = {
            id: account.id,
            userId: account.user_id,
            name: account.name,
            accountType: account.account_type,
            currencyCode: account.currency_code,
            currentBalance: account.current_balance,
            initialBalance: account.initial_balance,
            bankName: account.bank_name,
            accountNumber: account.account_number,
            customBankName: account.custom_bank_name,
            excludeFromStats: account.exclude_from_stats || false,
            archived: account.archived || false,
            icon: account.icon,
            color: account.color,
            isActive: account.is_active,
            includeInTotal: account.include_in_total,
            sortOrder: account.sort_order,
            createdAt: account.created_at,
            updatedAt: account.updated_at
        }

        return NextResponse.json(mappedAccount)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid data', { status: 400 })
        }
        console.error('[ACCOUNT_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { id: accountId } = await params

        // Check if account exists and belongs to user
        const { data: account, error: accountError } = await supabase
            .from('accounts')
            .select('id, name, user_id')
            .eq('id', accountId)
            .single()

        if (accountError) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Account query failed',
                    message: `Error: ${accountError.message}`,
                    details: accountError
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        if (!account) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Account not found',
                    message: `No se encontró la cuenta con ID: ${accountId}`
                }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Check if account belongs to user
        if (account.user_id !== user.id) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Access denied',
                    message: `Esta cuenta pertenece a otro usuario.`,
                    debug: {
                        accountUserId: account.user_id,
                        authUserId: user.id,
                        match: account.user_id === user.id
                    }
                }),
                {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Check if account has any transactions
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('id')
            .eq('account_id', accountId)
            .limit(1)

        if (txError) {
            console.error('[ACCOUNT_DELETE_CHECK_TX]', txError)
            return new NextResponse('Error checking transactions', { status: 500 })
        }

        if (transactions && transactions.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Cannot delete account with existing transactions',
                    message: `La cuenta "${account.name}" tiene transacciones registradas. Elimina las transacciones primero.`
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Check if account is used in transfers (as destination)
        const { data: transfers, error: transferError } = await supabase
            .from('transactions')
            .select('id')
            .eq('transfer_to_account_id', accountId)
            .limit(1)

        if (transferError) {
            console.error('[ACCOUNT_DELETE_CHECK_TRANSFERS]', transferError)
            return new NextResponse('Error checking transfers', { status: 500 })
        }

        if (transfers && transfers.length > 0) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Cannot delete account with existing transfers',
                    message: `La cuenta "${account.name}" es destino de transferencias. Elimina las transferencias primero.`
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }

        // Safe to delete
        const { error: deleteError } = await supabase
            .from('accounts')
            .delete()
            .eq('id', accountId)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('[ACCOUNT_DELETE]', deleteError)
            return new NextResponse('Error deleting account', { status: 500 })
        }

        return new NextResponse(null, { status: 204 })

    } catch (error: any) {
        console.error('[ACCOUNT_DELETE]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
