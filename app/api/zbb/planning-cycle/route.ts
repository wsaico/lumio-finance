export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ZBBCalculator } from '@/lib/planning/zbb-calculator'
import { buildCategoryIndex, getMonthDateRangeUTC } from '@/lib/budgets'
import { expandCategoryIds } from '@/lib/category-utils'

function parseYearMonth(dateStr: string): { year: number; month: number } {
    const [y, m] = dateStr.split('-').map(Number)
    const now = new Date()
    return {
        year: y || now.getFullYear(),
        month: m || now.getMonth() + 1,
    }
}

// GET: Fetch active/specific cycle with live audit + real spent per allocation, OR history list
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const view = searchParams.get('view')
        const historyParam = searchParams.get('history')
        const month = searchParams.get('month') // yyyy-MM

        // History list mode (supports both ?history=true and ?view=list)
        if (historyParam === 'true' || view === 'list') {
            const { data, error } = await supabase
                .from('zbb_planning_cycles')
                .select('id, cycle_name, period_start, period_end, status, total_income_pen, total_income_usd')
                .eq('user_id', user.id)
                .order('period_start', { ascending: false })

            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json(historyParam === 'true' ? { history: data || [] } : (data || []))
        }

        // Single cycle query
        let query = supabase
            .from('zbb_planning_cycles')
            .select(`
                *,
                allocations:zbb_allocations (
                    *,
                    category:expense_categories (*),
                    subcategory:subcategories (*),
                    goal:savings_goals (*)
                )
            `)
            .eq('user_id', user.id)

        if (month) {
            const [y, m] = month.split('-').map(Number)
            const lastDay = new Date(y, m, 0).getDate()
            const start = `${month}-01`
            const end = `${month}-${String(lastDay).padStart(2, '0')}`
            query = query.gte('period_start', start).lte('period_start', end)
        } else {
            const now = new Date()
            const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
            query = query.gte('period_start', startOfMonth)
        }

        const { data: cycle, error } = await query
            .order('period_start', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Fetch previous month's real income & top expenses as planning suggestions
        const now = new Date()
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevRange = getMonthDateRangeUTC(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1)

        // If no cycle exists yet for this period, return HTTP 200 with cycle: null + suggestions
        if (!cycle) {
            const [{ data: prevCycle }, { data: prevTxs }] = await Promise.all([
                supabase
                    .from('zbb_planning_cycles')
                    .select('id, cycle_name, period_start')
                    .eq('user_id', user.id)
                    .order('period_start', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('transactions')
                    .select('amount, currency_code, transaction_type')
                    .eq('user_id', user.id)
                    .eq('transaction_type', 'INCOME')
                    .gte('transaction_date', prevRange.startIso)
                    .lte('transaction_date', prevRange.endIso),
            ])

            let suggestedIncomePEN = 0
            let suggestedIncomeUSD = 0
            for (const t of prevTxs || []) {
                const amt = Number(t.amount || 0)
                if (t.currency_code === 'USD') suggestedIncomeUSD += amt
                else suggestedIncomePEN += amt
            }

            return NextResponse.json({
                cycle: null,
                moneyPool: null,
                audit: null,
                suggestions: {
                    previousCycle: prevCycle || null,
                    suggestedIncomePEN: Math.round(suggestedIncomePEN * 100) / 100,
                    suggestedIncomeUSD: Math.round(suggestedIncomeUSD * 100) / 100,
                },
            })
        }

        const allocations = cycle.allocations || []
        const moneyPool = ZBBCalculator.calculateMoneyPool(
            Number(cycle.total_income_usd || 0),
            Number(cycle.total_income_pen || 0),
            allocations
        )

        // Compute live execution (Actual Income + Actual Spent per Allocation) using real column names
        const { year, month: cycleMonth } = parseYearMonth(cycle.period_start)
        const { startIso, endIso } = getMonthDateRangeUTC(year, cycleMonth)

        const [txRes, userExp, sysExp, subcats] = await Promise.all([
            supabase
                .from('transactions')
                .select(
                    'amount, currency_code, transaction_type, expense_category_id, subcategory_id, savings_goal_id, loan_id, metadata'
                )
                .eq('user_id', user.id)
                .gte('transaction_date', startIso)
                .lte('transaction_date', endIso),
            supabase.from('expense_categories').select('id, name, parent_category_id').eq('user_id', user.id),
            supabase.from('expense_categories').select('id, name, parent_category_id').is('user_id', null),
            supabase.from('subcategories').select('id, name, parent_category_id'),
        ])

        const allCats = [
            ...(userExp.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(sysExp.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
            ...(subcats.data || []).map((c: any) => ({ id: c.id, name: c.name, parent_id: c.parent_category_id })),
        ]
        const catIndex = buildCategoryIndex(allCats)

        const txs = (txRes.data || []).filter((t: any) => {
            const meta = t.metadata
            if (meta && (meta.mode === 'SCHEDULED' || meta.loanStatus === 'PENDING')) return false
            return true
        })

        let actualIncomeUSD = 0
        let actualIncomePEN = 0
        let actualExpenseUSD = 0
        let actualExpensePEN = 0

        for (const t of txs) {
            const amt = Number(t.amount || 0)
            if (t.transaction_type === 'INCOME') {
                if (t.currency_code === 'USD') actualIncomeUSD += amt
                else actualIncomePEN += amt
            } else if (t.transaction_type === 'EXPENSE' && !t.loan_id) {
                if (t.currency_code === 'USD') actualExpenseUSD += amt
                else actualExpensePEN += amt
            }
        }

        // Enrich each allocation with real spent amount in its currency
        const enrichedAllocations = allocations.map((alloc: any) => {
            const isUSD = Number(alloc.allocated_amount_usd || 0) > 0
            const targetCurrency = isUSD ? 'USD' : 'PEN'
            let actualSpent = 0

            if (alloc.goal_id) {
                for (const t of txs) {
                    if (
                        t.savings_goal_id === alloc.goal_id &&
                        t.transaction_type === 'SAVINGS_DEPOSIT' &&
                        (t.currency_code || 'PEN') === targetCurrency
                    ) {
                        actualSpent += Number(t.amount || 0)
                    }
                }
            } else if (alloc.subcategory_id || alloc.category_id) {
                const seedIds: string[] = []
                if (alloc.subcategory_id) {
                    seedIds.push(alloc.subcategory_id)
                } else if (alloc.category_id) {
                    seedIds.push(alloc.category_id)
                    const catName = catIndex.idToName[alloc.category_id]
                    if (catName) {
                        const key = catName.trim().toLowerCase()
                        if (catIndex.categoriesByName[key]) {
                            seedIds.push(...catIndex.categoriesByName[key])
                        }
                    }
                }
                const expanded = new Set(expandCategoryIds(seedIds, catIndex.allCategories))

                for (const t of txs) {
                    if (t.transaction_type !== 'EXPENSE' || t.loan_id) continue
                    if ((t.currency_code || 'PEN') !== targetCurrency) continue
                    const matched = alloc.subcategory_id
                        ? t.subcategory_id === alloc.subcategory_id
                        : Boolean(
                              (t.expense_category_id && expanded.has(t.expense_category_id)) ||
                                  (t.subcategory_id && expanded.has(t.subcategory_id))
                          )
                    if (matched) actualSpent += Number(t.amount || 0)
                }
            }

            return {
                ...alloc,
                actual_spent: Math.round(actualSpent * 100) / 100,
            }
        })

        // 50/30/20 Health Breakdown (PEN + USD combined proportionally per active currency)
        const calcRuleBreakdown = (currency: 'PEN' | 'USD') => {
            const totalInc = currency === 'PEN' ? Number(cycle.total_income_pen || 0) : Number(cycle.total_income_usd || 0)
            let essentials = 0
            let lifestyle = 0
            let savings = 0

            for (const a of enrichedAllocations) {
                const amt = currency === 'PEN' ? Number(a.allocated_amount_pen || 0) : Number(a.allocated_amount_usd || 0)
                if (amt <= 0) continue
                const isGoalOrSavings =
                    Boolean(a.goal_id) ||
                    a.category?.budget_rule === 'SAVINGS' ||
                    /ahorr|inversi|fondo/i.test(a.category?.name || '')
                if (isGoalOrSavings) savings += amt
                else if ((a.priority || 4) === 1) essentials += amt
                else lifestyle += amt
            }

            return {
                totalIncome: totalInc,
                essentials,
                lifestyle,
                savings,
                essentialsPct: totalInc > 0 ? (essentials / totalInc) * 100 : 0,
                lifestylePct: totalInc > 0 ? (lifestyle / totalInc) * 100 : 0,
                savingsPct: totalInc > 0 ? (savings / totalInc) * 100 : 0,
            }
        }

        return NextResponse.json({
            cycle: {
                ...cycle,
                allocations: enrichedAllocations,
            },
            moneyPool,
            audit: {
                actualIncomeUSD: Math.round(actualIncomeUSD * 100) / 100,
                actualIncomePEN: Math.round(actualIncomePEN * 100) / 100,
                actualExpenseUSD: Math.round(actualExpenseUSD * 100) / 100,
                actualExpensePEN: Math.round(actualExpensePEN * 100) / 100,
            },
            ruleBreakdown: {
                pen: calcRuleBreakdown('PEN'),
                usd: calcRuleBreakdown('USD'),
            },
        })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        console.error('[ZBB_PLANNING_CYCLE_GET]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// POST: Create a new planning cycle (optionally cloning previous cycle or pre-filling from last month's spending)
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { incomeUSD = 0, incomePEN = 0, period, incomeBreakdown = [], autoFillFrom } = await request.json()

        if (!period?.start || !period?.end || !period?.name) {
            return NextResponse.json({ error: 'Periodo inválido' }, { status: 400 })
        }

        const { data: cycle, error } = await supabase
            .from('zbb_planning_cycles')
            .insert({
                user_id: user.id,
                period_start: period.start.slice(0, 10),
                period_end: period.end.slice(0, 10),
                total_income_usd: Number(incomeUSD) || 0,
                total_income_pen: Number(incomePEN) || 0,
                income_breakdown: incomeBreakdown,
                status: 'draft',
                cycle_name: period.name,
            })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Optional Smart Auto-Fill
        if (autoFillFrom === 'previous_cycle') {
            const { data: prevCycle } = await supabase
                .from('zbb_planning_cycles')
                .select('id, allocations:zbb_allocations(*)')
                .eq('user_id', user.id)
                .neq('id', cycle.id)
                .order('period_start', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (prevCycle?.allocations?.length) {
                const cloned = prevCycle.allocations.map((a: any) => ({
                    user_id: user.id,
                    cycle_id: cycle.id,
                    category_id: a.category_id,
                    subcategory_id: a.subcategory_id,
                    goal_id: a.goal_id,
                    allocated_amount_pen: a.allocated_amount_pen,
                    allocated_amount_usd: a.allocated_amount_usd,
                    justification: a.justification,
                    priority: a.priority,
                }))
                await supabase.from('zbb_allocations').insert(cloned)
            }
        } else if (autoFillFrom === 'previous_spending') {
            const now = new Date()
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const prevRange = getMonthDateRangeUTC(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1)

            const { data: prevTxs } = await supabase
                .from('transactions')
                .select('amount, currency_code, expense_category_id')
                .eq('user_id', user.id)
                .eq('transaction_type', 'EXPENSE')
                .is('loan_id', null)
                .not('expense_category_id', 'is', null)
                .gte('transaction_date', prevRange.startIso)
                .lte('transaction_date', prevRange.endIso)

            const grouped = new Map<string, { pen: number; usd: number }>()
            for (const tx of prevTxs || []) {
                const catId = tx.expense_category_id
                const entry = grouped.get(catId) || { pen: 0, usd: 0 }
                if (tx.currency_code === 'USD') entry.usd += Number(tx.amount || 0)
                else entry.pen += Number(tx.amount || 0)
                grouped.set(catId, entry)
            }

            const rows = Array.from(grouped.entries())
                .filter(([, totals]) => totals.pen > 0 || totals.usd > 0)
                .slice(0, 12)
                .map(([catId, totals]) => ({
                    user_id: user.id,
                    cycle_id: cycle.id,
                    category_id: catId,
                    allocated_amount_pen: Math.round(totals.pen * 100) / 100,
                    allocated_amount_usd: totals.pen > 0 ? 0 : Math.round(totals.usd * 100) / 100,
                    justification: 'Basado en tu gasto real del mes pasado',
                    priority: 2,
                }))

            if (rows.length > 0) {
                await supabase.from('zbb_allocations').insert(rows)
            }
        }

        return NextResponse.json(cycle, { status: 201 })
    } catch (error: any) {
        if (error && (error.digest === 'DYNAMIC_SERVER_USAGE' || String(error).includes('Dynamic server usage'))) {
            throw error
        }
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE: Reset/Delete a draft cycle
export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Cycle ID required' }, { status: 400 })

    // Clean up allocations first
    await supabase.from('zbb_allocations').delete().eq('cycle_id', id).eq('user_id', user.id)

    const { error } = await supabase
        .from('zbb_planning_cycles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

// PUT: Update planned income of an existing cycle
export async function PUT(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, incomeUSD = 0, incomePEN = 0, incomeBreakdown = [] } = await request.json()
    if (!id) return NextResponse.json({ error: 'Cycle ID required' }, { status: 400 })

    const { data, error } = await supabase
        .from('zbb_planning_cycles')
        .update({
            total_income_usd: Number(incomeUSD) || 0,
            total_income_pen: Number(incomePEN) || 0,
            income_breakdown: incomeBreakdown,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
