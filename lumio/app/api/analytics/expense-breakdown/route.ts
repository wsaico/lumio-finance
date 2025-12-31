import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const month = searchParams.get('month') // Format: YYYY-MM

        if (!month) {
            return new NextResponse('Month parameter required', { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse month
        const [year, monthNum] = month.split('-').map(Number)
        const startDate = new Date(year, monthNum - 1, 1)
        const endDate = new Date(year, monthNum, 0, 23, 59, 59)

        // Get all expenses for the month with categories
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                amount,
                expense_category_id,
                expense_category:expense_categories(name, color)
            `)
            .eq('user_id', user.id)
            .eq('transaction_type', 'EXPENSE')
            .gte('transaction_date', startDate.toISOString())
            .lte('transaction_date', endDate.toISOString())

        if (error) {
            console.error('[EXPENSE_BREAKDOWN]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        // Group by category
        const categoryMap = new Map<string, { name: string, total: number, color: string }>()
        let total = 0

        transactions?.forEach((tx: any) => {
            const amount = Number(tx.amount)
            total += amount

            const categoryName = tx.expense_category?.name || 'Sin categoría'
            const categoryColor = tx.expense_category?.color || '#6b7280'

            if (categoryMap.has(categoryName)) {
                const existing = categoryMap.get(categoryName)!
                existing.total += amount
            } else {
                categoryMap.set(categoryName, {
                    name: categoryName,
                    total: amount,
                    color: categoryColor
                })
            }
        })

        // Convert to array and sort by total (descending)
        // Convert to array and sort by total (descending)
        let allCategories = Array.from(categoryMap.values())
            .sort((a, b) => b.total - a.total)

        const categories = []
        let otherTotal = 0

        // Logic: Take top 4, group rest into "Otros"
        if (allCategories.length > 5) {
            const topCategories = allCategories.slice(0, 4)
            const remaining = allCategories.slice(4)

            otherTotal = remaining.reduce((sum, cat) => sum + cat.total, 0)

            categories.push(...topCategories.map(cat => ({
                name: cat.name,
                value: cat.total,
                color: cat.color,
                percentage: total > 0 ? (cat.total / total) * 100 : 0
            })))

            if (otherTotal > 0) {
                categories.push({
                    name: 'Otros',
                    value: otherTotal,
                    color: '#94a3b8', // slate-400
                    percentage: total > 0 ? (otherTotal / total) * 100 : 0
                })
            }
        } else {
            // If 5 or less, just show all
            categories.push(...allCategories.map(cat => ({
                name: cat.name,
                value: cat.total,
                color: cat.color,
                percentage: total > 0 ? (cat.total / total) * 100 : 0
            })))
        }

        return NextResponse.json({
            categories,
            total,
            month
        })
    } catch (error) {
        console.error('[EXPENSE_BREAKDOWN]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
