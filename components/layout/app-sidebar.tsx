"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    BarChart3,
    LayoutDashboard,
    PieChart,
    Settings,
    Wallet,
    Target,
    ArrowRightLeft,
    HandCoins,
    ChevronLeft,
    ChevronRight,
    Menu,
    LogOut,
    Sparkles,
    FileSpreadsheet,
    Crown,
    ShieldCheck,
    CalendarClock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useUser } from "@/hooks/useUser"
import { useSystemBranding } from "@/hooks/useSystemBranding"
import { useQueryClient } from "@tanstack/react-query"
import { performSafeSignOut } from "@/lib/auth-cleanup"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "flat"
}

export function Sidebar({ className, variant = "default" }: SidebarProps) {
    const pathname = usePathname()
    const { sidebarCollapsed, setSidebarCollapsed, accentColor, hasCustomAccent } = useSettingsStore()
    const { profile, entitlements } = useUser()
    const branding = useSystemBranding()
    const queryClient = useQueryClient()
    const supabase = createClient()
    const effectiveAccent =
        (hasCustomAccent ? accentColor : branding.primaryColor) || accentColor || "#7C3AED"
    const isDefaultViolet = effectiveAccent.toUpperCase() === "#7C3AED"

    const darkLogo = branding.logoDarkUrl || "/icons/icon-dark.png"
    const whiteLogo = branding.logoWhiteUrl || "/icons/icon-white.png"
    const brandLabel = (branding.appName || "Lumio Finance").split(" ")[0] || "Lumio"

    const renderLogoMark = () =>
        isDefaultViolet ? (
            <img
                src={darkLogo}
                alt={branding.appName}
                className="h-10 w-10 rounded-2xl object-cover shadow-lg ring-1 ring-white/20 group-hover:scale-105 transition-transform shrink-0"
            />
        ) : (
            <div className="h-10 w-10 rounded-2xl bg-white/18 dark:bg-white/12 ring-1 ring-white/30 p-1.5 shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img
                    src={whiteLogo}
                    alt={branding.appName}
                    className="h-full w-full object-contain"
                />
            </div>
        )

    const handleLogout = async () => {
        await performSafeSignOut(supabase, queryClient)
    }

    const routes = [
        { label: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
        { label: "Movimientos", icon: ArrowRightLeft, href: "/dashboard/transactions" },
        { label: "Programados", icon: CalendarClock, href: "/dashboard/subscriptions" },
        { label: "Mis cuentas", icon: Wallet, href: "/dashboard/accounts" },
        { label: "Presupuestos", icon: PieChart, href: "/dashboard/budgets" },
        { label: "Préstamos", icon: HandCoins, href: "/dashboard/loans" },
        { label: "Planificación", icon: Sparkles, href: "/dashboard/planning" },
        { label: "Metas de ahorro", icon: Target, href: "/dashboard/savings-goals" },
        { label: "Análisis", icon: BarChart3, href: "/dashboard/analysis" },
        { label: "Reportes", icon: FileSpreadsheet, href: "/dashboard/reports" },
    ]

    const configRoutes = [
        { label: "Suscripción", icon: Crown, href: "/dashboard/billing" },
        { label: "Ajustes", icon: Settings, href: "/dashboard/settings" },
        ...(profile?.isAdmin
            ? [{ label: "Panel Admin", icon: ShieldCheck, href: "/dashboard/admin" }]
            : []),
    ]

    return (
        <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed && variant !== "flat" ? 84 : 260 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "relative bg-sidebar text-sidebar-foreground flex flex-col h-screen select-none",
                variant === "default" &&
                    "rounded-r-[2.25rem] shadow-2xl shadow-primary/15 dark:border-r dark:border-sidebar-border",
                !sidebarCollapsed || variant === "flat" ? "w-[260px]" : "w-[84px]",
                className
            )}
        >
            {/* HEADER WITH LOGO & SINGLE INSIDE TOGGLE */}
            <div
                className={cn(
                    "flex items-center transition-all duration-300 z-10",
                    sidebarCollapsed && variant !== "flat" ? "justify-center py-4" : "h-20 px-5 justify-between"
                )}
            >
                <AnimatePresence mode="wait">
                    {!sidebarCollapsed || variant === "flat" ? (
                        <motion.div
                            key="expanded-header"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center justify-between gap-2 w-full pt-1"
                        >
                            <Link className="flex items-center gap-3 group min-w-0" href="/dashboard">
                                {renderLogoMark()}
                                <div className="flex flex-col min-w-0">
                                    <span className="font-extrabold text-lg tracking-tight text-sidebar-foreground leading-tight truncate">
                                        {brandLabel}
                                    </span>
                                    <span className="text-[10px] text-sidebar-foreground/75 font-semibold tracking-widest uppercase">
                                        {entitlements?.isTrial
                                            ? `Prueba · ${entitlements.trialDaysRemaining}d`
                                            : entitlements?.isPremium
                                              ? "Premium"
                                              : "Básico"}
                                    </span>
                                </div>
                            </Link>
                            {variant !== "flat" && (
                                <button
                                    type="button"
                                    onClick={() => setSidebarCollapsed(true)}
                                    aria-label="Retraer menú"
                                    title="Retraer menú"
                                    className="hidden lg:flex h-8 w-8 rounded-xl bg-sidebar-foreground/10 hover:bg-sidebar-foreground/20 text-sidebar-foreground/85 hover:text-sidebar-foreground items-center justify-center transition-all active:scale-95 shrink-0 cursor-pointer"
                                >
                                    <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed-header"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center gap-2.5"
                        >
                            <Link
                                href="/dashboard"
                                title="Lumio Finance"
                                aria-label="Ir al inicio"
                                className="group block"
                            >
                                {renderLogoMark()}
                            </Link>
                            <button
                                type="button"
                                onClick={() => setSidebarCollapsed(false)}
                                aria-label="Ampliar menú"
                                title="Ampliar menú"
                                className="hidden lg:flex h-7 w-7 rounded-xl bg-sidebar-foreground/12 hover:bg-sidebar-foreground/22 text-sidebar-foreground items-center justify-center transition-all active:scale-95 cursor-pointer"
                            >
                                <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* NAVIGATION */}
            <ScrollArea className="flex-1 px-3 py-3">
                <TooltipProvider delayDuration={0}>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <NavItem
                                key={route.href}
                                route={route}
                                collapsed={sidebarCollapsed && variant !== "flat"}
                                pathname={pathname}
                            />
                        ))}
                    </div>

                    <div className="my-4 px-3">
                        <Separator className="bg-white/15" />
                    </div>

                    <div className="space-y-1">
                        {configRoutes.map((route) => (
                            <NavItem
                                key={route.href}
                                route={route}
                                collapsed={sidebarCollapsed && variant !== "flat"}
                                pathname={pathname}
                            />
                        ))}
                    </div>
                </TooltipProvider>
            </ScrollArea>


            {/* FOOTER / LOGOUT */}
            <div className="p-3 border-t border-sidebar-border">
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleLogout}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/15 transition-all text-sm font-semibold",
                                    sidebarCollapsed && variant !== "flat" && "justify-center px-0"
                                )}
                            >
                                <LogOut className="h-5 w-5" />
                                {(!sidebarCollapsed || variant === "flat") && (
                                    <span>Cerrar sesión</span>
                                )}
                            </button>
                        </TooltipTrigger>
                        {sidebarCollapsed && variant !== "flat" && (
                            <TooltipContent
                                side="right"
                                className="bg-popover text-popover-foreground rounded-xl text-xs px-2.5 py-1"
                            >
                                Cerrar sesión
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </div>
        </motion.div>
    )
}

