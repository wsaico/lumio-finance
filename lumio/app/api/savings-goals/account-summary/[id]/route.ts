import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/savings-goals/account-summary/[id]
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const accountId = params.id

        // Verify account belongs to user
        const { data: account } = await supabase
            .from('accounts')
            .select('id, name, balance, account_type')
            .eq('id', accountId)
            .eq('user_id', user.id)
            .single()

        if (!account) {
            return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
        }

        // Get all goals linked to this account
        const { data: goals, error } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('primary_account_id', accountId)
            .in('status', ['ACTIVE', 'COMPLETED'])
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching account goals:', error)
            return NextResponse.json({ error: 'Error al obtener las metas' }, { status: 500 })
        }

        // Calculate totals
        const totalAllocated = goals?.reduce((sum, g) => sum + Number(g.current_amount), 0) || 0
        const totalTarget = goals?.reduce((sum, g) => sum + Number(g.target_amount), 0) || 0
        const activeGoals = goals?.filter(g => g.status === 'ACTIVE').length || 0
        const completedGoals = goals?.filter(g => g.status === 'COMPLETED').length || 0

        // Calculate available balance (account balance - allocated to goals)
        const availableBalance = Number(account.balance) - totalAllocated

        return NextResponse.json({
            account,
            goals: goals || [],
            summary: {
                totalAllocated: Math.round(totalAllocated * 100) / 100,
                totalTarget: Math.round(totalTarget * 100) / 100,
                availableBalance: Math.round(availableBalance * 100) / 100,
                activeGoals,
                completedGoals,
                allocationPercentage: account.balance > 0
                    ? Math.round((totalAllocated / Number(account.balance)) * 10000) / 100
                    : 0
            }
        })
    } catch (error: any) {
        console.error('Error in GET /api/savings-goals/account-summary/[id]:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
