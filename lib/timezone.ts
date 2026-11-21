/**
 * Utilidades determinísticas de zona horaria IANA para que los cierres mensuales,
 * presupuestos y etiquetas de fecha (Hoy / Ayer / Mañana) coincidan con la hora local del usuario.
 */

export function isValidTimezone(tz?: string | null): boolean {
    if (!tz) return false
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
    } catch {
        return false
    }
}

export function resolveTimezone(tz?: string | null): string {
    return isValidTimezone(tz) ? String(tz) : "America/Lima"
}

/**
 * Calcula el offset en milisegundos de una zona horaria IANA para una fecha UTC dada.
 */
function getTimezoneOffsetMs(dateUtc: Date, timeZone: string): number {
    const safeTz = resolveTimezone(timeZone)
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: safeTz,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    })
    const parts = dtf.formatToParts(dateUtc)
    const map: Record<string, string> = {}
    for (const p of parts) {
        if (p.type !== "literal") map[p.type] = p.value
    }
    const hour = map.hour === "24" ? "00" : map.hour
    const asUtc = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(hour),
        Number(map.minute),
        Number(map.second)
    )
    return asUtc - dateUtc.getTime()
}

/**
 * Convierte año/mes/día/hora local en `timeZone` a un timestamp UTC exacto en ISO.
 */
export function zonedWallTimeToUtcIso(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0,
    timeZone = "America/Lima"
): string {
    const safeTz = resolveTimezone(timeZone)
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms))
    const offset1 = getTimezoneOffsetMs(utcGuess, safeTz)
    const corrected = new Date(utcGuess.getTime() - offset1)
    const offset2 = getTimezoneOffsetMs(corrected, safeTz)
    const finalDate =
        offset1 === offset2 ? corrected : new Date(utcGuess.getTime() - offset2)
    return finalDate.toISOString()
}

/**
 * Rango exacto [00:00:00.000 día 1 .. 23:59:59.999 último día] de un mes en la zona horaria del usuario.
 */
export function getMonthDateRangeInTimezone(
    year: number,
    month: number,
    timeZone = "America/Lima"
): { startIso: string; endIso: string } {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
        startIso: zonedWallTimeToUtcIso(year, month, 1, 0, 0, 0, 0, timeZone),
        endIso: zonedWallTimeToUtcIso(year, month, lastDay, 23, 59, 59, 999, timeZone),
    }
}

/**
 * Rango exacto de un día específico en la zona horaria del usuario.
 */
export function getDayDateRangeInTimezone(
    year: number,
    month: number,
    day: number,
    timeZone = "America/Lima"
): { startIso: string; endIso: string } {
    return {
        startIso: zonedWallTimeToUtcIso(year, month, day, 0, 0, 0, 0, timeZone),
        endIso: zonedWallTimeToUtcIso(year, month, day, 23, 59, 59, 999, timeZone),
    }
}

/**
 * Devuelve la fecha (YYYY-MM-DD) y partes calendario en la zona horaria del usuario.
 */
export function getDateKeyInTimezone(
    input: Date | string,
    timeZone = "America/Lima"
): string {
    const safeTz = resolveTimezone(timeZone)
    const d = typeof input === "string" ? new Date(input) : input
    if (Number.isNaN(d.getTime())) return ""
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: safeTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d)
}

export function formatTimeNowInTimezone(timeZone = "America/Lima"): string {
    const safeTz = resolveTimezone(timeZone)
    return new Intl.DateTimeFormat("es-PE", {
        timeZone: safeTz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date())
}
