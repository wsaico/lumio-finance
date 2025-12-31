import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const results = {
            updated: 0,
            inserted: 0,
            deactivated: 0,
            errors: [] as string[]
        }

        const validCategoryIds: string[] = []

        // --- HELPER: Process List ---
        const processList = async (list: any[], type: 'EXPENSE' | 'INCOME') => {
            for (const cat of list) {
                // 1. Find or Insert Parent
                // Try to find by NAME first to adopt existing (case insensitive)
                let { data: existing } = await supabase
                    .from(type === 'EXPENSE' ? 'expense_categories' : 'income_categories')
                    .select('id, name')
                    .ilike('name', cat.name)
                    .or(`is_system.eq.true,user_id.eq.${user.id}`) // Look for system or current user's version
                    .maybeSingle()

                let currentId = existing?.id

                if (existing) {
                    // Update Metadata
                    const { error: upError } = await supabase
                        .from(type === 'EXPENSE' ? 'expense_categories' : 'income_categories')
                        .update({
                            color: cat.color,
                            icon: cat.icon,
                            budget_rule: (cat as any).budget_rule || null,
                            is_active: true,
                            is_system: true
                        })
                        .eq('id', currentId)

                    if (upError) results.errors.push(`Update failed for ${cat.name}: ${upError.message}`)
                    else results.updated++
                } else {
                    // Insert New
                    currentId = cat.id
                    const payload: any = {
                        id: currentId,
                        name: cat.name,
                        icon: cat.icon,
                        color: cat.color,
                        is_system: true,
                        is_active: true,
                        sort_order: 100,
                        user_id: user.id // Assign to user? Or Keep Global? 
                        // User wanted "Clean". If I assign to User, they can edit. 
                        // But original defaults were global.
                        // My heal script previously inserted as user.id.
                        // I will stick to user.id for now so RLS allows insert/update.
                    }
                    if (type === 'EXPENSE') payload.budget_rule = (cat as any).budget_rule || 'WANT'

                    const { error: insError } = await supabase
                        .from(type === 'EXPENSE' ? 'expense_categories' : 'income_categories')
                        .insert(payload)

                    if (insError) {
                        results.errors.push(`Insert failed for ${cat.name}: ${insError.message}`)
                        continue
                    } else {
                        results.inserted++
                    }
                }

                if (currentId) validCategoryIds.push(currentId)

                // 2. Process Subcategories
                if (currentId && cat.subcategories) {
                    for (const sub of cat.subcategories) {
                        // Check existence
                        const { data: existSub } = await supabase
                            .from('subcategories')
                            .select('id')
                            .eq(type === 'EXPENSE' ? 'expense_category_id' : 'income_category_id', currentId)
                            .ilike('name', sub.name)
                            .maybeSingle()

                        if (!existSub) {
                            const subPayload: any = {
                                name: sub.name,
                                icon: sub.icon || null, // Capture icon from default-categories.ts
                                user_id: user.id
                            }
                            if (type === 'EXPENSE') subPayload.expense_category_id = currentId
                            else subPayload.income_category_id = currentId

                            await supabase.from('subcategories').insert(subPayload)
                        } else {
                            // Update icon if already exists but changed
                            await supabase
                                .from('subcategories')
                                .update({ icon: sub.icon || null })
                                .eq('id', existSub.id)
                        }
                    }
                }
            }
        }

        await processList(DEFAULT_EXPENSE_CATEGORIES, 'EXPENSE')
        await processList(DEFAULT_INCOME_CATEGORIES, 'INCOME')

        return NextResponse.json({ ...results, valid_ids: validCategoryIds.length })

    } catch (error: any) {
        console.error('Heal Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
