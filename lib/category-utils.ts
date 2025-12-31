
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/lib/constants/default-categories'

// Helper: Resolve System Category IDs to Real DB UUIDs
export async function resolveCategory(supabase: any, table: string, id: string | undefined | null, userId: string, defaults: any[]) {
    if (!id) return null
    // If it's a UUID and NOT a system ID (system IDs start with letter + 100...)
    if (!id.match(/^[abef]100/)) return id

    const def = defaults.find(d => d.id === id)
    if (!def) return null // Unknown system ID

    // Find by Name
    const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', userId)
        .eq('name', def.name)
        .single()

    if (existing) return existing.id

    // Create if missing
    console.log(`[RESOLVE_CATEGORY] Creating System Category: ${def.name}`)
    const { data: newCat, error } = await supabase
        .from(table)
        .insert({
            user_id: userId,
            name: def.name,
            icon: def.icon,
            color: def.color
        })
        .select('id')
        .single()

    if (error) {
        console.error(`[RESOLVE_CATEGORY] Error creating ${def.name}:`, error)
        return null
    }
    return newCat.id
}

export function getCategoryDefaults(type: string): any[] {
    if (type === 'INCOME' || type === 'SAVINGS') return DEFAULT_INCOME_CATEGORIES
    return DEFAULT_EXPENSE_CATEGORIES
}

/**
 * Recursively expands a list of category IDs to include all their subcategories (children).
 * Useful for filtering: if user selects "Food", we should also find transactions for "Groceries", "Restaurants", etc.
 */
export function expandCategoryIds(selectedIds: string[], allCategories: any[]): string[] {
    if (!selectedIds || selectedIds.length === 0) return []
    if (!allCategories || allCategories.length === 0) return selectedIds

    const resultIds = new Set<string>(selectedIds)

    // 1. Build a lookup of Parent -> Children
    const childrenMap: Record<string, string[]> = {}

    for (const cat of allCategories) {
        // Robust check for parent column name (could be parent_category_id or parent_id)
        const parentId = cat.parent_category_id || cat.parent_id || null

        if (parentId) {
            if (!childrenMap[parentId]) {
                childrenMap[parentId] = []
            }
            childrenMap[parentId].push(cat.id)
        }
    }

    // 2. Recursive function to find descendants
    function findDescendants(parentId: string) {
        const children = childrenMap[parentId]
        if (children) {
            for (const childId of children) {
                if (!resultIds.has(childId)) { // Avoid cycles
                    resultIds.add(childId)
                    findDescendants(childId)
                }
            }
        }
    }

    // 3. For each selected ID, find its children
    for (const id of selectedIds) {
        findDescendants(id)
    }

    return Array.from(resultIds)
}
