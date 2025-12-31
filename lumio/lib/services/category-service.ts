
import { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/default-categories'

export class CategoryService {
    /**
     * Clona el set completo de categorías globales para un usuario y migra todas sus referencias.
     * Esta es una operación atómica.
     */
    static async seedUserCategories(supabase: SupabaseClient, userId: string) {
        console.log(`[CATEGORY_SERVICE] Iniciando seeding para usuario ${userId}...`)

        // 1. Verificar si ya tiene categorías (seguridad)
        const { count } = await supabase
            .from('expense_categories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if ((count || 0) > 0) {
            console.log(`[CATEGORY_SERVICE] El usuario ya tiene categorías personalizadas. Abortando seeding.`)
            return
        }

        // 2. Proceso de Clonación (Categorías de Gasto)
        for (const sysCat of DEFAULT_EXPENSE_CATEGORIES) {
            const { data: newCat, error: catError } = await supabase
                .from('expense_categories')
                .insert({
                    user_id: userId,
                    name: sysCat.name,
                    icon: sysCat.icon,
                    color: sysCat.color,
                    budget_rule: sysCat.budget_rule
                })
                .select('id')
                .single()

            if (catError) throw catError

            // Re-vincular Transacciones de esta categoría
            await supabase
                .from('transactions')
                .update({ expense_category_id: newCat.id })
                .eq('user_id', userId)
                .eq('expense_category_id', sysCat.id)

            // Re-vincular Presupuestos
            await supabase
                .from('budgets')
                .update({ category_id: newCat.id })
                .eq('user_id', userId)
                .eq('category_id', sysCat.id)

            // Re-vincular Reglas Recurrentes
            await supabase
                .from('recurring_rules')
                .update({ expense_category_id: newCat.id })
                .eq('user_id', userId)
                .eq('expense_category_id', sysCat.id)

            // Re-vincular Gastos de Caja Chica
            await supabase
                .from('petty_cash_expenses')
                .update({ category_id: newCat.id })
                .eq('user_id', userId)
                .eq('category_id', sysCat.id)

            // Clonar Subcategorías si existen
            if (sysCat.subcategories && sysCat.subcategories.length > 0) {
                for (const sub of sysCat.subcategories) {
                    await supabase
                        .from('subcategories')
                        .insert({
                            expense_category_id: newCat.id,
                            name: sub.name,
                            is_active: true
                        })
                }
            }
        }

        // 3. Proceso de Clonación (Categorías de Ingreso)
        for (const sysCat of DEFAULT_INCOME_CATEGORIES) {
            const { data: newCat, error: catError } = await supabase
                .from('income_categories')
                .insert({
                    user_id: userId,
                    name: sysCat.name,
                    icon: sysCat.icon,
                    color: sysCat.color
                })
                .select('id')
                .single()

            if (catError) throw catError

            // Re-vincular Transacciones de esta categoría
            await supabase
                .from('transactions')
                .update({ income_category_id: newCat.id })
                .eq('user_id', userId)
                .eq('income_category_id', sysCat.id)

            // Re-vincular Reglas Recurrentes
            await supabase
                .from('recurring_rules')
                .update({ income_category_id: newCat.id })
                .eq('user_id', userId)
                .eq('income_category_id', sysCat.id)

            // Clonar Subcategorías
            if (sysCat.subcategories && sysCat.subcategories.length > 0) {
                for (const sub of sysCat.subcategories) {
                    await supabase
                        .from('subcategories')
                        .insert({
                            income_category_id: newCat.id,
                            name: sub.name,
                            is_active: true
                        })
                }
            }
        }

        console.log(`[CATEGORY_SERVICE] Seeding completado exitosamente para el usuario ${userId}.`)
    }
}
