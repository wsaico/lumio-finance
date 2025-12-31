
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const [expenseResult, incomeResult] = await Promise.all([
            supabase
                .from('expense_categories')
                .select('*, subcategories:subcategories(*)')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            supabase
                .from('income_categories')
                .select('*, subcategories:subcategories(*)')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
        ])

        const expenseCategories = expenseResult.data || []
        const incomeCategories = incomeResult.data || []

        // STRATEGY: DB ONLY (Physical Migration Complete)
        // We no longer merge defaults because they have been migrated to the DB.

        return NextResponse.json({
            expense: expenseCategories.map((c: any) => ({ ...c, type: 'EXPENSE' as const })),
            income: incomeCategories.map((c: any) => ({ ...c, type: 'INCOME' as const })),
        })
    } catch (error) {
        console.error('[CATEGORIES_GET]', error)
        return new NextResponse('Internal Error', { status: 500 })
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
        const { name, type, color, icon } = body

        if (!name || !type || !color || !icon) {
            return new NextResponse('Missing required fields', { status: 400 })
        }

        let category

        if (type === 'EXPENSE') {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert({
                    user_id: user.id,
                    name,
                    color,
                    icon,
                    is_active: true,
                })
                .select()
                .single()

            if (error) {
                console.error('[CATEGORIES_POST]', error)
                return new NextResponse('Database Error', { status: 500 })
            }
            category = data
        } else if (type === 'INCOME') {
            const { data, error } = await supabase
                .from('income_categories')
                .insert({
                    user_id: user.id,
                    name,
                    color,
                    icon,
                    is_active: true,
                })
                .select()
                .single()

            if (error) {
                console.error('[CATEGORIES_POST]', error)
                return new NextResponse('Database Error', { status: 500 })
            }
            category = data
        } else {
            return new NextResponse('Invalid category type', { status: 400 })
        }

        return NextResponse.json(category)

    } catch (error) {
        console.error('[CATEGORIES_POST]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const body = await req.json()
        const { name, type, color, icon } = body

        if (!id) return new NextResponse('ID required', { status: 400 })

        // Check if system category
        if ([...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].some(c => c.id === id)) {
            return new NextResponse('Cannot update system category', { status: 403 })
        }

        let updatedCategory

        // Try to update in Expense first
        const { data: expenseData } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('id', id)
            .single()

        if (expenseData) {
            const { data, error } = await supabase
                .from('expense_categories')
                .update({ name, color, icon })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('[CATEGORIES_PUT]', error)
                return new NextResponse('Database Error', { status: 500 })
            }
            updatedCategory = data
        } else {
            // Try Income
            const { data: incomeData } = await supabase
                .from('income_categories')
                .select('id')
                .eq('id', id)
                .single()

            if (incomeData) {
                const { data, error } = await supabase
                    .from('income_categories')
                    .update({ name, color, icon })
                    .eq('id', id)
                    .select()
                    .single()

                if (error) {
                    console.error('[CATEGORIES_PUT]', error)
                    return new NextResponse('Database Error', { status: 500 })
                }
                updatedCategory = data
            } else {
                return new NextResponse('Category not found', { status: 404 })
            }
        }

        return NextResponse.json(updatedCategory)

    } catch (error) {
        console.error('[CATEGORIES_PUT]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) return new NextResponse('ID required', { status: 400 })

        // Check if system category
        if ([...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].some(c => c.id === id)) {
            return new NextResponse('Cannot delete system category', { status: 403 })
        }

        // Try Delete in Expense
        const { data: expenseData } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('id', id)
            .single()

        if (expenseData) {
            const { error } = await supabase
                .from('expense_categories')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('[CATEGORIES_DELETE]', error)
                return new NextResponse('Database Error', { status: 500 })
            }
        } else {
            const { data: incomeData } = await supabase
                .from('income_categories')
                .select('id')
                .eq('id', id)
                .single()

            if (incomeData) {
                const { error } = await supabase
                    .from('income_categories')
                    .delete()
                    .eq('id', id)

                if (error) {
                    console.error('[CATEGORIES_DELETE]', error)
                    return new NextResponse('Database Error', { status: 500 })
                }
            } else {
                return new NextResponse('Category not found', { status: 404 })
            }
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[CATEGORIES_DELETE]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
