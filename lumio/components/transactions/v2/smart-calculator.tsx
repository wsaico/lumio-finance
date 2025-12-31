"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Delete, Divide, Equal, Minus, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartCalculatorProps {
    initialValue?: string
    onConfirm: (value: string) => void
    onClose: () => void
}

export function SmartCalculator({ initialValue = "0", onConfirm, onClose }: SmartCalculatorProps) {
    const [display, setDisplay] = useState(initialValue === "0" ? "" : initialValue)
    const [expression, setExpression] = useState("")

    // Evaluate expression safely
    const calculate = () => {
        try {
            // Replace visual operators with JS operators
            const safeExpr = display.replace(/×/g, "*").replace(/÷/g, "/")
            // eslint-disable-next-line no-eval
            const result = eval(safeExpr)

            if (isFinite(result)) {
                const formatted = parseFloat(result.toFixed(2)).toString()
                setDisplay(formatted)
                onConfirm(formatted)
                return true
            }
        } catch (e) {
            // Ignore invalid
        }
        return false
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key

            if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(key)) {
                e.preventDefault()
                handlePress(key)
            } else if (['+', '-', '*', '/'].includes(key)) {
                e.preventDefault()
                const map: Record<string, string> = { '*': '×', '/': '÷' }
                handlePress(map[key] || key)
            } else if (key === 'Enter') {
                e.preventDefault()
                handlePress('=')
            } else if (key === 'Backspace') {
                e.preventDefault()
                handlePress('DEL')
            } else if (key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [display, onClose]) // Re-bind when display changes if needed, but handlePress uses functional update so actually [] is fine if handlePress is stable. 
    // However, let's keep it safe. Actually handlePress is stable closure inside component? No.
    // Best to use a ref or make handlePress not depend on state directly (it mostly uses functional updates)
    // EXCEPT for calculate() inside '=' which reads 'display'. So we need 'display' dependency.

    const handlePress = (key: string) => {
        if (key === 'AC') {
            setDisplay("")
            return
        }
        if (key === 'DEL') {
            setDisplay(prev => prev.slice(0, -1))
            return
        }
        if (key === '=') {
            if (calculate()) {
                onClose()
            }
            return
        }

        // Prevent multiple operators
        const isOperator = ['+', '-', '×', '÷'].includes(key)
        if (isOperator) {
            setDisplay(prev => {
                const lastChar = prev.slice(-1)
                if (['+', '-', '×', '÷'].includes(lastChar)) {
                    return prev.slice(0, -1) + key
                }
                return prev + key
            })
            return
        }

        setDisplay(prev => prev + key)
    }

    const keys = [
        'AC', 'DEL', '÷', '×',
        '7', '8', '9', '-',
        '4', '5', '6', '+',
        '1', '2', '3', '=',
        '0', '.', // 0 spans 2 cols usually? Let's keep grid simple 4x5
    ]

    // Custom grid layout
    return (
        <Card className="w-[360px] p-6 bg-popover/95 backdrop-blur-xl border-border shadow-2xl rounded-[2rem] animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
            <div className="mb-6 px-4 py-6 bg-muted/40 rounded-2xl text-right">
                <div className="text-5xl font-bold tracking-tighter text-foreground h-14 truncate flex items-center justify-end">
                    {display || "0"}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <CalcButton onClick={() => handlePress('AC')} variant="destructive" className="col-span-1 text-base font-bold text-red-500 bg-red-500/10 border-0 hover:bg-red-500/20">AC</CalcButton>
                <CalcButton onClick={() => handlePress('DEL')} variant="secondary"><Delete className="w-6 h-6" /></CalcButton>
                <CalcButton onClick={() => handlePress('÷')} variant="secondary" className="text-primary bg-primary/5 hover:bg-primary/10"><Divide className="w-6 h-6" /></CalcButton>
                <CalcButton onClick={() => handlePress('×')} variant="secondary" className="text-primary bg-primary/5 hover:bg-primary/10"><X className="w-6 h-6" /></CalcButton>

                <CalcButton onClick={() => handlePress('7')}>7</CalcButton>
                <CalcButton onClick={() => handlePress('8')}>8</CalcButton>
                <CalcButton onClick={() => handlePress('9')}>9</CalcButton>
                <CalcButton onClick={() => handlePress('-')} variant="secondary" className="text-primary bg-primary/5 hover:bg-primary/10"><Minus className="w-6 h-6" /></CalcButton>

                <CalcButton onClick={() => handlePress('4')}>4</CalcButton>
                <CalcButton onClick={() => handlePress('5')}>5</CalcButton>
                <CalcButton onClick={() => handlePress('6')}>6</CalcButton>
                <CalcButton onClick={() => handlePress('+')} variant="secondary" className="text-primary bg-primary/5 hover:bg-primary/10"><Plus className="w-6 h-6" /></CalcButton>

                <div className="col-span-4 grid grid-cols-4 gap-4">
                    <div className="col-span-3 grid grid-cols-3 gap-4">
                        <CalcButton onClick={() => handlePress('1')}>1</CalcButton>
                        <CalcButton onClick={() => handlePress('2')}>2</CalcButton>
                        <CalcButton onClick={() => handlePress('3')}>3</CalcButton>

                        <CalcButton onClick={() => handlePress('0')} className="col-span-2">0</CalcButton>
                        <CalcButton onClick={() => handlePress('.')}>.</CalcButton>
                    </div>
                    <CalcButton onClick={() => handlePress('=')} className="h-full bg-primary text-primary-foreground hover:bg-primary/90 text-2xl font-bold rounded-2xl shadow-lg shadow-primary/20">=</CalcButton>
                </div>
            </div>
        </Card>
    )
}

function CalcButton({ children, onClick, className, variant = "default" }: any) {
    const baseStyles = "h-16 text-2xl font-medium rounded-2xl transition-all active:scale-90 hover:scale-[1.02] shadow-sm flex items-center justify-center select-none"
    const variants = {
        default: "bg-background border border-input/50 hover:bg-accent/50 text-foreground hover:border-accent",
        secondary: "bg-muted/30 border border-transparent hover:bg-muted/80 text-foreground",
        destructive: "bg-red-100 text-red-600 hover:bg-red-200 border-red-100",
        primary: "" // handled in manual className
    }

    return (
        <button
            onClick={onClick}
            className={cn(baseStyles, variants[variant as keyof typeof variants], className)}
            type="button"
        >
            {children}
        </button>
    )
}
