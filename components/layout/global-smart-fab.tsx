"use client"

import { Plus, Sparkles, TrendingDown, TrendingUp, ArrowRightLeft, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"

const TransferModal = dynamic(() => import("@/components/transactions/transfer-modal").then(mod => mod.TransferModal), {
    ssr: false
})

export function GlobalSmartFab() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
    const isPettyCashPage = pathname?.includes('/petty-cash')

    // Close menu when pathname changes
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Intelligent visibility: Hide FAB if we are in a transaction/petty-cash creation or editing form
    const isInsideForm =
        pathname?.includes('/transactions/') ||
        pathname?.includes('/petty-cash/new-') ||
        pathname?.includes('/petty-cash/edit-')

    if (isInsideForm) {
        return null
    }

    const actions = isPettyCashPage ? [
        {
            icon: Sparkles,
            label: "Gasto Caja Chica",
            href: "/dashboard/petty-cash/new-expense",
            className: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
        },
        {
            icon: ArrowRightLeft,
            label: "Liquidación",
            href: "/dashboard/petty-cash/new-settlement",
            className: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
        }
    ] : [
        {
            icon: TrendingDown,
            label: "Gasto",
            href: "/dashboard/transactions/new?type=EXPENSE",
            className: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
        },
        {
            icon: TrendingUp,
            label: "Ingreso",
            href: "/dashboard/transactions/new?type=INCOME",
            className: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
        },
        {
            icon: ArrowRightLeft,
            label: "Transferencia",
            onClick: () => setIsTransferModalOpen(true),
            className: "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20"
        }
    ]

    return (
        <div className={cn(
            "fixed z-[100] flex flex-col-reverse gap-4 transition-all duration-300",
            "items-center lg:items-end", // Always center on mobile, always end on desktop
            "bottom-6 left-1/2 -translate-x-1/2 lg:bottom-8 lg:right-8 lg:left-auto lg:translate-x-0"
        )}>
            {/* Action Buttons List */}
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col-reverse items-center lg:items-end gap-3 mb-2">
                        {actions.map((action, idx) => (
                            <motion.div
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                transition={{ delay: idx * 0.03, duration: 0.2 }}
                            >
                                <Button
                                    asChild={!!action.href}
                                    onClick={() => {
                                        if (action.onClick) {
                                            action.onClick()
                                            setIsOpen(false)
                                        }
                                    }}
                                    className={cn(
                                        "h-12 w-auto px-5 rounded-2xl shadow-xl flex items-center gap-3 border-none text-white font-bold transition-all hover:scale-105 active:scale-95",
                                        action.className
                                    )}
                                >
                                    {action.href ? (
                                        <Link href={action.href}>
                                            <action.icon className="h-5 w-5" />
                                            <span className="text-xs uppercase font-black tracking-widest">{action.label}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <action.icon className="h-5 w-5" />
                                            <span className="text-xs uppercase font-black tracking-widest">{action.label}</span>
                                        </div>
                                    )}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* main trigger button - Dual Style: Circular Mobile / Rectangular Desktop */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="icon"
                    className={cn(
                        "shadow-[0_15px_35px_-10px_rgba(0,0,0,0.3)] transition-all duration-300 flex items-center justify-center border-none",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "h-14 w-14 rounded-full", // Mobile: Circular & Fixed Width
                        "lg:h-14 lg:w-auto lg:px-6 lg:rounded-2xl", // Desktop: Rectangular & Dynamic Width
                        isOpen && "rotate-90 lg:rotate-0" // Rotate only on mobile, desktop keeps text
                    )}
                >
                    <div className="flex items-center justify-center gap-2">
                        <div className={cn("transition-transform duration-300", isOpen && "lg:rotate-0")}>
                            {isOpen ? <X className="h-6 w-6" /> : (isPettyCashPage ? <Sparkles className="h-6 w-6" /> : <Plus className="h-6 w-6" />)}
                        </div>

                        {/* Desktop Text Label */}
                        <span className={cn(
                            "font-bold text-sm tracking-tight uppercase hidden lg:block ml-1",
                        )}>
                            {isPettyCashPage ? "Caja" : (isOpen ? "Cerrar" : "Operación")}
                        </span>
                    </div>
                </Button>
            </motion.div>

            <TransferModal
                open={isTransferModalOpen}
                onOpenChange={setIsTransferModalOpen}
            />
        </div>
    )
}
