"use client"

import { useEffect } from "react"
import { useSettingsStore } from "@/hooks/use-settings-store"

export function SettingsEffects() {
    const { accentColor, fontFamily } = useSettingsStore()

    useEffect(() => {
        if (accentColor) {
            // Convert Hex to OKLCH or just use HEX if preferred. 
            // Tailwinds v4 variables typically use OKLCH, but we can override with HEX for simplicity 
            // since we are targeting the --primary variable.
            document.documentElement.style.setProperty('--primary', accentColor)
            document.documentElement.style.setProperty('--ring', accentColor)

            // Also update sidebar specific if needed
            document.documentElement.style.setProperty('--sidebar-primary', accentColor)
        }
    }, [accentColor])

    useEffect(() => {
        if (fontFamily) {
            const fontVars: Record<string, string> = {
                'Geist': 'var(--font-geist-sans)',
                'Inter': 'var(--font-inter)',
                'Montserrat': 'var(--font-montserrat)',
                'Outfit': 'var(--font-outfit)',
                'Plus Jakarta Sans': 'var(--font-plus-jakarta-sans)',
                'HONOR Sans': 'var(--font-honor-sans)', // Error if files missing in layout.tsx
            }
            document.documentElement.style.setProperty('--font-family', fontVars[fontFamily] || 'var(--font-geist-sans)')
        }
    }, [fontFamily])

    return null
}
