"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, ArrowRightLeft, TrendingDown, TrendingUp, Target } from "lucide-react"
import Link from "next/link"

export function GlobalSmartFab() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    const isInsideForm =
        pathname?.includes("/transactions/new") ||
        pathname?.includes("/savings-goals/new") ||
        /\/dashboard\/transactions\/[^/]+$/.test(pathname || "")

    if (isInsideForm) {
        return null
    }

    const actions = [
        {
            icon: TrendingDown,
            label: "Nuevo Gasto",
            href: "/dashboard/transactions/new?type=EXPENSE",
            className: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25",
        },
        {
            icon: TrendingUp,
            label: "Nuevo Ingreso",
            href: "/dashboard/transactions/new?type=INCOME",
            className: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25",
        },
        {
            icon: ArrowRightLeft,
            label: "Transferir",
            href: "/dashboard/transactions/new?type=TRANSFER",
            className: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
        },
        {
            icon: Target,
            label: "Nueva Meta",
            href: "/dashboard/savings-goals/new",
            className: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25",
        },
    ]

    return (
        <div className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-3 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 10 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col items-end gap-2.5 pointer-events-auto mb-1"
                    >
                        {actions.map((action) => (
                            <Link
                                key={action.label}
                                href={action.href}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 group"
                            >
                                <span className="px-3.5 py-1.5 rounded-2xl bg-card/95 backdrop-blur-md border border-border/60 text-foreground text-xs font-bold shadow-lg">
                                    {action.label}
                                </span>
                                <div
                                    className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95 ${action.className}`}
                                >
                                    <action.icon className="h-5 w-5" />
                                </div>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Cerrar menú rápido" : "Nueva transacción"}
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 pointer-events-auto"
            >
                {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 stroke-[2.5]" />}
            </button>
        </div>
    )
}
