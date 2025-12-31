"use client"

import { Plus, Sparkles, TrendingDown, TrendingUp, ArrowRightLeft, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TransferModal } from "@/components/transactions/transfer-modal"

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
            color: "bg-orange-500",
            shadow: "shadow-orange-500/40"
        },
        {
            icon: ArrowRightLeft,
            label: "Liquidación",
            href: "/dashboard/petty-cash/new-settlement",
            color: "bg-amber-500",
            shadow: "shadow-amber-500/40"
        }
    ] : [
        {
            icon: TrendingDown,
            label: "Gasto",
            href: "/dashboard/transactions/new?type=EXPENSE",
            color: "var(--expense)",
            shadow: "shadow-rose-500/20"
        },
        {
            icon: TrendingUp,
            label: "Ingreso",
            href: "/dashboard/transactions/new?type=INCOME",
            color: "var(--income)",
            shadow: "shadow-emerald-500/20"
        },
        {
            icon: ArrowRightLeft,
            label: "Transferencia",
            onClick: () => setIsTransferModalOpen(true),
            color: "var(--savings)",
            shadow: "shadow-blue-500/20"
        }
    ]

    return (
        <div className="fixed bottom-8 right-8 z-[60] flex flex-col-reverse items-end gap-3 lg:block hidden">
            {/* Action Buttons List */}
            <AnimatePresence>
                {isOpen && (
                    <div className="flex flex-col-reverse items-end gap-3 mb-3">
                        {actions.map((action, idx) => (
                            <motion.div
                                key={action.label}
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                            >
                                <Button
                                    asChild={!!action.href}
                                    onClick={() => {
                                        if (action.onClick) {
                                            action.onClick()
                                            setIsOpen(false)
                                        }
                                    }}
                                    size="lg"
                                    className={cn(
                                        "h-14 px-6 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-xl border border-white/10 group transition-all duration-300",
                                        action.shadow
                                    )}
                                    style={{ backgroundColor: action.color.startsWith('var') ? `oklch(from ${action.color} l c h / 0.9)` : action.color }}
                                >
                                    {action.href ? (
                                        <Link href={action.href}>
                                            <action.icon className="h-5 w-5 text-white" />
                                            <span className="font-bold text-white tracking-tight">{action.label}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <action.icon className="h-5 w-5 text-white" />
                                            <span className="font-bold text-white tracking-tight">{action.label}</span>
                                        </div>
                                    )}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* main trigger button */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="lg"
                    className={cn(
                        "h-16 w-16 rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center p-0",
                        isOpen
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rotate-90"
                            : isPettyCashPage
                                ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/50"
                                : "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/50"
                    )}
                >
                    {isOpen ? (
                        <X className="h-7 w-7" />
                    ) : (
                        isPettyCashPage ? <Sparkles className="h-7 w-7" /> : <Plus className="h-7 w-7" />
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
