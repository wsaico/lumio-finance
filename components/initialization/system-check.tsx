"use client"

import * as React from "react"
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

    React.useEffect(() => {
        if (isLoading || isHealing) return

        // Check for missing critical categories or empty list
        const missingCategories = !categories || categories.length === 0

        if (missingCategories) {
            handleHeal()
        }
    }, [categories, isLoading])

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
                console.error("SystemCheck: Healing failed", await response.text())
            }
        } catch (error) {
            console.error("SystemCheck: Healing error", error)
        } finally {
            setIsHealing(false)
        }
    }

    return null // Invisible component
}
