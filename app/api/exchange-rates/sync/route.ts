export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CURRENCIES } from '@/lib/currencies'

const PRIMARY_API = 'https://open.er-api.com/v6/latest/USD'
const FALLBACK_API = 'https://api.exchangerate-api.com/v4/latest/USD'

async function fetchLiveUsdRates(): Promise<Record<string, number>> {
    try {
        const res = await fetch(PRIMARY_API, { cache: 'no-store' })
        if (res.ok) {
            const json = await res.json()
            if (json?.rates && typeof json.rates === 'object') {
                return json.rates
            }
        }
    } catch {
        // Fallback below
    }

    const fallbackRes = await fetch(FALLBACK_API, { cache: 'no-store' })
    if (!fallbackRes.ok) {
        throw new Error('No se pudo conectar al proveedor de tipos de cambio')
    }
    const fallbackJson = await fallbackRes.json()
    if (!fallbackJson?.rates) {
        throw new Error('Respuesta inválida del proveedor de tipos de cambio')
    }
    return fallbackJson.rates
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))
        const forceOverwriteManual = Boolean(body?.forceOverwriteManual)
        const onlyCurrency: string | null = body?.currency
            ? String(body.currency).toUpperCase()
            : null

        // 1. Fetch live USD-hub rates
        const liveRates = await fetchLiveUsdRates()

        // 2. Check existing latest rates so we don't clobber MANUAL overrides (e.g. Bolivia/Argentina parallel rates)
        const { data: existingRates } = await supabase
            .from('exchange_rates')
            .select('from_currency, to_currency, source, effective_date')
            .eq('from_currency', 'USD')
            .order('effective_date', { ascending: false })

        const latestSourceByTarget: Record<string, string> = {}
        for (const row of existingRates || []) {
            if (!latestSourceByTarget[row.to_currency]) {
                latestSourceByTarget[row.to_currency] = row.source || 'API'
            }
        }

        const catalogCodes = CURRENCIES.map((c) => c.code).filter((code) => code !== 'USD')
        const targetCodes = onlyCurrency
            ? catalogCodes.filter((c) => c === onlyCurrency)
            : catalogCodes

        const nowIso = new Date().toISOString()
        const recordsToInsert: Array<{
            from_currency: string
            to_currency: string
            rate: number
            source: string
            effective_date: string
        }> = []

        let preservedManualCount = 0

        for (const code of targetCodes) {
            const rate = Number(liveRates[code])
            if (!rate || !isFinite(rate) || rate <= 0) continue

            const isManual = latestSourceByTarget[code] === 'MANUAL'
            if (isManual && !forceOverwriteManual && !onlyCurrency) {
                preservedManualCount++
                continue
            }

            recordsToInsert.push({
                from_currency: 'USD',
                to_currency: code,
                rate,
                source: 'API',
                effective_date: nowIso,
            })
        }

        if (recordsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('exchange_rates')
                .insert(recordsToInsert)

            if (insertError) throw insertError
        }

        return NextResponse.json(
            {
                message: 'Tasas de cambio actualizadas correctamente',
                synced: recordsToInsert.length,
                preservedManual: preservedManualCount,
                baseCurrency: 'USD',
                effectiveDate: nowIso,
            },
            { status: 200 }
        )
    } catch (error: any) {
        if (
            error &&
            (error.digest === 'DYNAMIC_SERVER_USAGE' ||
                String(error).includes('Dynamic server usage'))
        ) {
            throw error
        }

        console.error('[EXCHANGE_RATES_SYNC]', error)
        return NextResponse.json(
            { error: error?.message || 'Error al sincronizar tasas de cambio' },
            { status: 500 }
        )
    }
}
