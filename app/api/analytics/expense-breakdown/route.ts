export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'
import { format } from 'date-fns'

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

        // Fetch rates
        // Fetch rates and Accounts parallel
        const [rateMap, accountsRes] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code').eq('user_id', user.id)
        ])
        const targetCurrency = user.user_metadata?.currency || 'PEN'

        const accounts = accountsRes.data || []
        const accountCurrencyMap: Record<string, string> = {}
        accounts.forEach(acc => {
            accountCurrencyMap[acc.id] = acc.currency_code
        })

        // Parse month (YYYY-MM)
        const [year, monthNum] = month.split('-').map(Number)

        // Use local start/end of month to match how transaction_date (without time) is usually stored or perceived
        const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0)
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

        // Use format to get YYYY-MM-DD strings to avoid toISOString() timezone shifts
        const startDateStr = format(startDate, 'yyyy-MM-dd')
        const endDateStr = format(endDate, 'yyyy-MM-dd HH:mm:ss')

        // Get all expenses for the month with categories
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                amount,
                currency_code,
                expense_category_id,
                account_id,
                expense_category:expense_categories(name, color)
            `)
            .eq('user_id', user.id)
            .eq('transaction_type', 'EXPENSE')
            .gte('transaction_date', startDateStr)
            .lte('transaction_date', endDateStr)

        if (error) {
            console.error('[EXPENSE_BREAKDOWN]', error)
            return new NextResponse('Database Error', { status: 500 })
        }

        // Group by category
        const categoryMap = new Map<string, { name: string, total: number, color: string }>()
        let total = 0

        transactions?.forEach((tx: any) => {
            const rawAmount = Number(tx.amount)
            const currency = tx.currency_code || accountCurrencyMap[tx.account_id] || 'PEN'
            const amount = convertAmount(rawAmount, currency, targetCurrency, rateMap)

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
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        console.error('[EXPENSE_BREAKDOWN]', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
