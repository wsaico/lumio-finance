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
import { useSettingsStore } from '@/hooks/use-settings-store'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardLayoutClient({
    children,
    shouldShowWizard
}: {
    children: React.ReactNode,
    shouldShowWizard: boolean
}) {
    const { sidebarCollapsed } = useSettingsStore()
    const [isMobile, setIsMobile] = useState(false)

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
            <div className="min-h-screen bg-muted/20">
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
                    className="flex flex-col min-h-screen relative"
                >
                    <Header />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
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
