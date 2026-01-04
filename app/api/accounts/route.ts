
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'
import { mapAccount } from '@/lib/mappers'

const accountSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    type: z.enum(['CASH', 'BANK', 'DIGITAL', 'CREDIT_CARD', 'INVESTMENT', 'PETTY_CASH']),
    currency: z.string().length(3),
    balance: z.number().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    fixedFundAmount: z.number().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    customBankName: z.string().optional(),
    excludeFromStats: z.boolean().optional(),
    archived: z.boolean().optional(),
    // Credit Card fields
    lastFourDigits: z.string().optional(),
    creditLimit: z.number().optional(),
    usedBalance: z.number().optional(),
    closingDay: z.number().optional(),
    paymentDueDay: z.number().optional(),
    cardNetwork: z.string().optional(),
    interestRateAnnual: z.number().optional(),
    minPaymentPercent: z.number().optional(),
})

// Mappers moved to @/lib/mappers

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { data: accounts, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .neq('account_type', 'PETTY_CASH') // Exclude petty cash accounts
            .order('sort_order', { ascending: true })

        if (error) {
            console.error('[ACCOUNTS_GET_SUPABASE]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        const mappedAccounts = accounts?.map(mapAccount) || []

        return NextResponse.json(mappedAccounts)
    } catch (error) {
        console.error('[ACCOUNTS_GET]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const parsed = accountSchema.parse(body)

        // Prevent creation of PETTY_CASH accounts through this endpoint
        if (parsed.type === 'PETTY_CASH') {
            return new NextResponse(
                JSON.stringify({
                    error: 'Las cuentas de caja chica deben crearse desde el módulo de Caja Chica'
                }),
                { status: 400 }
            )
        }

        const insertData: any = {
            user_id: user.id,
            name: parsed.name,
            account_type: parsed.type,
            currency_code: parsed.currency,
            initial_balance: parsed.balance || 0,
            current_balance: parsed.balance || 0,
            color: parsed.color || '#0ea5e9',
            icon: parsed.icon || 'wallet',
            fixed_fund_amount: parsed.fixedFundAmount,
            bank_name: parsed.bankName,
            account_number: parsed.accountNumber,
            custom_bank_name: parsed.customBankName,
            exclude_from_stats: parsed.excludeFromStats || false,
            archived: parsed.archived || false,
            is_active: true
        }

        // Add credit card fields if type is CREDIT_CARD
        if (parsed.type === 'CREDIT_CARD') {
            insertData.last_four_digits = parsed.lastFourDigits
            insertData.credit_limit = parsed.creditLimit || 0
            insertData.used_balance = parsed.usedBalance || 0
            insertData.closing_day = parsed.closingDay
            insertData.payment_due_day = parsed.paymentDueDay
            insertData.card_network = parsed.cardNetwork
            insertData.interest_rate_annual = parsed.interestRateAnnual
            insertData.min_payment_percent = parsed.minPaymentPercent || 5
            insertData.current_balance = 0 // Credit cards don't have initial balance
        }

        const { data: account, error } = await supabase
            .from('accounts')
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('[ACCOUNTS_POST_SUPABASE]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        return NextResponse.json(mapAccount(account))
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid data', { status: 400 })
        }
        console.error('[ACCOUNTS_POST]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
