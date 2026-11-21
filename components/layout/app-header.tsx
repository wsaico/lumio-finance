"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
    LogOut,
    Search,
    Menu,
    Eye,
    EyeOff,
    Settings,
    UserCircle,
    Wallet,
    Command,
    Crown,
    ShieldCheck,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { performSafeSignOut } from "@/lib/auth-cleanup"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "./app-sidebar"
import { CommandSearch } from "./command-search"
import { ThemeToggle } from "./theme-toggle"
import { NotificationsPopover } from "./notifications-popover"
import { createClient } from "@/lib/supabase/client"
import { useUser } from "@/hooks/useUser"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { cn } from "@/lib/utils"

const PAGE_CONFIG: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": { title: "Inicio", subtitle: "Tu resumen de hoy" },
    "/dashboard/transactions": { title: "Movimientos", subtitle: "Todo lo que entra y sale" },
    "/dashboard/subscriptions": { title: "Programados", subtitle: "Suscripciones y pagos próximos" },
    "/dashboard/accounts": { title: "Mis cuentas", subtitle: "Dónde está tu dinero" },
    "/dashboard/budgets": { title: "Presupuestos", subtitle: "Tus límites del mes" },
    "/dashboard/analysis": { title: "Análisis", subtitle: "Entiende tus hábitos" },
    "/dashboard/loans": { title: "Préstamos", subtitle: "Lo que debes y te deben" },
    "/dashboard/planning": { title: "Planificación", subtitle: "Dale un destino a tu dinero" },
    "/dashboard/savings-goals": { title: "Metas de ahorro", subtitle: "Tus sueños, paso a paso" },
    "/dashboard/reports": { title: "Reportes", subtitle: "Exporta en Excel y PDF" },
    "/dashboard/settings": { title: "Ajustes", subtitle: "Hazlo a tu manera" },
    "/dashboard/billing": { title: "Suscripción", subtitle: "Planes y pagos" },
    "/dashboard/admin": { title: "Administración", subtitle: "Control global del sistema" },
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 19) return "Buenas tardes"
    return "Buenas noches"
}

