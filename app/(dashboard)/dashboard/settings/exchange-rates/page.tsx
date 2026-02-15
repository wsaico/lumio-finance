"use client"

import {
    SettingsSection,
    SettingsRow,
} from "@/components/settings/settings-components"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { useExchangeRates } from "@/hooks/useExchangeRates"
import { RefreshCw, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ExchangeRatesPage() {
    const { currencyCode } = useSettingsStore()
    const { rates, isLoading, syncRates } = useExchangeRates()

    const handleSync = () => {
        syncRates.mutate(currencyCode || 'USD')
    }

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Tipos de Cambio</h1>
                <p className="text-muted-foreground text-sm mt-1">Tasas de conversión utilizadas para calcular tus totales.</p>
            </div>

            <div className="flex justify-end mb-4">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleSync}
                    disabled={syncRates.isPending}
                >
                    {syncRates.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    Actualizar Tasas
                </Button>
            </div>

            <SettingsSection title={`Tasas Registradas`}>
                {isLoading ? (
                    <div className="p-8 flex justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : rates && rates.length > 0 ? (
                    rates.map((rate: any) => (
                        <SettingsRow
                            key={rate.id}
                            title={`1 ${rate.from_currency}`}
                            description={`Última act: ${new Date(rate.effective_date).toLocaleDateString()}`}
                            action={
                                <div className="flex items-center gap-2 font-mono font-bold text-lg">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    {Number(rate.rate).toFixed(4)} {rate.to_currency}
                                </div>
                            }
                        />
                    ))
                ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No hay tasas registradas. Pulsa "Actualizar Tasas".
                    </div>
                )}
            </SettingsSection>
            <p className="text-xs text-center text-muted-foreground">
                * Las tasas se actualizan desde fuentes externas confiables.
            </p>
        </div>
    )
}
