"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCategories } from "@/hooks/use-categories"
import { toast } from "sonner"

export function SystemCheck() {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return <SystemCheckContent />
}

function SystemCheckContent() {
    const { categories, isLoading } = useCategories()
    const [isHealing, setIsHealing] = React.useState(false)
    const pathname = usePathname()
    const supabase = createClient()

    React.useEffect(() => {
        if (isLoading || isHealing) return

        // Skip category check on authentication pages
        const isAuthPage = pathname?.startsWith('/login') ||
            pathname?.startsWith('/register') ||
            pathname?.startsWith('/auth')

        if (isAuthPage) return

        const checkAndHeal = async () => {
            // Only attempt to heal if we have a valid session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Check for missing critical categories or empty list
            const missingCategories = !categories || categories.length === 0

            if (missingCategories) {
                handleHeal()
            }
        }

        checkAndHeal()
    }, [categories, isLoading, pathname])

    const handleHeal = async () => {
        setIsHealing(true)

        try {
            const response = await fetch('/api/categories/heal', {
                method: 'POST'
            })

            if (response.ok) {
                const data = await response.json()
                if (data.inserted > 0 || data.updated > 0) {
                    toast.success("Categorías sincronizadas", {
                        description: `Se han restaurado ${data.inserted + data.updated} categorías del sistema.`
                    })
                }
            } else {
                // If not authorized or other error, just log quietly
                if (response.status !== 401) {
                    console.error("SystemCheck: Healing failed", await response.text())
                }
            }
        } catch (error) {
            console.error("SystemCheck: Healing error", error)
        } finally {
            setIsHealing(false)
        }
    }

    return null // Invisible component
}
