import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/savings-goals/analytics
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Get all active goals
        const { data: goals } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('user_id', user.id)
            .in('status', ['ACTIVE', 'COMPLETED'])

        if (!goals) {
            return NextResponse.json({
                totalSaved: 0,
                totalTarget: 0,
                activeGoals: 0,
                completedGoals: 0,
                avgProgress: 0,
                avgMonthlyContribution: 0,
                upcomingMilestones: []
            })
        }

        // Calculate analytics
        const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0)
        const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0)
        const activeGoals = goals.filter(g => g.status === 'ACTIVE').length
        const completedGoals = goals.filter(g => g.status === 'COMPLETED').length

        const avgProgress = goals.length > 0
            ? goals.reduce((sum, g) => sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / goals.length
            : 0

        // Calculate average monthly contribution across all goals
        const today = new Date()
        let totalMonthlyContribution = 0
        goals.forEach(goal => {
            const startDate = new Date(goal.start_date)
            const monthsElapsed = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
            totalMonthlyContribution += Number(goal.current_amount) / monthsElapsed
        })
        const avgMonthlyContribution = goals.length > 0 ? totalMonthlyContribution / goals.length : 0

        // Get upcoming milestones (goals close to next milestone)
        const upcomingMilestones = goals
            .filter(g => g.status === 'ACTIVE')
            .map(g => {
                const progress = (Number(g.current_amount) / Number(g.target_amount)) * 100
                let nextMilestone = null
                let percentToNext = 0

                if (progress < 25) {
                    nextMilestone = '25%'
                    percentToNext = 25 - progress
                } else if (progress < 50) {
                    nextMilestone = '50%'
                    percentToNext = 50 - progress
                } else if (progress < 75) {
                    nextMilestone = '75%'
                    percentToNext = 75 - progress
                } else if (progress < 100) {
                    nextMilestone = '100%'
                    percentToNext = 100 - progress
                }

                return {
                    goalId: g.id,
                    goalName: g.name,
                    currentProgress: Math.round(progress * 100) / 100,
                    nextMilestone,
                    percentToNext: Math.round(percentToNext * 100) / 100,
                    amountToNext: (percentToNext / 100) * Number(g.target_amount)
                }
            })
            .filter(m => m.nextMilestone !== null)
            .sort((a, b) => a.percentToNext - b.percentToNext)
            .slice(0, 5) // Top 5 closest to milestone

        // Account allocation breakdown
        const { data: accountLinks } = await supabase
            .from('savings_goals')
            .select(`
                primary_account_id,
                current_amount,
                primary_account:accounts!primary_account_id(id, name)
            `)
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .not('primary_account_id', 'is', null)

        const accountAllocation: any = {}
        accountLinks?.forEach((link: any) => {
            const accountId = link.primary_account_id
            if (!accountAllocation[accountId]) {
                accountAllocation[accountId] = {
                    accountId,
                    accountName: link.primary_account?.name || 'Unknown',
                    totalAllocated: 0
                }
            }
            accountAllocation[accountId].totalAllocated += Number(link.current_amount)
        })

        return NextResponse.json({
            totalSaved: Math.round(totalSaved * 100) / 100,
            totalTarget: Math.round(totalTarget * 100) / 100,
            activeGoals,
            completedGoals,
            avgProgress: Math.round(avgProgress * 100) / 100,
            avgMonthlyContribution: Math.round(avgMonthlyContribution * 100) / 100,
            upcomingMilestones,
            accountAllocation: Object.values(accountAllocation)
        })
    } catch (error: any) {
        console.error('Error in GET /api/savings-goals/analytics:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
