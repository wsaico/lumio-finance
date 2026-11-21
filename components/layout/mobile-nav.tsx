"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    ArrowRightLeft,
    Wallet,
    PieChart,
    Plus,
    TrendingDown,
    TrendingUp,
    Target,
} from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_ACTIONS = [
    {
        label: "Gasto",
        href: "/dashboard/transactions/new?type=EXPENSE",
        icon: TrendingDown,
        bg: "bg-rose-500 text-white shadow-rose-500/35",
        x: -108,
        y: -44,
    },
    {
        label: "Ingreso",
        href: "/dashboard/transactions/new?type=INCOME",
        icon: TrendingUp,
        bg: "bg-emerald-500 text-white shadow-emerald-500/35",
        x: -40,
        y: -104,
    },
    {
        label: "Transferir",
        href: "/dashboard/transactions/new?type=TRANSFER",
        icon: ArrowRightLeft,
        bg: "bg-indigo-500 text-white shadow-indigo-500/35",
        x: 40,
        y: -104,
    },
    {
        label: "Meta",
        href: "/dashboard/savings-goals/new",
        icon: Target,
        bg: "bg-amber-500 text-white shadow-amber-500/35",
        x: 108,
        y: -44,
    },
] as const

export function MobileNav() {
    const pathname = usePathname()
    const [isQuickOpen, setIsQuickOpen] = useState(false)

    useEffect(() => {
        setIsQuickOpen(false)
    }, [pathname])

    useEffect(() => {
        if (!isQuickOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsQuickOpen(false)
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isQuickOpen])

    // Hide on full-screen transaction editor
    if (
        pathname?.includes("/transactions/new") ||
        /\/dashboard\/transactions\/[^/]+$/.test(pathname || "")
    ) {
        return null
    }

    const leftRoutes = [
        { label: "Inicio", icon: LayoutDashboard, href: "/dashboard" },
        { label: "Movimientos", icon: ArrowRightLeft, href: "/dashboard/transactions" },
    ]

    const rightRoutes = [
        { label: "Cuentas", icon: Wallet, href: "/dashboard/accounts" },
        { label: "Presupuestos", icon: PieChart, href: "/dashboard/budgets" },
    ]

    const renderLink = (route: { label: string; icon: any; href: string }) => {
        const isActive =
            route.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(route.href)

        return (
            <Link
                key={route.href}
                href={route.href}
                onClick={() => setIsQuickOpen(false)}
                className={cn(
                    "flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all flex-1 min-w-0",
                    isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground font-medium"
                )}
            >
                <div
                    className={cn(
                        "h-8 w-11 rounded-full flex items-center justify-center transition-all",
                        isActive && "bg-primary/12"
                    )}
                >
                    <route.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                </div>
                <span className="text-[10px] tracking-tight truncate">{route.label}</span>
            </Link>
        )
    }

    return (
        <>
            <AnimatePresence>
                {isQuickOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setIsQuickOpen(false)}
                        className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            <nav
                aria-label="Navegación móvil"
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur-xl px-2 pt-1.5 pb-safe shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.08)] lg:hidden"
            >
                <div className="flex items-center justify-between max-w-md mx-auto relative">
                    {leftRoutes.map(renderLink)}

                    {/* Center Native-App Quick Add Button with Radial Speed-Dial */}
                    <div className="relative px-2 -mt-7 flex items-center justify-center">
                        <AnimatePresence>
                            {isQuickOpen &&
                                QUICK_ACTIONS.map((item, idx) => (
                                    <motion.div
                                        key={item.label}
                                        initial={{
                                            opacity: 0,
                                            scale: 0.3,
                                            x: "-50%",
                                            y: "-50%",
                                        }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            x: `calc(-50% + ${item.x}px)`,
                                            y: `calc(-50% + ${item.y}px)`,
                                        }}
                                        exit={{
                                            opacity: 0,
                                            scale: 0.3,
                                            x: "-50%",
                                            y: "-50%",
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 380,
                                            damping: 24,
                                            delay: idx * 0.035,
                                        }}
                                        className="absolute left-1/2 top-1/2 z-50"
                                    >
                                        <Link
                                            href={item.href}
                                            onClick={() => setIsQuickOpen(false)}
                                            className="flex flex-col items-center group"
                                        >
                                            <span
                                                className={cn(
                                                    "h-12 w-12 rounded-full flex items-center justify-center shadow-xl transition-transform group-hover:scale-105 active:scale-95 ring-2 ring-white/25",
                                                    item.bg
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 stroke-[2.25]" />
                                            </span>
                                            <span className="text-[10px] font-bold bg-card/95 border border-border/60 text-foreground px-2 py-0.5 rounded-full shadow-md mt-1 whitespace-nowrap">
                                                {item.label}
                                            </span>
                                        </Link>
                                    </motion.div>
                                ))}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={() => setIsQuickOpen((v) => !v)}
                            aria-expanded={isQuickOpen}
                            aria-label={isQuickOpen ? "Cerrar accesos directos" : "Abrir accesos directos"}
                            className="relative z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/35 ring-4 ring-background transition-transform active:scale-95"
                        >
                            <motion.span
                                animate={{ rotate: isQuickOpen ? 45 : 0 }}
                                transition={{ type: "spring", stiffness: 360, damping: 22 }}
                                className="flex items-center justify-center"
                            >
                                <Plus className="h-7 w-7 stroke-[2.75]" />
                            </motion.span>
                        </button>
                    </div>

                    {rightRoutes.map(renderLink)}
                </div>
            </nav>
        </>
    )
}
