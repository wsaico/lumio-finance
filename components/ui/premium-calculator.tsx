"use client"

import * as React from "react"
import { Delete, Check, Divide, Minus, Plus, X as Multiply } from "lucide-react"
import { cn } from "@/lib/utils"

interface PremiumCalculatorProps {
    initialValue?: string
    currencySymbol?: string
    accentClass?: string
    onConfirm: (value: string) => void
    onClose?: () => void
}

function safeEvaluate(expr: string): string {
    try {
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, "")
        if (!sanitized) return "0"
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized})`)()
        if (typeof result !== "number" || !isFinite(result) || isNaN(result)) return "0"
        const rounded = Math.max(0, Math.round(result * 100) / 100)
        return String(rounded)
    } catch {
        return expr
    }
}

export function PremiumCalculator({
    initialValue = "0",
    currencySymbol = "$",
    accentClass = "bg-primary hover:bg-primary/90 text-primary-foreground",
    onConfirm,
    onClose,
}: PremiumCalculatorProps) {
    const [display, setDisplay] = React.useState(
        initialValue && initialValue !== "0" ? String(initialValue) : "0"
    )

    const append = React.useCallback((token: string) => {
        setDisplay((prev) => {
            const isOp = ["+", "-", "*", "/"].includes(token)
            if (prev === "0" && !isOp && token !== ".") return token
            if (isOp && ["+", "-", "*", "/"].includes(prev.slice(-1))) {
                return prev.slice(0, -1) + token
            }
            if (token === ".") {
                const lastChunk = prev.split(/[+\-*/]/).pop() || ""
                if (lastChunk.includes(".")) return prev
            }
            return prev + token
        })
    }, [])

    const backspace = React.useCallback(() => {
        setDisplay((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)))
    }, [])

    const clear = React.useCallback(() => setDisplay("0"), [])

    const confirm = React.useCallback(() => {
        const finalVal = safeEvaluate(display)
        onConfirm(finalVal)
        onClose?.()
    }, [display, onConfirm, onClose])

    // Physical keyboard support
    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key >= "0" && e.key <= "9") {
                e.preventDefault()
                append(e.key)
            } else if (["+", "-", "*", "/", "."].includes(e.key)) {
                e.preventDefault()
                append(e.key)
            } else if (e.key === "Backspace") {
                e.preventDefault()
                backspace()
            } else if (e.key === "Escape") {
                e.preventDefault()
                onClose?.()
            } else if (e.key === "Enter" || e.key === "=") {
                e.preventDefault()
                confirm()
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [append, backspace, confirm, onClose])

    const hasOperator = /[+\-*/]/.test(display)
    const preview = hasOperator ? safeEvaluate(display) : null

    const keys: { label: React.ReactNode; value: string; kind?: "op" | "action" | "num" }[] = [
        { label: "C", value: "C", kind: "action" },
        { label: <Divide className="h-5 w-5" />, value: "/", kind: "op" },
        { label: <Multiply className="h-5 w-5" />, value: "*", kind: "op" },
        { label: <Delete className="h-5 w-5" />, value: "DEL", kind: "action" },
        { label: "7", value: "7", kind: "num" },
        { label: "8", value: "8", kind: "num" },
        { label: "9", value: "9", kind: "num" },
        { label: <Minus className="h-5 w-5" />, value: "-", kind: "op" },
        { label: "4", value: "4", kind: "num" },
        { label: "5", value: "5", kind: "num" },
        { label: "6", value: "6", kind: "num" },
        { label: <Plus className="h-5 w-5" />, value: "+", kind: "op" },
        { label: "1", value: "1", kind: "num" },
        { label: "2", value: "2", kind: "num" },
        { label: "3", value: "3", kind: "num" },
        { label: "=", value: "=", kind: "op" },
        { label: "00", value: "00", kind: "num" },
        { label: "0", value: "0", kind: "num" },
        { label: ".", value: ".", kind: "num" },
    ]

    return (
        <div className="w-full sm:w-[330px] rounded-[2rem] bg-card border border-border/60 p-4 shadow-2xl select-none">
            {/* Screen */}
            <div className="mb-4 rounded-2xl bg-muted/60 px-4 py-3 text-right">
                <div className="text-xs font-semibold text-muted-foreground min-h-[16px] tabular-nums">
                    {preview ? `= ${currencySymbol} ${preview}` : "Ingresa el monto"}
                </div>
                <div className="flex items-baseline justify-end gap-1.5 overflow-x-auto">
                    <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
                    <span className="text-4xl font-black tracking-tight tabular-nums text-foreground">
                        {display}
                    </span>
                </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2">
                {keys.map((k) => (
                    <button
                        key={k.value}
                        type="button"
                        onClick={() => {
                            if (k.value === "C") clear()
                            else if (k.value === "DEL") backspace()
                            else if (k.value === "=") setDisplay(safeEvaluate(display))
                            else append(k.value)
                        }}
                        className={cn(
                            "h-13 rounded-2xl flex items-center justify-center text-lg font-bold transition-all active:scale-95",
                            k.kind === "num" && "bg-muted/50 hover:bg-muted text-foreground",
                            k.kind === "op" && "bg-primary/10 hover:bg-primary/20 text-primary",
                            k.kind === "action" && "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        )}
                    >
                        {k.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={confirm}
                    aria-label="Confirmar monto"
                    className={cn(
                        "h-13 rounded-2xl flex items-center justify-center font-black shadow-md transition-all active:scale-95",
                        accentClass
                    )}
                >
                    <Check className="h-6 w-6" />
                </button>
            </div>
        </div>
    )
}
