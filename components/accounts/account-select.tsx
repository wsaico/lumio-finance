"use client"

import React from "react"
import Link from "next/link"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAccounts } from "@/hooks/useAccounts"
import { useFormat } from "@/hooks/useFormat"
import { Wallet, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccountSelectProps {
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    filter?: (account: any) => boolean
}

export function AccountSelect({
    value,
    onValueChange,
    placeholder = "Selecciona una cuenta",
    disabled = false,
    className,
    filter,
}: AccountSelectProps) {
    const { accounts, isLoading } = useAccounts()
    const { formatMoney } = useFormat()

    const filteredAccounts = React.useMemo(() => {
        if (!accounts) return []
        const active = accounts.filter((a: any) => !a.isArchived)
        if (filter) {
            return active.filter(filter)
        }
        return active
    }, [accounts, filter])

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 h-11 px-3 rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando cuentas...</span>
            </div>
        )
    }

    if (filteredAccounts.length === 0) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold text-foreground truncate">
                        Primero crea una cuenta para continuar
                    </span>
                </div>
                <Link
                    href="/dashboard/accounts"
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-3 w-3" />
                    Crear cuenta
                </Link>
            </div>
        )
    }

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={cn("w-full min-w-0 h-11 rounded-2xl bg-card border-border/60 shadow-xs focus:ring-primary/20 [&>span]:truncate [&>span]:min-w-0", className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/60 shadow-xl max-h-72">
                {filteredAccounts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No hay cuentas disponibles
                    </div>
                ) : (
                    filteredAccounts.map((acc: any) => (
                        <SelectItem
                            key={acc.id}
                            value={acc.id}
                            className="rounded-xl my-0.5 cursor-pointer focus:bg-primary/10 focus:text-primary"
                        >
                            <div className="flex items-center justify-between w-full min-w-0 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: acc.color || "var(--primary)" }}
                                    />
                                    <span className="font-medium text-foreground truncate">{acc.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground font-mono shrink-0">
                                    {formatMoney(Number(acc.currentBalance) || 0, acc.currencyCode)}
                                </span>
                            </div>
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    )
}

export default AccountSelect
