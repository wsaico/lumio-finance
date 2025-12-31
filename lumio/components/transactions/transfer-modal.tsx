"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { CalendarIcon, ArrowRight, X, Delete, Check, ChevronUp, ChevronDown, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useAccounts } from "@/hooks/use-accounts"
import { toast } from "sonner"

interface TransferModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function TransferModal({ open, onOpenChange, onSuccess }: TransferModalProps) {
    const { accounts } = useAccounts()
    const [expression, setExpression] = useState("0")
    const [displayValue, setDisplayValue] = useState("0")
    const [description, setDescription] = useState("")
    const [fromAccountId, setFromAccountId] = useState<string>("")
    const [toAccountId, setToAccountId] = useState<string>("")
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [selectedHour, setSelectedHour] = useState(new Date().getHours())
    const [selectedMinute, setSelectedMinute] = useState(new Date().getMinutes())
    const [currency, setCurrency] = useState("PEN")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [exchangeRate, setExchangeRate] = useState<number | null>(null)
    const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
    const [isLoadingRate, setIsLoadingRate] = useState(false)

    // Sub-modal states
    const [activeSubModal, setActiveSubModal] = useState<'none' | 'fromAccount' | 'toAccount' | 'currency' | 'date' | 'time'>('none')

    // Set default account when accounts load
    useEffect(() => {
        if (accounts && accounts.length > 0 && !fromAccountId) {
            setFromAccountId(accounts[0].id)
            setCurrency(accounts[0].currencyCode || "PEN")
        }
    }, [accounts, fromAccountId])

    const fromAccount = accounts?.find((a: any) => a.id === fromAccountId)
    const toAccount = accounts?.find((a: any) => a.id === toAccountId)

    // Check if currencies are different
    const needsCurrencyConversion = fromAccount && toAccount && fromAccount.currencyCode !== toAccount.currencyCode

    // Fetch exchange rate when accounts change
    const fetchExchangeRate = useCallback(async () => {
        if (!needsCurrencyConversion || !fromAccount || !toAccount) {
            setExchangeRate(null)
            setConvertedAmount(null)
            return
        }

        setIsLoadingRate(true)
        try {
            const response = await fetch('/api/exchange-rates/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 1,
                    from: fromAccount.currencyCode,
                    to: toAccount.currencyCode
                })
            })

