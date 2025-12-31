"use client"

import {
    SettingsSection,
    SettingsRow,
} from "@/components/settings/settings-components"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { RefreshCw, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// Mock Rates - In real app, fetch from API
const MOCK_RATES = [
    { from: "USD", to: "PEN", rate: 3.75 },
    { from: "EUR", to: "PEN", rate: 4.05 },
    { from: "PEN", to: "USD", rate: 0.27 },
]

export default function ExchangeRatesPage() {
    const { currencyCode } = useSettingsStore()

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Tipos de Cambio</h1>
                <p className="text-muted-foreground text-sm mt-1">Tasas de conversión utilizadas para calcular tus totales.</p>
            </div>

            <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Actualizar Tasas
                </Button>
            </div>

            <SettingsSection title={`Tasas frente a ${currencyCode}`}>
                {MOCK_RATES.map((rate, idx) => (
                    <SettingsRow
                        key={idx}
                        title={`1 ${rate.from}`}
                        description={`vale`}
                        action={
                            <div className="flex items-center gap-2 font-mono font-bold text-lg">
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                {rate.rate.toFixed(4)} {rate.to}
                            </div>
                        }
                    />
                ))}
            </SettingsSection>
            <p className="text-xs text-center text-muted-foreground">
                * Las tasas se actualizan diariamente desde fuentes abiertas.
            </p>
        </div>
    )
}
