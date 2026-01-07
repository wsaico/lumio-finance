"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CommandSearch } from "./command-search"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Sidebar } from "./app-sidebar"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { ThemeToggle } from "./theme-toggle"
import { NotificationsPopover } from "./notifications-popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, UserCircle, Search, Bell, Menu, Calendar as CalendarIcon, TrendingUp, Wallet, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/use-user"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useState, useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useAccounts } from "@/hooks/use-accounts"
import { useFormat } from "@/hooks/use-format"
import { cn } from "@/lib/utils"


// --- MAPA DE TÍTULOS Y SUBTÍTULOS ---
const PAGE_CONFIG: Record<string, { title: string, subtitle: string }> = {
    "/dashboard": { title: "Resumen Financiero", subtitle: "Visión general" },
    "/dashboard/transactions": { title: "Transacciones", subtitle: "Historial de movimientos" },
    "/dashboard/accounts": { title: "Cuentas", subtitle: "Gestión de saldos" },
    "/dashboard/budgets": { title: "Presupuestos", subtitle: "Control de gastos" },
    "/dashboard/reports": { title: "Reportes", subtitle: "Análisis financiero" },
    "/dashboard/petty-cash": { title: "Caja Chica", subtitle: "Gastos menores" },
    "/dashboard/loans": { title: "Préstamos", subtitle: "Deudas y créditos" },
    "/dashboard/planning": { title: "Planificación", subtitle: "Estrategia mensual" },
    "/dashboard/savings-goals": { title: "Metas", subtitle: "Ahorro futuro" },
    "/dashboard/settings": { title: "Ajustes", subtitle: "Preferencias" }
}

export function Header() {
    const pathname = usePathname()
    const router = useRouter()
    const { sidebarCollapsed } = useSettingsStore()
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [isOpen, setIsOpen] = useState(false)

    // Auto-close sidebar on route change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Data hooks
    const { accounts } = useAccounts()
    const { formatMoney } = useFormat()
    const { profile } = useUser()

    // Logout Handler
    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    // Calculate Net Worth
    const netWorth = useMemo(() => {
        if (!accounts) return 0
        return accounts.reduce((sum: number, acc: any) => sum + (Number(acc.currentBalance) || 0), 0)
    }, [accounts])

    // Determinar título y subtítulo
    const currentPath = pathname || "/dashboard"
    const matchedPath = Object.keys(PAGE_CONFIG).sort((a, b) => b.length - a.length).find(path => currentPath === path || (path !== "/dashboard" && currentPath.startsWith(path)))
    const { title: pageTitle, subtitle: pageSubtitle } = matchedPath ? PAGE_CONFIG[matchedPath] : { title: "Lumio", subtitle: "Finanzas" }

    // Get user first name
    const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'

    return (
        <header className="sticky top-0 z-40 flex h-20 md:h-24 w-full items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b transition-all duration-300">

            {/* --- LEFT: Mobile Menu & Page Title --- */}
            <div className="flex items-center gap-4 z-20">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden rounded-xl h-10 w-10">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r-0 bg-primary dark:bg-[#09090b]">
                        <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                        <Sidebar variant="flat" className="w-full h-full shadow-none" />
                    </SheetContent>
                </Sheet>

                <div className="flex flex-col">
                    <motion.h1
                        key={pageTitle}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-lg font-bold tracking-tight text-foreground"
                    >
                        {pageTitle}
                    </motion.h1>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider hidden md:block">
                        {pageSubtitle}
                    </span>
                </div>
            </div>


            {/* --- CENTER: HERO (Absolute) --- */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none md:pointer-events-auto hidden sm:block">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center -space-y-0.5"
                >
                    {/* Line 1: Greeting */}
                    <span className="text-sm font-medium text-muted-foreground tracking-wide mb-1.5">
                        Hola, <span className="text-foreground font-bold">{firstName}</span>
                    </span>

                    {/* Line 2: Net Worth + Trend - SYSTEM COLORS STRONGLY APPLIED */}
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)] backdrop-blur-md transition-all hover:bg-primary/15 hover:border-primary/30 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)]">
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                            Tu Patrimonio
                        </span>

                        <div className="h-4 w-px bg-primary/20" />

                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-primary tabular-nums leading-none tracking-tight">
                                {formatMoney(netWorth)}
                            </span>

                            {/* Trend Indicator - System Colored */}
                            <div className={cn(
                                "flex items-center justify-center rounded-full p-0.5",
                                netWorth >= 0 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                            )}>
                                {netWorth >= 0 ?
                                    <TrendingUp className="h-3 w-3" /> :
                                    <TrendingUp className="h-3 w-3 rotate-180" />
                                }
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>


            {/* --- RIGHT: Tools & Profile --- */}
            <div className="flex items-center gap-2 z-20">

                {/* 1. Search Icon (Smart) */}
                <CommandSearch>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Search className="h-5 w-5" />
                    </Button>
                </CommandSearch>

                <div className="hidden sm:flex items-center gap-2">
                    <ThemeToggle />
                    <NotificationsPopover />
                </div>

                <div className="h-6 w-px bg-border/40 mx-1 hidden sm:block" />

                {/* 4. PREMIUM PROFILE CIRCLE */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0 overflow-hidden ring-2 ring-transparent hover:ring-primary/50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/5">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                                    {profile?.full_name?.substring(0, 2).toUpperCase() || "YO"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-64" align="end" alignOffset={5} forceMount>
                        <div className="flex flex-col items-center p-6 bg-muted/20">
                            <Avatar className="h-20 w-20 border-4 border-background shadow-xl mb-3">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                                    {profile?.full_name?.substring(0, 2).toUpperCase() || "YO"}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="font-bold text-lg">{profile?.full_name}</h3>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer p-3" onClick={() => window.location.href = '/dashboard/settings?tab=data'}>
                            <UserCircle className="mr-2 h-4 w-4" />
                            <span>Mi Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer p-3 text-red-500 focus:text-red-500" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </div>
        </header>
    )
}