            if (response.ok) {
                const data = await response.json()
                setExchangeRate(data.rate)
            } else {
                setExchangeRate(null)
                toast.error("No se encontró tasa de cambio")
            }
        } catch (error) {
            console.error("Error fetching exchange rate:", error)
            setExchangeRate(null)
        } finally {
            setIsLoadingRate(false)
        }
    }, [needsCurrencyConversion, fromAccount, toAccount])

    useEffect(() => {
        fetchExchangeRate()
    }, [fetchExchangeRate])

    // Calculate converted amount when expression or rate changes
    useEffect(() => {
        if (exchangeRate && needsCurrencyConversion) {
            const numericValue = evaluateExpression(expression)
            if (!isNaN(numericValue)) {
                setConvertedAmount(numericValue * exchangeRate)
            }
        } else {
            setConvertedAmount(null)
        }
    }, [expression, exchangeRate, needsCurrencyConversion])

    const getCurrencySymbol = (code?: string) => {
        if (!code) return "$"
        switch (code) {
            case 'PEN': return 'S/.'
            case 'EUR': return '€'
            case 'GBP': return '£'
            default: return '$'
        }
    }

    const formatBalance = (balance: number, currencyCode: string) => {
        const symbol = getCurrencySymbol(currencyCode)
        const formatted = Math.abs(balance).toLocaleString('es-PE', { minimumFractionDigits: 2 })
        return balance < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`
    }

    // Evaluate mathematical expression safely
    const evaluateExpression = (expr: string): number => {
        try {
            // Replace display operators with JS operators
            let sanitized = expr
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '.')

            // Only allow numbers, operators, and decimal points
            if (!/^[\d+\-*/.()\s]+$/.test(sanitized)) {
                return parseFloat(sanitized) || 0
            }

            // Use Function constructor for safe evaluation
            const result = new Function(`return ${sanitized}`)()
            return typeof result === 'number' && isFinite(result) ? result : 0
        } catch {
            return 0
        }
    }

    // Update display value whenever expression changes
    useEffect(() => {
        const result = evaluateExpression(expression)
        // Format the result for display
        const formatted = result % 1 === 0
            ? result.toString()
            : result.toFixed(2).replace('.', ',')
        setDisplayValue(formatted)
    }, [expression])

    const handleNumberClick = (num: string) => {
        if (expression === "0" && num !== ",") {
            setExpression(num)
        } else {
            setExpression(prev => prev + (num === "," ? "." : num))
        }
    }

    const handleDelete = () => {
        if (expression.length > 1) {
            setExpression(prev => prev.slice(0, -1))
        } else {
            setExpression("0")
        }
    }

    const handleOperator = (op: string) => {
        // Check if last character is already an operator, replace it
        const lastChar = expression.slice(-1)
        if (['+', '-', '*', '/'].includes(lastChar)) {
            setExpression(prev => prev.slice(0, -1) + op)
        } else {
            setExpression(prev => prev + op)
        }
    }

    const handleClear = () => {
        setExpression("0")
    }

    const handleSubmit = async () => {
        if (!fromAccountId || !toAccountId) {
            toast.error("Selecciona ambas cuentas")
            return
        }
        if (fromAccountId === toAccountId) {
            toast.error("Las cuentas deben ser diferentes")
            return
        }

        const amount = evaluateExpression(expression)
        if (amount <= 0) {
            toast.error("El monto debe ser mayor a 0")
            return
        }

        // If different currencies, ensure we have exchange rate
        if (needsCurrencyConversion && !exchangeRate) {
            toast.error("No se encontró tasa de cambio para estas monedas")
            return
        }

        setIsSubmitting(true)
        try {
            const transactionDate = new Date(selectedDate)
            transactionDate.setHours(selectedHour, selectedMinute)

            // Calculate the amount to receive in destination currency
            const destinationAmount = needsCurrencyConversion && exchangeRate
                ? amount * exchangeRate
                : amount

            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'TRANSFER',
                    amount: amount,
                    description: description || 'Transferencia',
                    date: transactionDate.toISOString(),
                    accountId: fromAccountId,
                    transferToAccountId: toAccountId,
                    currency: fromAccount?.currencyCode,
                    // Include conversion info if needed
                    ...(needsCurrencyConversion && exchangeRate && {
                        exchangeRate: exchangeRate,
                        destinationAmount: destinationAmount,
                        destinationCurrency: toAccount?.currencyCode
                    })
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Error al transferir')
            }

            toast.success("Transferencia realizada")
            onOpenChange(false)
            onSuccess?.()

            // Reset form
            setExpression("0")
            setDisplayValue("0")
            setDescription("")
            setToAccountId("")
        } catch (error: any) {
            toast.error(error.message || "Error al transferir")
        } finally {
            setIsSubmitting(false)
        }
    }

    const availableToAccounts = accounts?.filter((a: any) => a.id !== fromAccountId) || []
    const availableCurrencies = [...new Set(accounts?.map((a: any) => a.currencyCode) || ["PEN", "USD"])]

    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    const closeSubModal = () => setActiveSubModal('none')

    return (
        <>
            {/* Main Transfer Modal */}
            <Dialog open={open && activeSubModal === 'none'} onOpenChange={onOpenChange}>
                <DialogContent className="w-[95vw] max-w-[420px] max-h-[90vh] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[24px] overflow-hidden flex flex-col" showCloseButton={false}>
                    <DialogTitle className="sr-only">Transferir Saldo</DialogTitle>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-2">
                            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Transferir Saldo</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 h-7 w-7"
                            >
                                <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            </Button>
                        </div>

                        {/* Description Input */}
                        <div className="px-4 pb-2">
                            <div className="relative">
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Transferir saldo"
                                    className="h-9 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-lg text-sm font-medium pr-8 text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-bold text-xs">T</span>
                            </div>
                        </div>

                        {/* Date & Time Row */}
                        <div className="px-4 pb-2 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setActiveSubModal('date')}
                                className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                            >
                                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <CalendarIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                                    {isToday ? "Hoy" : format(selectedDate, "d MMM", { locale: es })}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSubModal('time')}
                                className="text-sm font-mono text-zinc-400 dark:text-zinc-500 tracking-wider cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                            </button>
                        </div>

                        {/* Account Selection */}
                        <div className="px-4 pb-2 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveSubModal('fromAccount')}
                                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-colors text-zinc-700 dark:text-zinc-200 min-w-[90px] text-center"
                            >
                                {fromAccount?.name || "Seleccionar"}
                                <br />
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">{fromAccount?.currencyCode || "---"}</span>
                            </button>

                            <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                            </div>

                            <button
                                type="button"
                                onClick={() => setActiveSubModal('toAccount')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg border-2 font-bold text-xs cursor-pointer transition-colors min-w-[90px] text-center",
                                    toAccount
                                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 text-blue-600 dark:text-blue-400"
                                        : "bg-zinc-50 dark:bg-zinc-800/50 border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 hover:border-blue-400 dark:hover:border-blue-500"
                                )}
                            >
                                {toAccount?.name || "Seleccionar"}
                                {toAccount ? (
                                    <>
                                        <br />
                                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">{toAccount?.currencyCode}</span>
                                    </>
                                ) : (
                                    <>
                                        <br />
                                        <span className="text-[9px] font-medium">cuenta</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Exchange Rate Info */}
                        {needsCurrencyConversion && (
                            <div className="px-4 pb-1">
                                <div className="flex items-center justify-center gap-2 text-[10px]">
                                    {isLoadingRate ? (
                                        <span className="text-zinc-400 flex items-center gap-1">
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            Cargando...
                                        </span>
                                    ) : exchangeRate ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                            1 {fromAccount?.currencyCode} = {exchangeRate.toFixed(4)} {toAccount?.currencyCode}
                                        </span>
                                    ) : (
                                        <span className="text-red-500">Sin tasa disponible</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Amount Display */}
                        <div className="px-4 py-1 text-center">
                            <button
                                type="button"
                                onClick={() => setActiveSubModal('currency')}
                                className="cursor-pointer hover:opacity-70 transition-opacity"
                            >
                                <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100">
                                    {getCurrencySymbol(fromAccount?.currencyCode || currency)}{displayValue}{" "}
                                    <span className="text-sm text-zinc-400 dark:text-zinc-500 font-semibold">{fromAccount?.currencyCode || currency}</span>
                                </span>
                            </button>
                            {/* Converted Amount Display - inline */}
                            {needsCurrencyConversion && convertedAmount !== null && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    = {getCurrencySymbol(toAccount?.currencyCode)}{convertedAmount.toFixed(2).replace('.', ',')} {toAccount?.currencyCode}
                                </div>
                            )}
                        </div>

                        {/* Number Pad */}
                        <div className="px-4 pb-3">
                            <div className="grid grid-cols-4 gap-1.5">
                                <button type="button" onClick={() => handleNumberClick("1")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">1</button>
                                <button type="button" onClick={() => handleNumberClick("2")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">2</button>
                                <button type="button" onClick={() => handleNumberClick("3")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">3</button>
                                <button type="button" onClick={() => handleOperator("/")} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-bold text-lg text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors active:scale-95">÷</button>

                                <button type="button" onClick={() => handleNumberClick("4")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">4</button>
                                <button type="button" onClick={() => handleNumberClick("5")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">5</button>
                                <button type="button" onClick={() => handleNumberClick("6")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">6</button>
                                <button type="button" onClick={() => handleOperator("*")} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-bold text-lg text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors active:scale-95">×</button>

                                <button type="button" onClick={() => handleNumberClick("7")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">7</button>
                                <button type="button" onClick={() => handleNumberClick("8")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">8</button>
                                <button type="button" onClick={() => handleNumberClick("9")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">9</button>
                                <button type="button" onClick={() => handleOperator("-")} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-bold text-lg text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors active:scale-95">-</button>

                                <button type="button" onClick={() => handleNumberClick(",")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">,</button>
                                <button type="button" onClick={() => handleNumberClick("0")} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-800 dark:text-zinc-100 active:scale-95">0</button>
                                <button type="button" onClick={handleDelete} className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-base cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center active:scale-95">
                                    <Delete className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                                </button>
                                <button type="button" onClick={() => handleOperator("+")} className="h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-bold text-lg text-zinc-500 dark:text-zinc-400 cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors active:scale-95">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button - Fixed at bottom outside scroll area */}
                    <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !toAccountId || evaluateExpression(expression) <= 0 || (needsCurrencyConversion && !exchangeRate)}
                            className="w-full h-11 rounded-xl bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Transferiendo..." : "Transferir"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* FROM Account Selection Dialog */}
            <Dialog open={activeSubModal === 'fromAccount'} onOpenChange={(open) => !open && closeSubModal()}>
                <DialogContent className="w-[95vw] max-w-[400px] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[20px] overflow-hidden" showCloseButton={false}>
                    <DialogTitle className="sr-only">Seleccionar Cuenta Origen</DialogTitle>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Cuenta Origen</h3>
                        <Button variant="ghost" size="icon" onClick={closeSubModal} className="rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 h-8 w-8">
                            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                    </div>
                    <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                        {accounts?.map((acc: any) => (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                    setFromAccountId(acc.id)
                                    setCurrency(acc.currencyCode || "PEN")
                                    closeSubModal()
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all",
                                    fromAccountId === acc.id
                                        ? "bg-purple-50 dark:bg-purple-900/20"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        fromAccountId === acc.id
                                            ? "border-purple-500 bg-purple-500"
                                            : "border-zinc-300 dark:border-zinc-600"
                                    )}>
                                        {fromAccountId === acc.id && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">{acc.name}</span>
                                </div>
                                <span className={cn(
                                    "font-semibold text-sm",
                                    Number(acc.currentBalance) < 0 ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"
                                )}>
                                    {formatBalance(Number(acc.currentBalance), acc.currencyCode)}
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* TO Account Selection Dialog */}
            <Dialog open={activeSubModal === 'toAccount'} onOpenChange={(open) => !open && closeSubModal()}>
                <DialogContent className="w-[95vw] max-w-[400px] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[20px] overflow-hidden" showCloseButton={false}>
                    <DialogTitle className="sr-only">Seleccionar Cuenta Destino</DialogTitle>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Cuenta Destino</h3>
                        <Button variant="ghost" size="icon" onClick={closeSubModal} className="rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 h-8 w-8">
                            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                    </div>
                    <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
                        {availableToAccounts.map((acc: any) => (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                    setToAccountId(acc.id)
                                    closeSubModal()
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all",
                                    toAccountId === acc.id
                                        ? "bg-blue-50 dark:bg-blue-900/20"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                        toAccountId === acc.id
                                            ? "border-blue-500 bg-blue-500"
                                            : "border-zinc-300 dark:border-zinc-600"
                                    )}>
                                        {toAccountId === acc.id && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <div className="text-left">
                                        <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">{acc.name}</span>
                                        {acc.currencyCode !== fromAccount?.currencyCode && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400">Moneda diferente</span>
                                        )}
                                    </div>
                                </div>
                                <span className={cn(
                                    "font-semibold text-sm",
                                    Number(acc.currentBalance) < 0 ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"
                                )}>
                                    {formatBalance(Number(acc.currentBalance), acc.currencyCode)}
                                </span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Currency Selection Dialog */}
            <Dialog open={activeSubModal === 'currency'} onOpenChange={(open) => !open && closeSubModal()}>
                <DialogContent className="w-[95vw] max-w-[350px] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[20px] overflow-hidden" showCloseButton={false}>
                    <DialogTitle className="sr-only">Seleccionar Moneda</DialogTitle>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">Moneda</h3>
                        <Button variant="ghost" size="icon" onClick={closeSubModal} className="rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 h-8 w-8">
                            <X className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        </Button>
                    </div>
                    <div className="p-3 space-y-1">
                        {availableCurrencies.map((curr: string) => (
                            <button
                                key={curr}
                                type="button"
                                onClick={() => {
                                    setCurrency(curr)
                                    closeSubModal()
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all",
                                    currency === curr
                                        ? "bg-purple-50 dark:bg-purple-900/20"
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                    currency === curr
                                        ? "border-purple-500 bg-purple-500"
                                        : "border-zinc-300 dark:border-zinc-600"
                                )}>
                                    {currency === curr && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="font-semibold text-zinc-800 dark:text-zinc-100">{curr}</span>
                                <span className="text-zinc-400 dark:text-zinc-500 text-sm">({getCurrencySymbol(curr)})</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Date Picker Dialog */}
            <Dialog open={activeSubModal === 'date'} onOpenChange={(open) => !open && closeSubModal()}>
                <DialogContent className="w-[95vw] max-w-[350px] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[20px] overflow-hidden" showCloseButton={false}>
                    <DialogTitle className="sr-only">Seleccionar Fecha</DialogTitle>
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Fecha</p>
                        <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 capitalize">
                            {format(selectedDate, "EEEE, d MMMM", { locale: es })}
                        </p>
                    </div>
                    <div className="flex justify-center p-2">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) setSelectedDate(date)
                            }}
                            locale={es}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                        <Button variant="ghost" onClick={closeSubModal} className="cursor-pointer text-zinc-500 dark:text-zinc-400">
                            Cancelar
                        </Button>
                        <Button onClick={closeSubModal} className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white">
                            Aceptar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Time Picker Dialog */}
            <Dialog open={activeSubModal === 'time'} onOpenChange={(open) => !open && closeSubModal()}>
                <DialogContent className="w-[95vw] max-w-[300px] p-0 gap-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[20px] overflow-hidden" showCloseButton={false}>
                    <DialogTitle className="sr-only">Seleccionar Hora</DialogTitle>
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Hora</p>
                        <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 font-mono">
                            {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-center gap-4">
                            {/* Hour Spinner */}
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => setSelectedHour(h => h >= 23 ? 0 : h + 1)}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                                >
                                    <ChevronUp className="w-6 h-6" />
                                </button>
                                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center">
                                    <span className="text-3xl font-bold text-white font-mono">
                                        {selectedHour.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedHour(h => h <= 0 ? 23 : h - 1)}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                                >
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>

                            <span className="text-3xl font-bold text-zinc-300 dark:text-zinc-600">:</span>

                            {/* Minute Spinner */}
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMinute(m => m >= 59 ? 0 : m + 1)}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                                >
                                    <ChevronUp className="w-6 h-6" />
                                </button>
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                                    <span className="text-3xl font-bold text-zinc-800 dark:text-zinc-100 font-mono">
                                        {selectedMinute.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedMinute(m => m <= 0 ? 59 : m - 1)}
                                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                                >
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Quick minute buttons */}
                        <div className="flex justify-center gap-2 mt-4">
                            {[0, 15, 30, 45].map(min => (
                                <button
                                    key={min}
                                    type="button"
                                    onClick={() => setSelectedMinute(min)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors",
                                        selectedMinute === min
                                            ? "bg-blue-500 text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    )}
                                >
                                    :{min.toString().padStart(2, '0')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                        <Button variant="ghost" onClick={closeSubModal} className="cursor-pointer text-zinc-500 dark:text-zinc-400">
                            Cancelar
                        </Button>
                        <Button onClick={closeSubModal} className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white">
                            Aceptar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
