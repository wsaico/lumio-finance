"use client"

import { useState, useEffect } from "react"
import { Sidebar } from '@/components/layout/app-sidebar'
import { SafeHeader as Header } from "@/components/layout/safe-header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { BudgetMethodologyWizard } from '@/components/onboarding/budget-methodology-wizard'
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider'
import { GlobalSmartFab } from "@/components/layout/global-smart-fab"
import { SystemCheck } from '@/components/initialization/system-check'
import { SettingsEffects } from '@/components/settings/settings-effects'
import { AppFooter } from '@/components/layout/app-footer'
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

export default function DashboardLayoutClient({
    children,
    shouldShowWizard
}: {
    children: React.ReactNode,
    shouldShowWizard: boolean
}) {
    const { sidebarCollapsed } = useSettingsStore()
    const [isMobile, setIsMobile] = useState(false)
    const pathname = usePathname()
    const isDashboard = pathname === '/dashboard'

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return (
        <KeyboardShortcutsProvider>
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#09090b] overflow-x-hidden selection:bg-primary/10 relative">
                {/* Subtle Ambient Background - Radial Glows */}
                <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20 transition-opacity">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/20 blur-[120px] dark:bg-cyan-900/10" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-400/20 blur-[120px] dark:bg-rose-900/10" />
                </div>
                {/* Wizard injected at Layout level */}
                <BudgetMethodologyWizard shouldShow={shouldShowWizard} />

                {/* Desktop Sidebar */}
                <div className="hidden lg:block">
                    <Sidebar className="fixed inset-y-0 left-0 z-50" />
                </div>

                <motion.div
                    initial={false}
                    animate={{
                        paddingLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280)
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col min-h-screen relative w-full"
                >
                    <Header />
                    <main className={cn(
                        "flex-1 p-4 md:p-6 lg:p-8 animate-fade-in",
                        // Force shift if header is fixed
                        !isMobile && (sidebarCollapsed ? "ml-0" : "ml-0")
                    )}>
                        {children}
                    </main>
                    <AppFooter />
                </motion.div>

                {/* Mobile Bottom Navigation - Visible only on mobile */}
                <div className="lg:hidden">
                    <MobileNav />
                </div>

                {/* Global FAB */}
                <GlobalSmartFab />
            </div>
        </KeyboardShortcutsProvider>
    )
}
