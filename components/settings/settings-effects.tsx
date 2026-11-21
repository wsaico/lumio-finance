"use client"

import { useEffect, useRef } from "react"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useSystemBranding } from "@/hooks/useSystemBranding"
import { createClient } from "@/lib/supabase/client"
import { FONT_STACKS } from "@/lib/appearance"
import { getRegionByCountry } from "@/lib/regions"

/**
 * Aplica preferencias visuales reales al documento y mantiene sincronizados
 * país, moneda y zona horaria por usuario (aislando sesiones distintas).
 */
export function SettingsEffects() {
    const store = useSettingsStore()
    const branding = useSystemBranding()
    const syncedUserRef = useRef<string | null>(null)
    const appliedStartHiddenRef = useRef(false)

    // Color de marca: prioridad color global de Admin salvo que el usuario personalice el suyo
    useEffect(() => {
        const color =
            (store.hasCustomAccent ? store.accentColor : branding.primaryColor) ||
            store.accentColor ||
            "#7C3AED"
        document.documentElement.style.setProperty("--brand", color)
    }, [store.hasCustomAccent, store.accentColor, branding.primaryColor])

    // Tipografía y tamaño de fuente
    useEffect(() => {
        const stack = FONT_STACKS[store.fontFamily] || FONT_STACKS.Outfit
        document.documentElement.style.setProperty("--app-font", stack)
    }, [store.fontFamily])

    useEffect(() => {
        const scale = Math.min(115, Math.max(90, Number(store.fontScale || 100)))
        document.documentElement.style.fontSize = `${scale}%`
    }, [store.fontScale])

    // Material You, Alto Contraste, Animaciones e Íconos
    useEffect(() => {
        document.documentElement.classList.toggle("material-you", Boolean(store.materialYou))
    }, [store.materialYou])

    useEffect(() => {
        document.documentElement.classList.toggle("high-contrast", Boolean(store.highContrast))
    }, [store.highContrast])

    useEffect(() => {
        document.documentElement.classList.toggle("reduce-motion", store.motionMode === "reduced")
        document.documentElement.classList.toggle("no-motion", store.motionMode === "none")
    }, [store.motionMode])

    useEffect(() => {
        const radius =
            store.iconStyle === "circle"
                ? "9999px"
                : store.iconStyle === "soft"
                  ? "0.65rem"
                  : "1rem"
        document.documentElement.style.setProperty("--icon-radius", radius)
    }, [store.iconStyle])

    // Modo discreto al iniciar
    useEffect(() => {
        if (!appliedStartHiddenRef.current && store.startHiddenBalances) {
            appliedStartHiddenRef.current = true
            store.setIsBalanceVisible(false)
        }
    }, [store.startHiddenBalances])

    // Aislamiento de sesión + sincronización regional con Supabase
    useEffect(() => {
        let cancelled = false
        const supabase = createClient()

        const run = async () => {
            try {
                const { data } = await supabase.auth.getUser()
                const user = data?.user
                if (!user || cancelled) return

                const meta = user.user_metadata || {}

                // Detectar cambio de usuario en el mismo navegador
                if (store.activeUserId && store.activeUserId !== user.id) {
                    store.resetUserPreferencesForSwitch(user.id)
                } else if (!store.activeUserId) {
                    store.setActiveUserId(user.id)
                }

                if (syncedUserRef.current !== user.id) {
                    syncedUserRef.current = user.id
                    const remoteCountry = meta.country_code as string | undefined
                    const remoteCurrency = meta.currency as string | undefined
                    const remoteTz = meta.timezone as string | undefined

                    if (remoteCountry && remoteCountry !== store.countryCode) {
                        store.setCountryCode(remoteCountry)
                    }
                    if (remoteCurrency && remoteCurrency !== store.currencyCode) {
                        store.setCurrencyCode(remoteCurrency)
                    }
                    if (remoteTz && remoteTz !== store.timezone) {
                        store.setTimezone(remoteTz)
                    } else if (remoteCountry && !remoteTz) {
                        store.setTimezone(getRegionByCountry(remoteCountry).timezone)
                    }
                    return
                }

                // Empujar cambios locales al servidor
                const needsSync =
                    store.currencyCode !== meta.currency ||
                    store.countryCode !== meta.country_code ||
                    store.timezone !== meta.timezone

                if (needsSync) {
                    await fetch("/api/user/preferences", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            country_code: store.countryCode,
                            base_currency: store.currencyCode,
                            timezone: store.timezone,
                        }),
                    }).catch(() => null)
                }
            } catch {
                // sin conexión: reintentará al cambiar
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [store.currencyCode, store.countryCode, store.timezone, store.activeUserId])

    return null
}
