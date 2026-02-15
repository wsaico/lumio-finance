"use client"

import * as React from "react"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from "@/components/ui/select"
import { Plus, Wallet, Loader2 } from "lucide-react"

interface AccountSelectProps {
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    currencyCode?: string
    excludeId?: string
    showBalance?: boolean
    allowAdd?: boolean
    onAdd?: () => void
    className?: string
    disabled?: boolean
}

export function AccountSelect({
    value,
    onValueChange,
    placeholder = "Selecciona una cuenta",
    currencyCode,
    excludeId,
    showBalance = true,
    allowAdd = true,
    onAdd,
    className,
    disabled
}: AccountSelectProps) {
    const { accounts, isLoading } = useAccounts()
    const { formatMoney } = useFormat()

    const filteredAccounts = React.useMemo(() => {
        let list = accounts || []
        if (currencyCode) {
            list = list.filter(acc => acc.currencyCode === currencyCode)
        }
        if (excludeId) {
            list = list.filter(acc => acc.id !== excludeId)
        }
        return list
    }, [accounts, currencyCode, excludeId])

    const handleValueChange = (val: string) => {
        if (val === "new") {
            onAdd?.()
            return
        }
        onValueChange(val)
    }

    return (
        <Select
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled || isLoading}
        >
            <SelectTrigger className={cn("w-full h-9 rounded-lg border-input/60 bg-muted/20 hover:bg-muted/40 transition-colors", className)}>
                <SelectValue placeholder={isLoading ? "Cargando..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allowAdd && (
                    <>
                        <SelectItem value="new" className="text-primary font-medium focus:text-primary focus:bg-primary/5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-primary/10">
                                    <Plus className="h-3 w-3 text-primary" />
                                </div>
                                Nueva cuenta
                            </div>
                        </SelectItem>
                        <SelectSeparator />
                    </>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="p-4 text-xs text-center text-muted-foreground">
                        No hay cuentas {currencyCode ? `en ${currencyCode}` : ""}
                    </div>
                ) : (
                    filteredAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="focus:bg-primary/5 focus:text-foreground">
                            <div className="flex items-center justify-between w-full min-w-[200px] gap-4">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: acc.color || '#94a3b8' }}
                                    />
                                    <span className="font-medium truncate max-w-[120px]">{acc.name}</span>
                                </div>
                                {showBalance && (
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <span className="text-[10px] text-muted-foreground font-semibold px-1 py-0 rounded bg-muted/50">
                                            {acc.currencyCode}
                                        </span>
                                        <span className="text-xs font-bold tabular-nums">
                                            {formatMoney(acc.currentBalance, acc.currencyCode)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    )
}
