"use client"

import type { QueryClient } from "@tanstack/react-query"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useTransactionFilters } from "@/hooks/useTransactionFilters"
import { useSettingsStore } from "@/hooks/useSettingsStore"

const USER_SCOPED_LOCAL_KEYS = [
    "lumio_onboarding_seen",
    "lumio_recent_categories",
    "lumio_tour_completed",
]

/**
 * Cierra sesión limpiando React Query, filtros activos y claves de sesión en navegador
 * para garantizar cero mezcla entre distintas cuentas en el mismo dispositivo.
 */
export async function performSafeSignOut(
    supabase: SupabaseClient,
    queryClient?: QueryClient
) {
    try {
        queryClient?.clear()
    } catch {
        // ignore
    }

    try {
        useTransactionFilters.getState().clearAllFilters()
        useSettingsStore.getState().setActiveUserId(null)
    } catch {
        // ignore
    }

    if (typeof window !== "undefined") {
        try {
            USER_SCOPED_LOCAL_KEYS.forEach((k) => window.localStorage.removeItem(k))
            window.sessionStorage.removeItem("lumio_pin_unlocked")
        } catch {
            // ignore
        }
    }

    try {
        await supabase.auth.signOut()
    } catch {
        // ignore
    }

    if (typeof window !== "undefined") {
        window.location.href = "/login"
    }
}