function NavItem({
    route,
    collapsed,
    pathname,
}: {
    route: any
    collapsed: boolean
    pathname: string | null
}) {
    const isActive =
        route.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname?.startsWith(route.href!)

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={route.href}
                    className={cn(
                        "group relative flex items-center rounded-2xl px-3.5 py-2.5 font-semibold transition-all duration-200",
                        collapsed ? "justify-center w-11 h-11 mx-auto p-0" : "w-full justify-start gap-3.5",
                        isActive
                            ? "bg-card text-primary shadow-lg shadow-black/10 dark:bg-primary/20 dark:text-white dark:shadow-none"
                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/15"
                    )}
                >
                    <route.icon
                        className={cn(
                            "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                            isActive
                                ? "scale-105 text-primary dark:text-white"
                                : "group-hover:scale-105 text-sidebar-foreground/85"
                        )}
                    />

                    {!collapsed && <span className="truncate text-sm">{route.label}</span>}
                </Link>
            </TooltipTrigger>
            {collapsed && (
                <TooltipContent
                    side="right"
                    className="bg-popover text-popover-foreground font-semibold text-xs px-3 py-1.5 rounded-xl ml-2 shadow-xl border border-border"
                >
                    {route.label}
                </TooltipContent>
            )}
        </Tooltip>
    )
}