export function Header() {
    const pathname = usePathname()
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    const { isBalanceVisible, setIsBalanceVisible, currencyCode } = useSettingsStore()
    const { totalBalanceConverted } = useAccounts()
    const { formatMoney } = useFormat()
    const { profile, entitlements } = useUser()
    const queryClient = useQueryClient()

    useEffect(() => setMenuOpen(false), [pathname])

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    const handleLogout = async () => {
        await performSafeSignOut(createClient(), queryClient)
    }

    const currentPath = pathname || "/dashboard"
    const matched = Object.keys(PAGE_CONFIG)
        .sort((a, b) => b.length - a.length)
        .find((p) => currentPath === p || (p !== "/dashboard" && currentPath.startsWith(p)))
    const page = matched ? PAGE_CONFIG[matched] : { title: "Lumio", subtitle: "Tus finanzas" }

    const firstName = profile?.full_name?.split(" ")[0] || "amigo"
    const initials = profile?.full_name?.substring(0, 2).toUpperCase() || "LU"

    return (
        <header
            className={cn(
                "sticky top-0 z-40 w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-2 sm:pt-3 pb-1.5 sm:pb-2 transition-all duration-300",
                scrolled && "bg-background/80 backdrop-blur-xl"
            )}
        >
            <div
                className={cn(
                    "flex h-14 sm:h-16 items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-3xl border border-border/60 bg-card px-2.5 sm:px-4 transition-shadow duration-300 overflow-hidden",
                    scrolled ? "shadow-lg shadow-primary/5" : "shadow-sm"
                )}
            >
                {/* Izquierda: menú móvil + toggle escritorio + título de la página */}
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl shrink-0">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 border-r-0 bg-sidebar">
                        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                        <Sidebar variant="flat" className="w-full h-full shadow-none" />
                    </SheetContent>
                </Sheet>

                <div className="min-w-0 flex-1 md:flex-initial">
                    <motion.h1
                        key={page.title}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight truncate"
                    >
                        {page.title}
                    </motion.h1>
                    <p className="hidden sm:block text-xs text-muted-foreground truncate">
                        {pathname === "/dashboard" ? `${getGreeting()}, ${firstName}` : page.subtitle}
                    </p>
                </div>

                {/* Centro: búsqueda global */}
                <div className="hidden md:flex flex-1 justify-center px-2">
                    <CommandSearch>
                        <button
                            type="button"
                            className="group flex h-10 w-full max-w-md items-center gap-2.5 rounded-full bg-muted/60 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
                        >
                            <Search className="h-4 w-4" />
                            <span className="flex-1 text-left">Busca movimientos, cuentas…</span>
                            <kbd className="hidden lg:flex items-center gap-0.5 rounded-lg bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                <Command className="h-2.5 w-2.5" />K
                            </kbd>
                        </button>
                    </CommandSearch>
                </div>

                {/* Derecha: patrimonio + herramientas + perfil */}
                <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
                    <Link
                        href="/dashboard/accounts"
                        className="hidden xl:flex items-center gap-2.5 rounded-full bg-primary/10 pl-3 pr-4 py-1.5 transition-colors hover:bg-primary/15"
                        title="Tu patrimonio total"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Wallet className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex flex-col leading-none">
                            <span className="text-[10px] font-medium text-muted-foreground">Tu patrimonio</span>
                            <span className="mt-0.5 text-sm font-bold text-primary tabular-nums">
                                {isBalanceVisible ? formatMoney(totalBalanceConverted) : "••••••"}
                            </span>
                        </span>
                    </Link>

                    <Link
                        href="/dashboard/settings?section=localization"
                        className="hidden sm:flex h-9 items-center rounded-full bg-muted/60 px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Moneda principal"
                    >
                        {currencyCode}
                    </Link>

                    <CommandSearch enableShortcut={false}>
                        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-full text-muted-foreground">
                            <Search className="h-4 w-4" />
                        </Button>
                    </CommandSearch>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-9 w-9 sm:h-10 sm:w-10 rounded-full text-muted-foreground transition-colors",
                            !isBalanceVisible && "bg-primary/10 text-primary hover:bg-primary/15"
                        )}
                        onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                        title={isBalanceVisible ? "Ocultar montos" : "Mostrar montos"}
                    >
                        {isBalanceVisible ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>

                    <div className="hidden sm:flex">
                        <ThemeToggle />
                    </div>
                    <NotificationsPopover />

                    <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="ml-0.5 rounded-full ring-2 ring-transparent transition-all hover:ring-primary/40 focus-visible:ring-primary/60 outline-none shrink-0">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                            <DropdownMenuLabel className="flex items-center gap-3 p-2">
                                <Avatar className="h-11 w-11">
                                    <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-bold">{profile?.full_name || "Tu cuenta"}</span>
                                    <span className="block truncate text-xs font-normal text-muted-foreground">{profile?.email}</span>
                                </span>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-xl p-2.5">
                                <Link href="/dashboard/settings?section=general">
                                    <UserCircle className="h-4 w-4" /> Mi perfil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-xl p-2.5">
                                <Link href="/dashboard/billing">
                                    <Crown className="h-4 w-4 text-amber-500" />
                                    {entitlements?.isTrial
                                        ? `Prueba (${entitlements.trialDaysRemaining}d)`
                                        : entitlements?.isPremium
                                          ? "Plan Premium"
                                          : "Mejorar a Premium"}
                                </Link>
                            </DropdownMenuItem>
                            {profile?.isAdmin && (
                                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-xl p-2.5">
                                    <Link href="/dashboard/admin">
                                        <ShieldCheck className="h-4 w-4 text-primary" /> Panel Admin
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-xl p-2.5">
                                <Link href="/dashboard/settings">
                                    <Settings className="h-4 w-4" /> Ajustes
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer gap-2 rounded-xl p-2.5 text-destructive focus:text-destructive"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4" /> Cerrar sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
