export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays, endOfDay, startOfDay } from 'date-fns'
import { expandCategoryIds } from '@/lib/category-utils'
import { getExchangeRatesMap, convertAmount } from '@/lib/currency'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const categoriesFilter = searchParams.get('categories')?.split(',').filter(Boolean) || []
        const accountsFilter = searchParams.get('accounts')?.split(',').filter(Boolean) || []
        const typeParam = searchParams.get('type') || 'ALL'
        const periodParam = searchParams.get('period') || '6m'
        const startDateParam = searchParams.get('startDate')
        const endDateParam = searchParams.get('endDate')

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const targetCurrency = searchParams.get('currency') || user.user_metadata?.currency || 'PEN' // Helper param

        // ... auth check

        // 0. Fetch Categories explicitly (Robust Split queries)
        // 0. Fetch Data Parallel
        const [rateMap, accountsRes] = await Promise.all([
            getExchangeRatesMap(supabase),
            supabase.from('accounts').select('id, currency_code, current_balance, account_type').eq('user_id', user.id)
        ])

        const accounts = accountsRes.data || []
        const accountCurrencyMap: Record<string, string> = {}
        accounts.forEach(acc => {
            accountCurrencyMap[acc.id] = acc.currency_code
        })

        // Helper to convert inline - DEFINED EARLY
        const toBase = (amount: number, currency: string) => {
            return convertAmount(amount, currency, targetCurrency, rateMap)
        }

        const [userExp, sysExp, userInc, sysInc] = await Promise.all([
            supabase.from('expense_categories').select('*').eq('user_id', user.id),
            supabase.from('expense_categories').select('*').is('user_id', null),
            supabase.from('income_categories').select('*').eq('user_id', user.id),
            supabase.from('income_categories').select('*').is('user_id', null)
        ])

        const allCategories = [
            ...(userExp.data || []).map(c => ({ ...c, type: 'EXPENSE', parent_id: c.parent_category_id })),
            ...(sysExp.data || []).map(c => ({ ...c, type: 'EXPENSE', parent_id: c.parent_category_id })),
            ...(userInc.data || []).map(c => ({ ...c, type: 'INCOME', parent_id: c.parent_category_id })),
            ...(sysInc.data || []).map(c => ({ ...c, type: 'INCOME', parent_id: c.parent_category_id }))
        ]

        const idToCategory: Record<string, any> = {}
        const categoriesByName: Record<string, string[]> = {}
        const normalize = (n: string) => n ? n.trim().toLowerCase() : ''

        allCategories.forEach(c => {
            idToCategory[c.id] = c
            if (c.name) {
                const key = normalize(c.name)
                if (!categoriesByName[key]) categoriesByName[key] = []
                categoriesByName[key].push(c.id)
            }
        })

        // Determine analytical range
        let analyticsStart: string
        let analyticsEnd: string

        if (periodParam === '1m') {
            const thirtyDaysAgo = startOfDay(subMonths(now, 1))
            analyticsStart = thirtyDaysAgo.toISOString()
            analyticsEnd = endOfDay(now).toISOString()
        } else if (periodParam === 'custom' && startDateParam && endDateParam) {
            analyticsStart = startOfDay(new Date(startDateParam)).toISOString()
            analyticsEnd = endOfDay(new Date(endDateParam)).toISOString()
        } else {
            analyticsStart = startOfMonth(now).toISOString()
            analyticsEnd = endOfMonth(now).toISOString()
        }

        const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
        const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()

        // Helper to apply common filters
        const applyCommonFilters = (query: any) => {
            let q = query.eq('user_id', user.id)
            if (categoriesFilter.length > 0) {
                q = q.or(`expense_category_id.in.(${categoriesFilter.join(',')}),income_category_id.in.(${categoriesFilter.join(',')})`)
            }
            if (accountsFilter.length > 0) {
                q = q.in('account_id', accountsFilter)
            }
            if (typeParam !== 'ALL') {
                q = q.eq('transaction_type', typeParam)
            }
            return q
        }

        // Helper specifically for stats - DEFINED BEFORE USAGE
        const getStatsForRange = async (start: string, end: string) => {
            let q = supabase
                .from('transactions')
                .select('amount, transaction_type, currency_code, account_id')
                .gte('transaction_date', start)
                .lte('transaction_date', end)

            q = applyCommonFilters(q)
            const { data: txs, error: rangeError } = await q
            if (rangeError) throw rangeError

            let inc = 0
            let exp = 0
            txs?.forEach(tx => {
                const rawAmount = Number(tx.amount)
                const currency = tx.currency_code || accountCurrencyMap[tx.account_id]
                const amt = toBase(rawAmount, currency)

                if (tx.transaction_type === 'INCOME') inc += amt
                if (tx.transaction_type === 'EXPENSE') exp += amt
            })
            return { income: inc, expense: exp }
        }

        // 1. Multi-month Trend
        const trend = []
        const monthsCount = periodParam === '12m' ? 12 : periodParam === '3m' ? 3 : 6

        for (let i = monthsCount - 1; i >= 0; i--) {
            const mData = await getStatsForRange(
                startOfMonth(subMonths(now, i)).toISOString(),
                endOfMonth(subMonths(now, i)).toISOString()
            )
            trend.push({
                name: format(subMonths(now, i), 'MMM'),
                income: mData.income,
                expense: mData.expense
            })
        }

        const current = await getStatsForRange(analyticsStart, analyticsEnd)
        const previous = await getStatsForRange(prevMonthStart, prevMonthEnd)

        // 3. Category Analysis & 50/30/20
        let catQuery = supabase
            .from('transactions')
            .select('*, account_id')
            .gte('transaction_date', analyticsStart)
            .lte('transaction_date', analyticsEnd)

        catQuery = applyCommonFilters(catQuery)
        const { data: catTxs, error: catError } = await catQuery
        if (catError) console.error('[FinancialHealth] Category Query Error:', catError)

        const categorySpending: Record<string, { id: string, name: string, amount: number, color: string }> = {}
        let needsVal = 0
        let wantsVal = 0
        let savingsVal = 0

        catTxs?.forEach((tx: any) => {
            const rawAmount = Number(tx.amount)
            const currency = tx.currency_code || accountCurrencyMap[tx.account_id]
            const amt = toBase(rawAmount, currency)
            const type = tx.transaction_type

            // 1. Income Logic - EXCLUDED: This report is for expenses only.
            if (type === 'INCOME') return

            // 2. Expense/Outflow Logic
            // Check for Debt/Loan payments first (part of 20% Financial Freedom)
            const hasLoan = !!tx.loan_id
            const isDebt = type === 'LOAN_PAYMENT' || type === 'DEBT_PAYMENT'

            if (hasLoan || isDebt) {
                savingsVal += amt
                // Add to detailed breakdown as Debt Repayment
                const debtKey = 'debt-repayment'
                if (!categorySpending[debtKey]) {
                    categorySpending[debtKey] = { id: debtKey, name: 'Pago de Deuda', amount: 0, color: '#10b981' } // Emerald color
                }
                categorySpending[debtKey].amount += amt
                return
            }

            // 3. Regular Categorized Expenses
            const catId = tx.expense_category_id
            const cat = catId ? idToCategory[catId] : null
            const rule = cat?.budget_rule

            if (rule === 'NEED') needsVal += amt
            else if (rule === 'SAVINGS') savingsVal += amt
            else wantsVal += amt // Default to WANT

            if (catId) {
                if (!categorySpending[catId]) {
                    categorySpending[catId] = { id: catId, name: cat?.name || 'Otros Gastos', amount: 0, color: cat?.color || '#888' }
                }
                categorySpending[catId].amount += amt
            }
        })

        // Add explicit savings deposits (Transaction Type)
        const { data: explicitSavings } = await applyCommonFilters(
            supabase.from('transactions')
                .select('amount')
                .eq('transaction_type', 'SAVINGS_DEPOSIT')
                .gte('transaction_date', analyticsStart)
                .lte('transaction_date', analyticsEnd)
        )
        const explicitSavingsTotal = explicitSavings?.reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0
        savingsVal += explicitSavingsTotal

        // Add Savings Goals Contributions (STRICT MODE: Only Wealth-Building Goals)
        // 1. Get IDs of goals that qualify as TRUE SAVINGS (Emergency, Investment, Debt)
        const { data: strictSavingsGoals } = await supabase
            .from('savings_goals')
            .select('id')
            .in('goal_type', ['EMERGENCY', 'INVESTMENT', 'DEBT']) // Strict Rule: Travel/Purchase are deferred spending, not savings.
            .eq('user_id', user.id)

        const strictGoalIds = new Set(strictSavingsGoals?.map(g => g.id))

        const { data: goalContributions } = await supabase
            .from('goal_contributions')
            .select('amount, transaction_id, goal_id')
            .gte('contribution_date', analyticsStart)
            .lte('contribution_date', analyticsEnd)
            .eq('user_id', user.id)

        // Only add contributions that are NOT already linked to a transaction 
        // OR if they are linked, ensure we don't double count if the transaction was already counted above.
        // Simplified approach: matched by transaction_id in the previously fetched `catTxs`
        const catTxIds = new Set(catTxs?.map((t: any) => t.id))

        goalContributions?.forEach((contribution: any) => {
            // STRICT MODE CHECK: Does this contribution belong to a "Wealth Building" goal?
            if (!strictGoalIds.has(contribution.goal_id)) {
                return // Skip Travel, Purchase, etc.
            }

            const amt = Number(contribution.amount)
            savingsVal += amt

            // Double Counting Adjustment: 
            // If this contribution came from a transaction that we already counted in Needs/Wants/Savings loop above,
            // we must "move" it from that bucket to Savings (or remove double count if already in Savings).
            if (contribution.transaction_id) {
                const linkedTx = catTxs?.find((t: any) => t.id === contribution.transaction_id)
                if (linkedTx) {
                    const cat = linkedTx.expense_category_id ? idToCategory[linkedTx.expense_category_id] : null
                    const rule = cat?.budget_rule
                    // If the original transaction was categorized as...
                    if (rule === 'NEED') needsVal -= amt
                    else if (rule === 'WANT') wantsVal -= amt // Default was WANT
                    else if (rule === 'SAVINGS') savingsVal -= amt // It was already credited to Savings above, so we remove the duplicate.
                    else wantsVal -= amt // Fallback default
                }
            }
        })

        const ruleBase = current.income > 0 ? current.income : (needsVal + wantsVal + savingsVal)
        const budgetRule = {
            needs: {
                amount: needsVal,
                percent: ruleBase > 0 ? (needsVal / ruleBase) * 100 : 0,
                target: 50,
                status: (needsVal / ruleBase) * 100 > 50 ? 'WARNING' : 'OK'
            },
            wants: {
                amount: wantsVal,
                percent: ruleBase > 0 ? (wantsVal / ruleBase) * 100 : 0,
                target: 30,
                status: (wantsVal / ruleBase) * 100 > 30 ? 'WARNING' : 'OK'
            },
            savings: {
                amount: savingsVal,
                percent: ruleBase > 0 ? (savingsVal / ruleBase) * 100 : 0,
                target: 20,
                status: (savingsVal / ruleBase) * 100 < 20 ? 'WARNING' : 'OK'
            }
        }

        // 4. Final KPIs
        const savingsRate = current.income > 0
            ? ((current.income - current.expense) / current.income) * 100
            : 0

        const daysInRange = differenceInDays(new Date(analyticsEnd), new Date(analyticsStart)) + 1
        const burnRate = current.expense / (periodParam === 'custom' ? daysInRange : now.getDate())

        // 5. Executive Suite: Health Score, Runway, & Forecast
        // Fix: Use correct column 'current_balance' and filter by user/type (exclude CREDIT_CARD) to get true liquidity.
        // Already fetched 'accounts' at the top!
        // Filter here for liquidity
        const liquidityAccounts = accounts.filter((acc: any) => acc.account_type !== 'CREDIT_CARD')
        const totalLiquidity = liquidityAccounts?.reduce((sum: number, acc: any) => {
            return sum + toBase(Number(acc.current_balance || 0), acc.currency_code)
        }, 0) || 0

        const liabilities = accounts.filter((acc: any) => acc.account_type === 'CREDIT_CARD').reduce((sum: number, acc: any) => {
            return sum + toBase(Number(acc.current_balance || 0), acc.currency_code)
        }, 0) || 0

        // Runway (Months of oxygen)
        const avgMonthlyExpense = previous.expense > 0 ? (current.expense + previous.expense) / 2 : current.expense
        const runwayMonths = avgMonthlyExpense > 0 ? totalLiquidity / avgMonthlyExpense : 12

        // Financial Health Score (0-100)
        // Weights: Savings Rate (40), Runway (30), Budget Adherence/Stability (20), Income Growth (10)
        const savingsScore = Math.max(0, Math.min(40, (savingsRate / 20) * 40)) // 20% = 40pts
        const runwayScore = Math.max(0, Math.min(30, (runwayMonths / 6) * 30)) // 6 months = 30pts
        const stabilityScore = current.expense < current.income ? 20 : 10
        const growthScore = current.income >= previous.income ? 10 : 5
        const healthScore = Math.round(savingsScore + runwayScore + stabilityScore + growthScore)

        // Forecasts
        const daysInMonth = 30 // Simplified
        const remainingDays = daysInMonth - now.getDate()
        const predictedMonthEndExpense = current.expense + (burnRate * remainingDays)
        const estimatedYearlySavings = (current.income - current.expense) * 12

        // Annualized Leaks (Top 3 expenses)
        const annualizedImpact = Object.values(categorySpending)
            .filter(c => c.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3)
            .map(c => ({
                name: c.name,
                monthly: c.amount,
                yearly: c.amount * 12,
                color: c.color
            }))

        // 6. Insights
        const insights = []
        if (savingsRate < 10 && current.income > 0) {
            insights.push({
                type: 'WARNING',
                message: 'Tu tasa de ahorro es baja (menor al 10%). Considera revisar tus gastos hormiga.',
                impact: 'ALTO'
            })
        } else if (savingsRate >= 20) {
            insights.push({
                type: 'SUCCESS',
                message: '¡Excelente! Estás siguiendo la regla de oro del 20% de ahorro.',
                impact: 'POSITIVO'
            })
        }

        if (current.expense > previous.expense * 1.2 && previous.expense > 0) {
            insights.push({
                type: 'CAUTION',
                message: `Tus gastos han aumentado un ${Math.round((current.expense / previous.expense - 1) * 100)}% respecto al mes pasado.`,
                impact: 'MEDIO'
            })
        }

        if (runwayMonths < 3) {
            insights.push({
                type: 'DANGER',
                message: `Peligro: Tu reserva actual solo cubre ${runwayMonths} meses de gastos. Se recomienda tener al menos 6 meses.`,
                impact: 'CRÍTICO'
            })
        }

        // 7. Active Budgets (Current Month Progress)
        const budgetStart = startOfMonth(now).toISOString()
        const budgetEnd = endOfMonth(now).toISOString()

        const { data: budgets } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)

        const idToName: Record<string, string> = {}
        allCategories.forEach(c => { idToName[c.id] = c.name })

        const { data: budgetTxs } = await supabase
            .from('transactions')
            .select('amount, expense_category_id, subcategory_id')
            .eq('user_id', user.id)
            .gte('transaction_date', budgetStart)
            .lte('transaction_date', budgetEnd)
            .eq('transaction_type', 'EXPENSE')

        const mappedBudgets = budgets?.map((b: any) => {
            let spent = 0
            if (b.include_categories && b.include_categories.length > 0) {
                // Intelligent Name Matching & Expansion
                let targetIds: string[] = []
                b.include_categories.forEach((id: string) => {
                    targetIds.push(id)
                    const name = idToName[id]
                    if (name) {
                        const key = normalize(name)
                        if (categoriesByName[key]) {
                            targetIds.push(...categoriesByName[key])
                        }
                    }
                })

                const targetIdsSet = new Set(expandCategoryIds(targetIds, allCategories))

                // Filter transactions that match ANY target category (Parent OR Subcategory)
                spent = budgetTxs?.reduce((sum: number, tx: any) => {
                    const match = (tx.expense_category_id && targetIdsSet.has(tx.expense_category_id)) ||
                        (tx.subcategory_id && targetIdsSet.has(tx.subcategory_id))
                    return match ? sum + Number(tx.amount) : sum
                }, 0) || 0
            } else {
                // Global Budget: Sum all expenses
                spent = budgetTxs?.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0) || 0
            }

            return {
                id: b.id,
                name: b.name,
                amount: b.amount,
                spent,
                percent: Math.min(100, (spent / b.amount) * 100),
                color: b.color || '#3b82f6'
            }
        }).sort((a: any, b: any) => b.percent - a.percent)

        // 8. Active Loans
        const { data: loans } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['PENDING', 'PARTIAL'])
            .order('amount', { ascending: false })
            .limit(5)

        const mappedLoans = loans?.map((l: any) => ({
            id: l.id,
            person: l.person_name,
            type: l.loan_type,
            amount: l.amount,
            paid: l.amount_paid,
            remaining: l.amount - l.amount_paid,
            dueDate: l.due_date
        }))

        return NextResponse.json({
            kpis: {
                income: current.income,
                expense: current.expense,
                savingsRate: Math.max(0, Math.round(savingsRate * 10) / 10),
                burnRate: Math.round(burnRate * 100) / 100,
                netCashFlow: current.income - current.expense,
                healthScore,
                runwayMonths: Math.round(runwayMonths * 10) / 10,
                totalLiquidity,
                liabilities
            },
            comparison: {
                incomeChange: previous.income > 0 ? (current.income / previous.income - 1) * 100 : 0,
                expenseChange: previous.expense > 0 ? (current.expense / previous.expense - 1) * 100 : 0
            },
            categories: Object.values(categorySpending).sort((a, b) => b.amount - a.amount),
            trend,
            budgetRule,
            insights,
            forecast: {
                predictedMonthEndExpense,
                estimatedYearlySavings
            },
            annualizedImpact,
            budgets: mappedBudgets,
            loans: mappedLoans
        })

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error;
        }

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
