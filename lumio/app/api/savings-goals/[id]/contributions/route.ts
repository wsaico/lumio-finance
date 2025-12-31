import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/savings-goals/[id]/contributions
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const goalId = params.id

        // Verify goal belongs to user
        const { data: goal } = await supabase
            .from('savings_goals')
            .select('id')
            .eq('id', goalId)
            .eq('user_id', user.id)
            .single()

        if (!goal) {
            return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 })
        }

        // Get contributions (simplified query without transaction join for now)
        const { data: contributions, error } = await supabase
            .from('goal_contributions')
            .select('*')
            .eq('goal_id', goalId)
            .order('contribution_date', { ascending: false })

        if (error) {
            console.error('Error fetching contributions:', error)
            return NextResponse.json({ error: 'Error al obtener las contribuciones' }, { status: 500 })
        }

        return NextResponse.json({ contributions })
    } catch (error: any) {
        console.error('Error in GET /api/savings-goals/[id]/contributions:', error)
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
    }
}
