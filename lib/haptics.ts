import { useSettingsStore } from "@/hooks/useSettingsStore"

/**
 * Emite una vibración háptica corta en dispositivos móviles compatibles si está habilitado en Ajustes.
 */
export function triggerHaptic(durationMs: number | number[] = 12) {
    if (typeof window === "undefined") return
    try {
        const enabled = useSettingsStore.getState().hapticsEnabled
        if (!enabled) return
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            navigator.vibrate(durationMs)
        }
    } catch {
        // Silent fallback on unsupported browsers
    }
}
