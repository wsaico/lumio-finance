import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'
import { CategoryService } from '@/lib/services/category-service'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Check if user has ANY personal categories (to decide Template vs Property)
        const { count: userCategoriesCount } = await supabase
            .from('expense_categories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        const hasPersonalCategories = (userCategoriesCount || 0) > 0

        const [expenseResult, incomeResult] = await Promise.all([
            supabase
                .from('expense_categories')
                .select('*, subcategories:subcategories(*)')
                .filter('user_id', hasPersonalCategories ? 'eq' : 'is', hasPersonalCategories ? user.id : null)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            supabase
                .from('income_categories')
                .select('*, subcategories:subcategories(*)')
                .filter('user_id', hasPersonalCategories ? 'eq' : 'is', hasPersonalCategories ? user.id : null)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
        ])

        const expenseCategories = (expenseResult.data || []).map((c: any) => ({
            ...c,
            type: 'EXPENSE' as const,
            isSystem: !c.user_id,
            is_system: !c.user_id
        }))
        const incomeCategories = (incomeResult.data || []).map((c: any) => ({
            ...c,
            type: 'INCOME' as const,
            isSystem: !c.user_id,
            is_system: !c.user_id
        }))

        return NextResponse.json({
            expense: expenseCategories,
            income: incomeCategories,
            all: [...expenseCategories, ...incomeCategories]
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
        const sysCat = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].find(c => c.id === id)
        let targetId = id

        if (sysCat) {
            console.log(`[CATEGORIES_PUT] System category detected. Seeding...`)
            await CategoryService.seedUserCategories(supabase, user.id)

            const repo = sysCat.id.startsWith('e') ? 'expense_categories' : 'income_categories'
            const { data: newCat } = await supabase
                .from(repo)
                .select('id')
                .eq('user_id', user.id)
                .eq('name', sysCat.name)
                .single()
            if (newCat) targetId = newCat.id
        }

        let updatedCategory

        // Try to update in Expense first
        let isExpense = targetId.startsWith('e')
        if (!isExpense) {
            const { data: expCheck } = await supabase.from('expense_categories').select('id').eq('id', targetId).single()
            if (expCheck) isExpense = true
        }

        if (isExpense) {
            const { data, error } = await supabase
                .from('expense_categories')
                .update({ name, color, icon })
                .eq('id', targetId)
                .eq('user_id', user.id)
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

            if (!isExpense) {
                const { data, error } = await supabase
                    .from('income_categories')
                    .update({ name, color, icon })
                    .eq('id', targetId)
                    .eq('user_id', user.id)
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
        const sysCat = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].find(c => c.id === id)
        let targetId = id

        if (sysCat) {
            console.log(`[CATEGORIES_DELETE] System category detected. Seeding before delete...`)
            await CategoryService.seedUserCategories(supabase, user.id)

            const repo = sysCat.id.startsWith('e') ? 'expense_categories' : 'income_categories'
            const { data: newCat } = await supabase
                .from(repo)
                .select('id')
                .eq('user_id', user.id)
                .eq('name', sysCat.name)
                .single()
            if (newCat) targetId = newCat.id
        }

        // Try Delete in Expense
        let isExpense = targetId.startsWith('e')
        if (!isExpense) {
            const { data: expCheck } = await supabase.from('expense_categories').select('id').eq('id', targetId).single()
            if (expCheck) isExpense = true
        }

        if (isExpense) {
            const { error } = await supabase
                .from('expense_categories')
                .delete()
                .eq('id', targetId)
                .eq('user_id', user.id)

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

            if (!isExpense) {
                const { error } = await supabase
                    .from('income_categories')
                    .delete()
                    .eq('id', targetId)
                    .eq('user_id', user.id)

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

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return new NextResponse('Unauthorized', { status: 401 })

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return new NextResponse('ID required', { status: 400 })

        const body = await req.json()
        let targetId = id

        // Check if system category
        const sysCat = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].find(c => c.id === id)

        if (sysCat) {
            console.log(`[CATEGORIES_PATCH] System category detected (${sysCat.name}). Triggering seeding...`)
            await CategoryService.seedUserCategories(supabase, user.id)

            // Find the new ID of the cloned category
            const repo = sysCat.id.startsWith('e') ? 'expense_categories' : 'income_categories'
            const { data: newCat } = await supabase
                .from(repo)
                .select('id')
                .eq('user_id', user.id)
                .eq('name', sysCat.name)
                .single()

            if (newCat) targetId = newCat.id
        }

        // Apply partial updates
        const repo = targetId.startsWith('e') ? 'expense_categories' : 'income_categories'

        // Dynamic update object (to support budget_rule and others)
        const updateData: any = {}
        if (body.name) updateData.name = body.name
        if (body.color) updateData.color = body.color
        if (body.icon) updateData.icon = body.icon
        if (body.budget_rule) updateData.budget_rule = body.budget_rule
        if (body.budgetRule) updateData.budget_rule = body.budgetRule // Support camelCase from UI

        const { data, error } = await supabase
            .from(repo)
            .update(updateData)
            .eq('id', targetId)
            .eq('user_id', user.id) // Security
            .select()
            .single()

        if (error) {
            console.error('[CATEGORIES_PATCH] Error updating:', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        return NextResponse.json(data)

    } catch (error) {
        console.error('[CATEGORIES_PATCH]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
