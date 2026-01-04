import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ZBBCalculator } from '@/lib/planning/zbb-calculator'

// Schema for Creating a Cycle
interface CreateCycleBody {
    incomeUSD: number
    incomePEN: number
    period: {
        start: string
        end: string
        name: string
    }
}

// GET: Fetch Cycles (Active, Specific, or List)
export async function GET(request: Request) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') // 'list' or undefined (default: single)
    const month = searchParams.get('month') // yyyy-MM

    // mode: LIST (for dropdowns)
    if (view === 'list') {
        const { data, error } = await supabase
            .from('zbb_planning_cycles')
            .select('id, cycle_name, period_start, period_end, status')
            .order('period_start', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    }

    // mode: SINGLE (Active or History)
    let query = supabase.from('zbb_planning_cycles').select(`
            *,
            allocations: zbb_allocations (
                *,
                category: expense_categories (*),
                goal: savings_goals (*)
            )
        `)

    if (month) {
        // Fetch specific month: e.g. 2025-12
        // We look for a cycle that STARTS in this month. 
        // Best proxy: period_start starts with 'yyyy-MM'
        const start = `${month}-01`
        const end = `${month}-31` // Loose range, or just use GTE/LTE
        // Better: extract year/month
        query = query.gte('period_start', start).lte('period_start', end)
    } else {
        // Default: Current Active (or latest)
        // Just order by date desc limit 1, but preferably current month
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        query = query.gte('period_start', startOfMonth)
    }

    const { data: cycle, error } = await query
        .order('period_start', { ascending: false })
        .limit(1)
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!cycle) {
        return NextResponse.json({ message: "No cycle found" }, { status: 404 })
    }

    // Calculate Dynamic Pool
    const moneyPool = ZBBCalculator.calculateMoneyPool(
        cycle.total_income_usd,
        cycle.total_income_pen,
        cycle.allocations || []
    )

    // --- INCOME AUDIT: Calculate Actual Income from Transactions ---
    // We sum all INCOME transactions within the cycle period
    const start = cycle.period_start
    const end = cycle.period_end // Ensure you have period_end, usually calculated or stored

    // If period_end is missing (legacy), calculate end of month from start
    const startDate = new Date(start)
    const endDate = cycle.period_end ? new Date(cycle.period_end) : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

    // Query Actuals
    const { data: actuals } = await supabase
        .from('transactions')
        .select('amount, currency')
        .eq('user_id', cycle.user_id)
        .eq('type', 'INCOME')
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString())

    // Sum Actuals
    let actualIncomeUSD = 0
    let actualIncomePEN = 0

    if (actuals) {
        actuals.forEach((t: any) => {
            if (t.currency === 'USD') actualIncomeUSD += t.amount
            if (t.currency === 'PEN') actualIncomePEN += t.amount
        })
    }

    return NextResponse.json({
        cycle,
        moneyPool,
        audit: {
            actualIncomeUSD,
            actualIncomePEN
        }
    })
}

// POST: Crear un nuevo ciclo (Iniciar Planificación)
export async function POST(request: Request) {
    const supabase = await createClient()
    const { incomeUSD, incomePEN, period, incomeBreakdown } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Create Cycle
    const { data, error } = await supabase
        .from('zbb_planning_cycles')
        .insert({
            user_id: user.id,
            period_start: period.start,
            period_end: period.end,
            total_income_usd: incomeUSD,
            total_income_pen: incomePEN,
            income_breakdown: incomeBreakdown, // Save the list
            status: 'draft',
            cycle_name: period.name // e.g. "Enero 2026"
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}

// DELETE: Reiniciar/Eliminar el ciclo activo (Para volver a empezar)
export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Delete the most recent cycle for simplicity (or pass ID via params if needed later)
    // For now, we assume one active cycle per month/period logic, so deleting the "active" or "draft" one.
    // Let's safe delete by ID if passed, or just delete the latest one.

    // Easier: Just delete the one provided in the query param "id"
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: "Cycle ID required" }, { status: 400 })

    const { error } = await supabase
        .from('zbb_planning_cycles')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}

// PUT: Actualizar Ingresos de un ciclo existente
export async function PUT(request: Request) {
    const supabase = await createClient()
    const { id, incomeUSD, incomePEN, incomeBreakdown } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
        .from('zbb_planning_cycles')
        .update({
            total_income_usd: incomeUSD,
            total_income_pen: incomePEN,
            income_breakdown: incomeBreakdown,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
}
