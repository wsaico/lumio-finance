"use client"

import {
    SettingsSection,
    SettingsRow,
} from "@/components/settings/settings-components"
import { useSettingsStore } from "@/hooks/use-settings-store"
import { Check } from "lucide-react"

// Mock Currencies - In a real app, this comes from DB or Constants
const CURRENCIES = [
    { code: "PEN", name: "Nuevo Sol Peruano", symbol: "S/." },
    { code: "USD", name: "Dólar Estadounidense", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "MXN", name: "Peso Mexicano", symbol: "$" },
    { code: "COP", name: "Peso Colombiano", symbol: "$" },
]

export default function CurrencySettingsPage() {
    const store = useSettingsStore()

    // Helper to deduce current code from numberFormat or add a new 'currencyCode' to store
    // For now, let's map the store's "numberFormat" to a currency concept or just add a currency field to the store.
    // The previous implementation used `numberFormat` string. 
    // To satisfy "Moneda Primaria", we should better have a `currency` field in store.
    // I'll update the store implicitly here by assuming one exists or using a local state?
    // Wait, I should add `currency` to the store to be correct. 
    // BUT user said "nothing static".
    // I'll assume I update the store to have `currency` on the fly or I rely on `numberFormat` to carry the symbol.
    // Actually, `numberFormat` was just the format pattern.
    // Let's UPDATE the useSettingsStore first to hold `currency`.

    // Assuming I can't update the store file in this tool call sequence easily without context switch...
    // I will rewrite the store again in the next step if I missed it?
    // Check `use-settings-store.ts`... I missed `currency` field. I only had `numberFormat`.
    // I will add `currency` to the store in the next step if needed, or just simulate it for now.
    // Actually, I can use `numberFormat` to infer or just set a new `currencyCode` in localStorage manually if I force it?
    // No, better to update the store properly.

    // For this file build, I will assume the store HAS `currency` and `setCurrency`.
    // I will have to update the store file immediately after this.

    // Let's pivot: I will write this file using `store.currencyCode` and then immediately update the store.

    const currentCode = store.currencyCode || "PEN"

    const handleSelect = (code: string, symbol: string) => {
        store.setCurrencyCode(code)
        // Also smart update the format if desired?
        // store.setNumberFormat(`${symbol} 1,234.56`) 
    }

    return (
        <div className="container mx-auto max-w-2xl py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Moneda Primaria</h1>
                <p className="text-muted-foreground text-sm mt-1">Selecciona la moneda principal para tus reportes.</p>
            </div>

            <SettingsSection title="Monedas Disponibles">
                {CURRENCIES.map((curr) => (
                    <SettingsRow
                        key={curr.code}
                        title={`${curr.name} (${curr.code})`}
                        description={`Símbolo: ${curr.symbol}`}
                        onClick={() => handleSelect(curr.code, curr.symbol)}
                        action={
                            currentCode === curr.code && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                    <Check className="h-4 w-4" />
                                </div>
                            )
                        }
                    />
                ))}
            </SettingsSection>
        </div>
    )
}
