"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EditableMoneyCellProps {
    id?: string
    amount?: number
    initialValue?: number
    currency?: 'PEN' | 'USD'
    onSave: ((amount: number) => Promise<void> | void) | ((id: string, amount: number) => Promise<void> | void)
}

export function EditableMoneyCell({
    id,
    amount,
    initialValue,
    currency = 'PEN',
    onSave,
}: EditableMoneyCellProps) {
    const numericValue = typeof amount === 'number' ? amount : typeof initialValue === 'number' ? initialValue : 0
    const [isEditing, setIsEditing] = useState(false)
    const [value, setValue] = useState(String(numericValue))
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const isSavingRef = useRef(false)

    // Sync external changes (only if not editing)
    useEffect(() => {
        if (!isEditing) setValue(String(numericValue))
    }, [numericValue, isEditing])

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleSave = async () => {
        if (isSavingRef.current) return

        const numValue = parseFloat(value)

        // 1. Validation
        if (isNaN(numValue) || numValue < 0) {
            toast.error("Monto inválido")
            setValue(String(numericValue))
            setIsEditing(false)
            return
        }

        // 2. Optimistic check (prevent useless calls)
        if (Math.abs(numValue - numericValue) < 0.01) {
            setIsEditing(false)
            return
        }

        isSavingRef.current = true
        setIsLoading(true)

        try {
            if (id !== undefined && onSave.length >= 2) {
                await (onSave as (id: string, amount: number) => Promise<void>)(id, numValue)
            } else {
                await (onSave as (amount: number) => Promise<void>)(numValue)
            }
            setIsEditing(false)
        } catch (error) {
            toast.error("Error al guardar")
            setValue(String(numericValue))
        } finally {
            setIsLoading(false)
            isSavingRef.current = false
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            inputRef.current?.blur()
        } else if (e.key === 'Escape') {
            setValue(String(numericValue))
            setIsEditing(false)
        }
    }

    const startEditing = () => {
        if (isLoading) return
        setIsEditing(true)
    }

    const displayNum = parseFloat(value) || 0

    if (isEditing || isLoading) {
        return (
            <div className="relative w-32 flex items-center">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">
                    {currency === 'PEN' ? 'S/' : '$'}
                </span>
                <Input
                    ref={inputRef}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="h-10 pl-8 pr-3 text-right font-bold text-base rounded-xl border-primary/50 ring-2 ring-primary/20 bg-background shadow-md transition-all"
                />
                {isLoading && (
                    <div className="absolute -right-6 top-2.5">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div
            onClick={startEditing}
            className={`
                group cursor-pointer rounded-xl px-3 py-2 transition-all 
                text-right flex items-center justify-end gap-2 border border-transparent
                hover:bg-muted/50 hover:border-border/50 hover:shadow-sm
                ${numericValue === 0 ? 'opacity-60 hover:opacity-100' : ''}
            `}
            title="Clic para editar"
        >
            <span className={`
                font-bold text-base tracking-tight tabular-nums
                ${currency === 'USD' ? 'text-emerald-600 dark:text-emerald-500' : 'text-foreground'}
            `}>
                <span className="text-muted-foreground/60 text-xs mr-1 font-normal align-top">
                    {currency === 'PEN' ? 'S/' : '$'}
                </span>
                {displayNum.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary text-xs">
                ✎
            </span>
        </div>
    )
}
