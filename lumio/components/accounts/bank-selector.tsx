"use client"

import { useState } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BANK_PRESETS } from "@/lib/constants/banks"
import { Building2 } from "lucide-react"

interface BankSelectorProps {
    value?: string
    onValueChange: (bankName: string, customBankName?: string) => void
    customBankName?: string
    onCustomBankNameChange?: (name: string) => void
}

export function BankSelector({
    value,
    onValueChange,
    customBankName,
    onCustomBankNameChange
}: BankSelectorProps) {
    const [isCustom, setIsCustom] = useState(value === "custom")

    const handleBankChange = (newValue: string) => {
        const isCustomSelected = newValue === "custom"
        setIsCustom(isCustomSelected)

        if (isCustomSelected) {
            onValueChange("custom", customBankName || "")
        } else {
            onValueChange(newValue, undefined)
        }
    }

    const handleCustomNameChange = (name: string) => {
        if (onCustomBankNameChange) {
            onCustomBankNameChange(name)
        }
        onValueChange("custom", name)
    }

    return (
        <div className="space-y-3">
            <div>
                <Label>Banco o Entidad</Label>
                <Select value={value} onValueChange={handleBankChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona banco..." />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Banks */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Bancos
                        </div>
                        {BANK_PRESETS.filter(b => b.type === "BANK").map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: bank.color }}
                                    />
                                    {bank.name}
                                </div>
                            </SelectItem>
                        ))}

                        {/* Digital Wallets */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                            Billeteras Digitales
                        </div>
                        {BANK_PRESETS.filter(b => b.type === "DIGITAL").map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: bank.color }}
                                    />
                                    {bank.name}
                                </div>
                            </SelectItem>
                        ))}

                        {/* Custom Option */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                            Otras Opciones
                        </div>
                        <SelectItem value="custom">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                <span className="font-semibold">Personalizado</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Custom Bank Name Input */}
            {isCustom && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="customBankName" className="text-sm">
                        Nombre Personalizado
                    </Label>
                    <Input
                        id="customBankName"
                        placeholder="Ej: Caja Chica Oficina, Plata, etc."
                        value={customBankName || ""}
                        onChange={(e) => handleCustomNameChange(e.target.value)}
                        className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                        Ingresa el nombre de tu entidad personalizada
                    </p>
                </div>
            )}
        </div>
    )
}
