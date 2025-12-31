import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/app-sidebar'
import { SafeHeader as Header } from "@/components/layout/safe-header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { BudgetMethodologyWizard } from '@/components/onboarding/budget-methodology-wizard'
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider'
import { GlobalSmartFab } from "@/components/layout/global-smart-fab"

import { SystemCheck } from '@/components/initialization/system-check'

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
        <KeyboardShortcutsProvider>
            <SystemCheck />
            <div className="min-h-screen bg-muted/20">
                {/* Wizard injected at Layout level, controlled by Server State */}
                <BudgetMethodologyWizard shouldShow={shouldShowWizard} />

                {/* Desktop Sidebar - Hidden on mobile */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
                    <Sidebar className="w-full" />
                </div>

                <div className="lg:pl-72 flex flex-col min-h-screen pb-20 lg:pb-0">
                    <Header />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
                        {children}
                    </main>
                </div>

                {/* Mobile Bottom Navigation - Visible only on mobile */}
                <div className="lg:hidden">
                    <MobileNav />
                </div>

                {/* Desktop Global FAB */}
                <GlobalSmartFab />
            </div>
        </KeyboardShortcutsProvider>
    )
}
