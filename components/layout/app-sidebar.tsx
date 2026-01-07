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
    Banknote,
    ChevronLeft,
    Menu,
    LogOut,
    UserCircle,
    Bell
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUser } from "@/hooks/use-user"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "flat"
}

export function Sidebar({ className, variant = "default" }: SidebarProps) {
    const pathname = usePathname()
    const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore()
    const { profile } = useUser()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const routes = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
        { label: "Análisis", icon: BarChart3, href: "/dashboard/analysis", color: "text-indigo-500" },
        { label: "Transacciones", icon: ArrowRightLeft, href: "/dashboard/transactions", color: "text-violet-500" },
        { label: "Cuentas", icon: Wallet, href: "/dashboard/accounts", color: "text-pink-700" },
        { label: "Presupuestos", icon: PieChart, href: "/dashboard/budgets", color: "text-orange-700" },
        { label: "Préstamos", icon: HandCoins, href: "/dashboard/loans", color: "text-amber-600" },
        { label: "Caja Chica", icon: Banknote, href: "/dashboard/petty-cash", color: "text-emerald-600" },
        { label: "Planificación", icon: Target, href: "/dashboard/planning", color: "text-cyan-500" },
        { label: "Metas", icon: Target, href: "/dashboard/savings-goals", color: "text-rose-500" },
        { label: "Reportes", icon: BarChart3, href: "/dashboard/reports", color: "text-purple-500" },
    ]

    const configRoutes = [
        { label: "Configuración", icon: Settings, href: "/dashboard/settings", color: "text-slate-500" },
    ]

    return (
        <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 80 : 280 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                // Premium Color Block Style
                "bg-primary text-primary-foreground dark:bg-[#09090b] dark:text-foreground dark:border-r dark:border-white/10",
                variant === "default" && "rounded-r-[2.5rem] shadow-2xl",
                !sidebarCollapsed || variant === "flat" ? "w-72" : "w-[90px]",
                className
            )}
        >
            {/* --- HEADER --- */}
            <div className={cn(
                "flex h-24 items-center transition-all duration-300 z-10",
                sidebarCollapsed ? "justify-center" : "px-6 justify-between"
            )}>
                {/* ... Header content remains ... */}
                <AnimatePresence mode="wait">
                    {!sidebarCollapsed ? (
                        <motion.div
                            key="expanded-header"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center justify-between w-full pt-4"
                        >
                            <Link className="flex items-center gap-3 group" href="/dashboard">
                                <div className="relative">
                                    {/* Logo filter to ensure visibility on primary color */}
                                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <img src="/logo-dark.png" alt="Lumio" className="h-10 w-auto brightness-0 invert relative z-10" />
                                </div>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarCollapsed(true)}
                                className="h-8 w-8 rounded-full hover:bg-white/20 text-primary-foreground/70 hover:text-white transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed-header"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="pt-4"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarCollapsed(false)}
                                className="h-10 w-10 rounded-xl hover:bg-white/20 text-primary-foreground transition-all"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- NAVIGATION --- */}
            <ScrollArea className="flex-1 px-3 py-4">
                <TooltipProvider delayDuration={0}>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <NavItem key={route.href} route={route} collapsed={sidebarCollapsed} pathname={pathname} />
                        ))}
                    </div>

                    <div className="my-4 px-2">
                        <Separator className="bg-primary-foreground/20" />
                    </div>

                    <div className="space-y-1">
                        {configRoutes.map((route) => (
                            <NavItem key={route.href} route={route} collapsed={sidebarCollapsed} pathname={pathname} />
                        ))}
                    </div>
                </TooltipProvider>
            </ScrollArea>

            {/* --- FOOTER (User & Tools) --- */}
            {/* Darker shade of primary or transparent for footer */}
            {/* --- FOOTER removed for Header Migration --- */}
        </motion.div>
    )
}

// Subcomponent for cleaner rendering
function NavItem({ route, collapsed, pathname }: { route: any, collapsed: boolean, pathname: string | null }) {
    const isActive = route.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname?.startsWith(route.href!)

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    href={route.href}
                    className={cn(
                        "group relative flex items-center rounded-xl px-3 py-2.5 font-medium transition-all duration-300 ease-out",
                        collapsed ? "justify-center w-12 mx-auto" : "w-full justify-start gap-4",
                        isActive
                            ? "bg-background text-primary shadow-xl" // Active: White bg (or dark in dark mode), primary text
                            : "text-primary-foreground/70 hover:bg-white/10 hover:text-white" // Inactive: Transparent, light text
                    )}
                >
                    {isActive && (
                        <motion.div
                            layoutId="activeStrip"
                            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" // Strip inside active item
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    )}

                    <route.icon className={cn(
                        "h-5 w-5 transition-transform duration-300",
                        isActive ? "scale-110" : "group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        // Colors handled by parent text color
                    )} />

                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="truncate text-sm tracking-wide"
                        >
                            {route.label}
                        </motion.span>
                    )}
                </Link>
            </TooltipTrigger>
            {collapsed && (
                <TooltipContent
                    side="right"
                    className="bg-primary text-primary-foreground font-medium text-xs px-3 py-1.5 rounded-lg ml-2"
                >
                    {route.label}
                </TooltipContent>
            )}
        </Tooltip>
    )
}
