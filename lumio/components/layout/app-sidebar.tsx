
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
    BarChart3,
    CreditCard,
    Home,
    LayoutDashboard,
    PieChart,
    Settings,
    Wallet,
    LogOut,
    Target,
    ArrowRightLeft,
    HandCoins,
    Banknote
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut()
            toast.success("Has cerrado sesión correctamente")
            router.push("/login")
            router.refresh()
        } catch (error) {
            toast.error("Error al cerrar sesión")
        }
    }

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/dashboard",
            color: "text-sky-500",
        },
        {
            label: "Transacciones",
            icon: ArrowRightLeft,
            href: "/dashboard/transactions",
            color: "text-violet-500",
        },
        {
            label: "Cuentas",
            icon: Wallet,
            href: "/dashboard/accounts",
            color: "text-pink-700",
        },
        {
            label: "Presupuestos",
            icon: PieChart,
            href: "/dashboard/budgets",
            color: "text-orange-700",
        },
        {
            label: "Préstamos",
            icon: HandCoins,
            href: "/dashboard/loans",
            color: "text-amber-600",
        },
        {
            label: "Caja Chica",
            icon: Banknote,
            href: "/dashboard/petty-cash",
            color: "text-indigo-600",
        },
        {
            label: "Metas de Ahorro",
            icon: Target,
            href: "/dashboard/savings-goals",
            color: "text-emerald-500",
        },
        {
            label: "Reportes",
            icon: BarChart3,
            href: "/dashboard/reports",
            color: "text-rose-500",
        },
        {
            label: "Configuración",
            icon: Settings,
            href: "/dashboard/settings",
        },
    ]

    return (
        <div className={cn("relative flex h-screen w-72 flex-col border-r bg-card pb-12 pt-0", className)}>
            <div className="flex h-14 items-center border-b px-6 py-8">
                <Link className="flex items-center gap-2 font-bold" href="/dashboard">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        L
                    </div>
                    <span className="text-xl">Lumio</span>
                </Link>
            </div>
            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "group flex w-full items-center justify-start gap-4 rounded-xl p-3 text-sm font-medium transition-all hover:bg-accent",
                                pathname === route.href || pathname?.startsWith(`${route.href}/`)
                                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                                    : "text-muted-foreground"
                            )}
                        >
                            <route.icon className={cn("h-5 w-5", route.color)} />
                            {route.label}
                            {pathname === route.href && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute left-0 h-8 w-1 bg-primary rounded-r-full"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}
                        </Link>
                    ))}
                </div>
            </ScrollArea>
            <div className="mt-auto p-4 px-6 border-t bg-card/50">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    )
}
