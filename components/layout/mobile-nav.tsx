
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
            // Placeholder for FAB
            label: "Nuevo",
            icon: PlusCircle,
            href: "#",
            isFab: true
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
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border bg-background/80 p-2 shadow-lg backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around">
                {routes.map((route) => {
                    if (route.isFab) {
                        return (
                            <div key="fab" className="-mt-8">
                                <Link href="/transactions/new">
                                    <Button size="icon" className="h-14 w-14 rounded-full shadow-xl shadow-primary/30 bg-primary text-primary-foreground">
                                        <PlusCircle className="h-7 w-7" />
                                    </Button>
                                </Link>
                            </div>
                        )
                    }
                    const isActive = pathname === route.href
                    return (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 text-xs font-medium transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <route.icon className={cn("h-6 w-6", isActive && "fill-current")} />
                            {/* <span className="sr-only">{route.label}</span> */}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
