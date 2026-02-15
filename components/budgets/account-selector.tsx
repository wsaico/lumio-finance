"use client"

import { useAccounts } from "@/hooks/useAccounts"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface AccountSelectorProps {
    selectedIds: string[]
    onToggle: (id: string) => void
}

export function AccountSelector({ selectedIds, onToggle }: AccountSelectorProps) {
    const { accounts, isLoading } = useAccounts()

    if (isLoading) return <div className="text-sm text-muted-foreground p-2">Cargando cuentas...</div>

    return (
        <ScrollArea className="h-[200px] w-full border rounded-md p-2">
            <div className="space-y-1">
                {accounts?.map((account) => {
                    const isSelected = selectedIds.includes(account.id)
                    const currencySymbol = account.currencyCode === 'PEN' ? 'S/' : '$'

                    return (
                        <button
                            key={account.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onToggle(account.id)
                            }}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border w-full group",
                                isSelected
                                    ? "border-primary/40 bg-primary/10 shadow-sm"
                                    : "border-input/40 bg-muted/20 hover:bg-muted/40"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
                                    style={{ backgroundColor: account.color }}
                                />
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="text-sm font-semibold tracking-tight leading-none group-hover:text-primary transition-colors">
                                        {account.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium mt-1">
                                        {account.currencyCode === 'PEN' ? 'Soles' : 'Dólares'}
                                    </span>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "ml-1 h-5 px-1.5 text-[10px] font-bold border-input/60",
                                        isSelected && "bg-primary/20 border-primary/40 text-primary"
                                    )}
                                >
                                    {currencySymbol}
                                </Badge>
                            </div>
                            <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                                isSelected ? "bg-primary text-primary-foreground scale-100" : "bg-muted/40 text-muted-foreground/20 scale-90"
                            )}>
                                <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                        </button>
                    )
                })}
            </div>
        </ScrollArea>
    )
}
