"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/app-sidebar"
import { SafeHeader as Header } from "@/components/layout/safe-header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { WelcomeWizard } from "@/components/onboarding/welcome-wizard"
import { GuidedTour } from "@/components/onboarding/guided-tour"
import { DemoModeBanner } from "@/components/layout/demo-mode-banner"
import { PinLockOverlay } from "@/components/security/pin-lock-overlay"
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts-provider"
import { GlobalSmartFab } from "@/components/layout/global-smart-fab"
import { AppFooter } from "@/components/layout/app-footer"
import { PWAInstallBanner } from "@/components/pwa/pwa-provider"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export default function DashboardLayoutClient({
    children,
    shouldShowWizard,
}: {
    children: React.ReactNode
    shouldShowWizard: boolean
}) {
    const { sidebarCollapsed } = useSettingsStore()
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    return (
        <KeyboardShortcutsProvider>
            <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/20 relative">
                <PinLockOverlay />
                <WelcomeWizard shouldShow={shouldShowWizard} />
                <GuidedTour />

                {/* Desktop Curved Sidebar */}
                <div className="hidden lg:block">
                    <Sidebar className="fixed inset-y-0 left-0 z-50" />
                </div>

                <motion.div
                    initial={false}
                    animate={{
                        paddingLeft: isMobile ? 0 : sidebarCollapsed ? 84 : 260,
                    }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col min-h-screen relative w-full"
                >
                    <Header />
                    <main
                        className={cn(
                            "flex-1 px-3 sm:px-4 pt-2 sm:pt-3 pb-24 md:px-6 lg:px-8 lg:pb-10 max-w-7xl w-full mx-auto space-y-3 sm:space-y-4 overflow-x-clip"
                        )}
                    >
                        <DemoModeBanner />
                        <PWAInstallBanner />
                        {children}
                    </main>
                    <div className="hidden lg:block">
                        <AppFooter />
                    </div>
                </motion.div>

                {/* Mobile Native-App Bottom Navigation */}
                <div className="lg:hidden">
                    <MobileNav />
                </div>

                {/* Desktop Quick FAB */}
                <GlobalSmartFab />
            </div>
        </KeyboardShortcutsProvider>
    )
}
