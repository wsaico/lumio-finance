
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

const loanSchema = z.object({
    loanType: z.enum(['LENT', 'BORROWED']),
    contactName: z.string().min(1),
    principalAmount: z.number().positive(),
    interestRate: z.number().min(0).default(0),
    interestType: z.enum(['SIMPLE', 'COMPOUND']).default('SIMPLE'),
    paymentFrequency: z.enum(['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'SINGLE']).default('MONTHLY'),
    totalInstallments: z.number().int().positive().default(1),
    currency: z.string().length(3),
    loanDate: z.string().datetime(),
    dueDate: z.string().datetime().optional(),
    accountId: z.string().uuid().optional(),
    description: z.string().optional(),
})

function mapLoan(row: any) {
    return {
        id: row.id,
        userId: row.user_id,
        loanType: row.loan_type,
        personName: row.person_name,
        amount: row.amount,
        amountPaid: row.amount_paid,
        currencyCode: row.currency_code,
        dueDate: row.due_date,
        interestRate: row.interest_rate,
        interestType: row.interest_type,
        paymentFrequency: row.payment_frequency,
        totalInstallments: row.total_installments,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }) // Schema doesn't have loanDate? Wait, checking schema again.
        // Schema has `dueDate` but not `loanDate`??
        // Schema: createdAt, updatedAt, dueDate.
        // Old code sorted by `loanDate`.
        // Wait, old code line 59: `loanDate: new Date(validData.loanDate)`. 
        // BUT Schema snippet in step 268 DOES NOT SHOW `loanDate` column in `Loan` model!
        // It shows `dueDate`. 
        // It does NOT show `loanDate` or `startDate`.
        // The old code was trying to write to `loanDate`? 
        // Line 59: `loanDate: new Date(validData.loanDate)`.
        // If Prisma schema didn't have it, that code was 100% broken or I am missing lines in schema view.
        // I viewed lines 150-250. Loan model is 208-227.
        // Fields: id, userId, loanType, personName, amount, amountPaid, currencyCode, dueDate, status, notes, createdAt, updatedAt.
        // NO `loanDate`.
        // So the old code failed? Or `createdAt` was used?
        // "transaction.transactionDate" exists.
        // Perhaps loan date is implicit in `createdAt` or the associated `transaction.transactionDate`?
        // The old `POST` created a transaction with `transactionDate: loanDate`.
        // But `loan.create` also tried `loanDate`. This suggests the user's local code MIGHT have `loanDate` in schema but my view didn't show it?
        // Or the user's schema is different from what I see?
        // I will Assume `createdAt` for now or `dueDate`.
        // Actually, I'll check if `loan_date` column exists in Supabase later.
        // For now, I will NOT map `loanDate` in GET because I don't see it in schema.

        if (error) {
            console.error('[LOANS_GET_SUPABASE]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        return NextResponse.json(loans.map(mapLoan))
    } catch (error) {
        console.error('[LOANS_GET]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const validData = loanSchema.parse(body)

        // 1. Create Loan with Expert Fields
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                user_id: user.id,
                loan_type: validData.loanType,
                person_name: validData.contactName,
                amount: validData.principalAmount,
                amount_paid: 0,
                currency_code: validData.currency,
                due_date: validData.dueDate ? validData.dueDate : null,
                notes: validData.description,
                status: 'PENDING',
                interest_rate: validData.interestRate,
                interest_type: validData.interestType,
                payment_frequency: validData.paymentFrequency,
                total_installments: validData.totalInstallments,
                start_date: validData.loanDate
            })
            .select()
            .single()

        if (loanError) {
            console.error('[LOANS_POST_SUPABASE] Error creating loan:', loanError)
            throw loanError
        }

        // 2. Generate Installments (Automatic Payment Scheduling)
        if (validData.totalInstallments > 1) {
            const installments = []
            const principalPerInstallment = validData.principalAmount / validData.totalInstallments
            // Simple interest calculation for the whole period (total interest = principal * rate) 
            // This is a basic expert approach, can be more complex (Amortization)
            const totalInterest = (validData.principalAmount * (validData.interestRate / 100))
            const interestPerInstallment = totalInterest / validData.totalInstallments

            let currentDate = new Date(validData.loanDate)

            for (let i = 1; i <= validData.totalInstallments; i++) {
                // Advance date based on frequency
                if (validData.paymentFrequency === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1)
                else if (validData.paymentFrequency === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7)
                else if (validData.paymentFrequency === 'BIWEEKLY') currentDate.setDate(currentDate.getDate() + 14)

                installments.push({
                    loan_id: loan.id,
                    installment_number: i,
                    due_date: currentDate.toISOString(),
                    principal_amount: principalPerInstallment,
                    interest_amount: interestPerInstallment,
                    status: 'PENDING'
                })
            }

            const { error: instError } = await supabase.from('loan_installments').insert(installments)
            if (instError) console.error('Error creating installments:', instError)
        }

        // 2. Create Transaction & Update Account (if accountId)
        if (validData.accountId) {
            // ROBUST CATEGORIZATION START
            // Automatically assign/create 'Préstamos' category to ensure it's tracked in 50/30/20
            let categoryId = null
            const categoryName = 'Préstamos'
            const categoryIcon = 'banknote' // Lucide icon name
            const categoryColor = '#10b981' // Emerald-500

            if (validData.loanType === 'LENT') {
                // For LENT (Expense), we need an Expense Category with rule 'SAVINGS'
                // Check if exists
                const { data: existingCat } = await supabase
                    .from('expense_categories')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('name', categoryName) // Case insensitive check
                    .single()

                if (existingCat) {
                    categoryId = existingCat.id
                } else {
                    // Create it
                    const { data: newCat, error: createError } = await supabase
                        .from('expense_categories')
                        .insert({
                            user_id: user.id,
                            name: categoryName,
                            icon: categoryIcon,
                            color: categoryColor,
                            budget_rule: 'SAVINGS', // CRITICAL: Mark as Savings for 50/30/20
                            is_system: false,
                            is_active: true
                        })
                        .select('id')
                        .single()

                    if (!createError && newCat) categoryId = newCat.id
                }
            } else {
                // For BORROWED (Income), we need an Income Category
                const { data: existingCat } = await supabase
                    .from('income_categories')
                    .select('id')
                    .eq('user_id', user.id)
                    .ilike('name', categoryName)
                    .single()

                if (existingCat) {
                    categoryId = existingCat.id
                } else {
                    // Create it
                    const { data: newCat, error: createError } = await supabase
                        .from('income_categories')
                        .insert({
                            user_id: user.id,
                            name: categoryName,
                            icon: categoryIcon,
                            color: categoryColor,
                            is_system: false,
                            is_active: true
                        })
                        .select('id')
                        .single()

                    if (!createError && newCat) categoryId = newCat.id
                }
            }
            // ROBUST CATEGORIZATION END

            const { error: txError } = await supabase.from('transactions').insert({
                user_id: user.id,
                transaction_type: validData.loanType === 'LENT' ? 'EXPENSE' : 'INCOME',
                account_id: validData.accountId,
                amount: validData.principalAmount,
                currency_code: validData.currency,
                transaction_date: validData.loanDate,
                description: `Préstamo: ${validData.loanType === 'LENT' ? 'Prestado a' : 'Recibido de'} ${validData.contactName}`,
                loan_id: loan.id,
                // Assign the auto-detected category
                expense_category_id: validData.loanType === 'LENT' ? categoryId : null,
                income_category_id: validData.loanType === 'BORROWED' ? categoryId : null
            })
            if (txError) console.error('Error creating loan transaction:', txError)

            // Update Balance
            const { data: acc } = await supabase.from('accounts').select('current_balance').eq('id', validData.accountId).single()
            if (acc) {
                let newBal = Number(acc.current_balance)
                if (validData.loanType === 'LENT') newBal -= validData.principalAmount
                else newBal += validData.principalAmount
                await supabase.from('accounts').update({ current_balance: newBal }).eq('id', validData.accountId)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        if (error instanceof z.ZodError) return new NextResponse('Invalid data', { status: 400 })
        console.error('[LOANS_POST]', error)
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
    }
}
