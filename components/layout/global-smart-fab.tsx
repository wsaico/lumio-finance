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
        <div className="fixed bottom-8 right-8 z-[60] flex flex-col-reverse items-end gap-4 lg:block hidden">
            {/* Action Buttons List */}
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col-reverse items-end gap-3 mb-4">
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
                                        "h-12 px-5 rounded-xl shadow-lg flex items-center gap-3 border-none text-white font-bold transition-all hover:scale-105 active:scale-95",
                                        action.className
                                    )}
                                >
                                    {action.href ? (
                                        <Link href={action.href}>
                                            <action.icon className="h-4.5 w-4.5" />
                                            <span className="text-xs uppercase tracking-wider">{action.label}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <action.icon className="h-4.5 w-4.5" />
                                            <span className="text-xs uppercase tracking-wider">{action.label}</span>
                                        </div>
                                    )}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* main trigger button - GMAIL STYLE */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="lg"
                    className={cn(
                        "h-14 px-6 rounded-2xl shadow-2xl transition-all duration-300 flex items-center gap-3 border-none",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        isOpen && "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    )}
                >
                    <div className={cn("transition-transform duration-300", isOpen && "rotate-90")}>
                        {isOpen ? <X className="h-6 w-6" /> : (isPettyCashPage ? <Sparkles className="h-6 w-6" /> : <Plus className="h-6 w-6" />)}
                    </div>
                    {!isOpen && (
                        <span className="font-bold text-sm tracking-tight uppercase">
                            {isPettyCashPage ? "Operación Caja" : "Nueva Operación"}
                        </span>
                    )}
                </Button>
            </motion.div>

            <TransferModal
                open={isTransferModalOpen}
                onOpenChange={setIsTransferModalOpen}
            />
        </div>
    )
}
