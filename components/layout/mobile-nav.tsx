
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ArrowRightLeft, PieChart, User, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function MobileNav() {
    const pathname = usePathname()

    const routes = [
        {
            label: "Inicio",
            icon: Home,
            href: "/dashboard",
        },
        {
            label: "Transacciones",
            icon: ArrowRightLeft,
            href: "/dashboard/transactions",
        },
        {
            label: "Presupuestos",
            icon: PieChart,
            href: "/dashboard/budgets",
        },
        {
            label: "Perfil",
            icon: User,
            href: "/dashboard/settings",
        },
    ]

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border bg-background/80 p-1.5 shadow-lg backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 md:hidden">
            <div className="flex items-center justify-between px-4">
                {/* First 2 items */}
                {routes.slice(0, 2).map((route) => {
                    const isActive = pathname === route.href
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 p-1 px-2 text-[11px] font-medium transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <route.icon className={cn("h-5 w-5 transition-all", isActive && "fill-current")} />
                            <span className="truncate hidden xs:block">{route.label}</span>
                        </Link>
                    )
                })}

                {/* FAB Spacer - Only visible when FAB is visible */}
                {!pathname?.includes('/transactions/') &&
                    !pathname?.includes('/petty-cash/new-') &&
                    !pathname?.includes('/petty-cash/edit-') && (
                        <div className="w-16 h-10 flex-shrink-0" />
                    )}

                {/* Last 2 items */}
                {routes.slice(2).map((route) => {
                    const isActive = pathname === route.href
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex flex-col items-center gap-0.5 p-1 px-2 text-[11px] font-medium transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <route.icon className={cn("h-5 w-5 transition-all", isActive && "fill-current")} />
                            <span className="truncate hidden xs:block">{route.label}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
