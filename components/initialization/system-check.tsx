"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCategories } from "@/hooks/useCategories"
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
    const hasHealedRef = React.useRef(false)
    const pathname = usePathname()
    const supabase = createClient()

    React.useEffect(() => {
        if (isLoading || isHealing || hasHealedRef.current) return

        // Skip category check on authentication pages
        const isAuthPage = pathname?.startsWith('/login') ||
            pathname?.startsWith('/register') ||
            pathname?.startsWith('/auth') ||
            pathname?.startsWith('/forgot-password') ||
            pathname?.startsWith('/reset-password')

        if (isAuthPage) return

        const checkAndHeal = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const categoryList = Array.isArray(categories) ? categories : (categories?.all || [])
            const missingCategories = categoryList.length === 0

            if (missingCategories) {
                hasHealedRef.current = true
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
                    toast.success("Categorías listas", {
                        description: "Tus categorías iniciales han sido preparadas para que empieces a registrar gastos."
                    })
                }
            }
        } catch (error) {
            console.error("SystemCheck error:", error)
        } finally {
            setIsHealing(false)
        }
    }

    return null
}
