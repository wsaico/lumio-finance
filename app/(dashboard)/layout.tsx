export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutClient from './layout-client'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Professional Best Practice: Fetch critical user state on the server (Layout)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check Preference for Wizard
    const { data: profile } = await supabase
        .from('profiles')
        .select('budgeting_method')
        .eq('id', user.id)
        .single()

    // Show wizard if NO method is set
    const shouldShowWizard = !profile?.budgeting_method

    return (
        <DashboardLayoutClient shouldShowWizard={shouldShowWizard}>
            {children}
        </DashboardLayoutClient>
    )
}
