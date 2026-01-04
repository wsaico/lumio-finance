"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { KeyboardShortcutsDialog } from "@/components/ui/KeyboardShortcutsDialog"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [showShortcuts, setShowShortcuts] = useState(false)

    const shortcuts = useGlobalKeyboardShortcuts(
        () => router.push("/dashboard/transactions/new"),
        () => {
            // TODO: Implement global search
        },
        () => {
            // TODO: Toggle sidebar
        },
        () => router.push("/dashboard"),
        () => router.push("/dashboard/transactions"),
        () => router.push("/dashboard/budgets"),
        () => setShowShortcuts(true)
    )

    return (
        <>
            {children}
            <KeyboardShortcutsDialog
                isOpen={showShortcuts}
                onClose={() => setShowShortcuts(false)}
                shortcuts={shortcuts}
            />
        </>
    )
}
