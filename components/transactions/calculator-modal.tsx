"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Delete } from "lucide-react"

interface CalculatorModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (value: string) => void
    initialValue?: string
    currency?: string
}

export function CalculatorModal({ open, onOpenChange, onConfirm, initialValue = "", currency = "USD" }: CalculatorModalProps) {
    const [display, setDisplay] = useState(initialValue || "0")

    const currencySymbol = currency === 'USD' ? '$' : currency === 'PEN' ? 'S/' : currency === 'EUR' ? '€' : '$'

    const handleNumber = (num: string) => {
        if (display === "0") {
            setDisplay(num)
        } else {
            setDisplay(display + num)
        }
    }

    const handleDecimal = () => {
        if (!display.includes(".")) {
            setDisplay(display + ".")
        }
    }

    const handleClear = () => {
        setDisplay("0")
    }

    const handleBackspace = () => {
        if (display.length === 1) {
            setDisplay("0")
        } else {
            setDisplay(display.slice(0, -1))
        }
    }

    const handleConfirm = () => {
        const value = display === "0" ? "" : display
        onConfirm(value)
        onOpenChange(false)
    }

    const handleOperator = (op: string) => {
        const lastChar = display.slice(-1)
        if (['+', '-', '×', '÷'].includes(lastChar)) {
            setDisplay(display.slice(0, -1) + op)
        } else {
            setDisplay(display + op)
        }
    }

    const handleEquals = () => {
        try {
            // Replace calculator symbols with JS operators
            let expression = display
                .replace(/×/g, '*')
                .replace(/÷/g, '/')

            // Evaluate the expression
            const result = eval(expression)
            setDisplay(String(result))
        } catch {
            setDisplay("Error")
            setTimeout(() => setDisplay("0"), 1000)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[340px] p-0 gap-0">
                <DialogTitle className="sr-only">Calculadora</DialogTitle>

                {/* Display */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 border-b">
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Ingresar cantidad</div>
                        <div className="text-4xl font-bold text-foreground flex items-center justify-end gap-2">
                            <span className="text-2xl text-muted-foreground/50">{currencySymbol}</span>
                            <span className="tabular-nums">{display}</span>
                        </div>
                    </div>
                </div>

                {/* Calculator Grid */}
                <div className="p-4 grid grid-cols-4 gap-2">
                    {/* Row 1 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("7")}
                    >
                        7
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("8")}
                    >
                        8
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("9")}
                    >
                        9
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold text-primary"
                        onClick={() => handleOperator("÷")}
                    >
                        ÷
                    </Button>

                    {/* Row 2 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("4")}
                    >
                        4
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("5")}
                    >
                        5
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("6")}
                    >
                        6
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold text-primary"
                        onClick={() => handleOperator("×")}
                    >
                        ×
                    </Button>

                    {/* Row 3 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("1")}
                    >
                        1
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("2")}
                    >
                        2
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("3")}
                    >
                        3
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold text-primary"
                        onClick={() => handleOperator("-")}
                    >
                        -
                    </Button>

                    {/* Row 4 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={handleDecimal}
                    >
                        .
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={() => handleNumber("0")}
                    >
                        0
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold"
                        onClick={handleBackspace}
                    >
                        <Delete className="h-5 w-5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-lg font-semibold text-primary"
                        onClick={() => handleOperator("+")}
                    >
                        +
                    </Button>

                    {/* Row 5 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="h-14 text-sm font-semibold col-span-2"
                        onClick={handleClear}
                    >
                        Limpiar
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        className="h-14 text-lg font-semibold col-span-2 bg-primary"
                        onClick={handleEquals}
                    >
                        =
                    </Button>
                </div>

                {/* Confirm Button */}
                <div className="p-4 pt-0">
                    <Button
                        type="button"
                        className="w-full h-12 text-base font-semibold"
                        onClick={handleConfirm}
                    >
                        Fijar cantidad
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
