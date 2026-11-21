/**
 * Catálogo regional unificado: sincroniza País <-> Moneda <-> Zona Horaria (IANA) <-> Formato numérico.
 */

export interface RegionInfo {
    code: string
    name: string
    currencyCode: string
    timezone: string
    numberFormat: "1,234.56" | "1.234,56"
}

export const REGIONS: RegionInfo[] = [
    { code: "PE", name: "Perú", currencyCode: "PEN", timezone: "America/Lima", numberFormat: "1,234.56" },
    { code: "MX", name: "México", currencyCode: "MXN", timezone: "America/Mexico_City", numberFormat: "1,234.56" },
    { code: "CO", name: "Colombia", currencyCode: "COP", timezone: "America/Bogota", numberFormat: "1.234,56" },
    { code: "CL", name: "Chile", currencyCode: "CLP", timezone: "America/Santiago", numberFormat: "1.234,56" },
    { code: "AR", name: "Argentina", currencyCode: "ARS", timezone: "America/Argentina/Buenos_Aires", numberFormat: "1.234,56" },
    { code: "BO", name: "Bolivia", currencyCode: "BOB", timezone: "America/La_Paz", numberFormat: "1,234.56" },
    { code: "EC", name: "Ecuador", currencyCode: "USD", timezone: "America/Guayaquil", numberFormat: "1,234.56" },
    { code: "PA", name: "Panamá", currencyCode: "USD", timezone: "America/Panama", numberFormat: "1,234.56" },
    { code: "UY", name: "Uruguay", currencyCode: "UYU", timezone: "America/Montevideo", numberFormat: "1.234,56" },
    { code: "PY", name: "Paraguay", currencyCode: "PYG", timezone: "America/Asuncion", numberFormat: "1.234,56" },
    { code: "CR", name: "Costa Rica", currencyCode: "CRC", timezone: "America/Costa_Rica", numberFormat: "1,234.56" },
    { code: "DO", name: "República Dominicana", currencyCode: "DOP", timezone: "America/Santo_Domingo", numberFormat: "1,234.56" },
    { code: "GT", name: "Guatemala", currencyCode: "GTQ", timezone: "America/Guatemala", numberFormat: "1,234.56" },
    { code: "VE", name: "Venezuela", currencyCode: "VES", timezone: "America/Caracas", numberFormat: "1.234,56" },
    { code: "BR", name: "Brasil", currencyCode: "BRL", timezone: "America/Sao_Paulo", numberFormat: "1.234,56" },
    { code: "ES", name: "España", currencyCode: "EUR", timezone: "Europe/Madrid", numberFormat: "1.234,56" },
    { code: "US", name: "Estados Unidos", currencyCode: "USD", timezone: "America/New_York", numberFormat: "1,234.56" },
    { code: "CA", name: "Canadá", currencyCode: "CAD", timezone: "America/Toronto", numberFormat: "1,234.56" },
    { code: "GB", name: "Reino Unido", currencyCode: "GBP", timezone: "Europe/London", numberFormat: "1,234.56" },
]

export const COMMON_TIMEZONES: { value: string; label: string }[] = [
    { value: "America/Lima", label: "Lima / Bogotá / Quito (UTC-5)" },
    { value: "America/Mexico_City", label: "Ciudad de México (UTC-6)" },
    { value: "America/Santiago", label: "Santiago (UTC-4 / UTC-3)" },
    { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
    { value: "America/La_Paz", label: "La Paz (UTC-4)" },
    { value: "America/Caracas", label: "Caracas (UTC-4)" },
    { value: "America/Montevideo", label: "Montevideo (UTC-3)" },
    { value: "America/Asuncion", label: "Asunción (UTC-4 / UTC-3)" },
    { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
    { value: "America/Panama", label: "Panamá / Costa Rica (UTC-5/-6)" },
    { value: "America/Santo_Domingo", label: "Santo Domingo (UTC-4)" },
    { value: "America/Guatemala", label: "Guatemala (UTC-6)" },
    { value: "America/New_York", label: "Nueva York (UTC-5 / UTC-4)" },
    { value: "America/Los_Angeles", label: "Los Ángeles (UTC-8 / UTC-7)" },
    { value: "America/Toronto", label: "Toronto (UTC-5 / UTC-4)" },
    { value: "Europe/Madrid", label: "Madrid (UTC+1 / UTC+2)" },
    { value: "Europe/London", label: "Londres (UTC+0 / UTC+1)" },
]

export const DEFAULT_REGION = REGIONS[0]

export function getRegionByCountry(countryCode?: string | null): RegionInfo {
    if (!countryCode) return DEFAULT_REGION
    return REGIONS.find((r) => r.code.toUpperCase() === countryCode.toUpperCase()) || DEFAULT_REGION
}

export function getRegionByCurrency(currencyCode?: string | null): RegionInfo | undefined {
    if (!currencyCode) return DEFAULT_REGION
    return REGIONS.find((r) => r.currencyCode.toUpperCase() === currencyCode.toUpperCase())
}

export function detectBrowserRegion(): RegionInfo {
    if (typeof window === "undefined") return DEFAULT_REGION
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const byTz = REGIONS.find((r) => r.timezone === tz)
        if (byTz) return byTz

        const lang = navigator.language || "es-PE"
        const countryPart = lang.split("-")[1]?.toUpperCase()
        if (countryPart) {
            const byCountry = REGIONS.find((r) => r.code === countryPart)
            if (byCountry) return byCountry
        }
    } catch {
        // Fallback to PE
    }
    return DEFAULT_REGION
}
