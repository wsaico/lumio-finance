"use client"

import { useSettingsStore } from "@/hooks/use-settings-store"
import { useEffect } from "react"

export function SettingsEffects() {
    const store = useSettingsStore()

    useEffect(() => {
        const root = document.documentElement

        // Reset previous classes
        root.classList.remove('font-inter', 'font-roboto', 'font-mono')
        root.classList.remove('high-contrast')
        root.classList.remove('animations-none', 'animations-minimal')

        // Apply Font
        if (store.font !== 'default') {
            root.classList.add(`font-${store.font}`)
        }

        // Apply High Contrast
        if (store.highContrast) {
            root.classList.add('high-contrast')
        }

        // Apply Animations
        if (store.animations !== 'all') {
            root.classList.add(`animations-${store.animations}`)
        }

        // Apply Root Variables for dynamic sizing if needed
        // e.g., root.style.setProperty('--header-height', store.headerHeight === 'large' ? '80px' : '60px')

    }, [store.font, store.highContrast, store.animations, store.headerHeight])

    return null
}
