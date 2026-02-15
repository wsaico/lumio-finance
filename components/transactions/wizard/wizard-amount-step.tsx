
"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Delete, Check } from "lucide-react"
import { useAccounts } from "@/hooks/useAccounts"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { getCurrencySymbol } from "@/lib/utils" // Ensure this exists or mock it inline

interface WizardAmountStepProps {
    initialAmount: number
    currency: string
    onComplete: (amount: number, accountId: string, notes?: string) => void
    onBack: () => void
}

export function WizardAmountStep({ initialAmount, currency: initialCurrency, onComplete, onBack }: WizardAmountStepProps) {
    const [display, setDisplay] = useState(initialAmount > 0 ? initialAmount.toString() : "0")
    const { accounts } = useAccounts()
    const [selectedAccountId, setSelectedAccountId] = useState(accounts?.[0]?.id || "")

    // Update selected account if accounts load late
    useEffect(() => {
        if (!selectedAccountId && accounts && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id)
        }
    }, [accounts, selectedAccountId])

    // Get current account details
    const selectedAccount = accounts?.find(a => a.id === selectedAccountId)
    const currentCurrency = selectedAccount?.currencyCode || initialCurrency || 'USD'

    // Core Logic for handling input
    const handleInput = useCallback((key: string) => {
        setDisplay(prev => {
            if (key === 'AC') return "0"
            if (key === 'DEL' || key === 'Backspace') {
                if (prev.length === 1) return "0"
                return prev.slice(0, -1)
            }
            if (key === 'Enter') return prev // Confirmation handled separately

            // Numbers and Dot
            if (prev === "0" && key !== '.') {
                return key
            }
            if (key === '.' && prev.includes('.')) return prev

            // Limit length reasonably
            if (prev.length > 10) return prev

            return prev + key
        })
    }, [])

    const handleConfirm = useCallback(() => {
        const val = parseFloat(display)
        if (val > 0) {
            onComplete(val, selectedAccountId)
        }
    }, [display, selectedAccountId, onComplete])

    // Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key
            // Allow numbers
            if (/^[0-9]$/.test(key)) {
                handleInput(key)
                return
            }
            if (key === '.') {
                handleInput('.')
                return
            }
            if (key === 'Backspace') {
                handleInput('DEL')
                return
            }
            if (key === 'Enter') {
                handleConfirm()
                return
            }
            if (key === 'Escape') {
                handleInput('AC')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleInput, handleConfirm])


    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
        >
            <div className="flex-1 bg-primary/5 flex flex-col justify-center items-center p-6 relative">
                <div className="absolute top-4 right-4">
                    {/* Premium Account Selector */}
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-fit min-w-[140px] h-10 rounded-full bg-background border-primary/20 shadow-sm hover:border-primary/50 transition-colors gap-2 px-4">
                            <SelectValue placeholder="Seleccionar cuenta" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl border-primary/10 shadow-lg">
                            {accounts?.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} className="rounded-lg py-2 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color || '#3b82f6' }} />
                                        <span className="font-medium">{acc.name}</span>
                                        <span className="text-xs text-muted-foreground ml-1 bg-muted px-1.5 py-0.5 rounded-md">
                                            {acc.currencyCode}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <p className="text-sm text-muted-foreground uppercase font-bold mb-2 tracking-widest">Monto</p>
                <div className="flex items-baseline gap-2 text-primary animate-in zoom-in-50 duration-300">
                    <span className="text-4xl font-light opacity-70">
                        {currentCurrency === 'USD' ? '$' : 'S/.'}
                    </span>
                    <span className="text-7xl font-bold tracking-tighter tabular-nums drop-shadow-sm">
                        {display}
                    </span>
                </div>
            </div>

            {/* Keypad */}
            <div className="bg-card w-full p-4 pb-8 border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-10">
                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                    {['7', '8', '9', 'AC'].map(k => (
                        <KeyBtn key={k} label={k} onClick={() => handleInput(k)} variant={k === 'AC' ? 'destructive' : 'default'} />
                    ))}
                    {['4', '5', '6', 'DEL'].map(k => (
                        <KeyBtn
                            key={k}
                            label={k}
                            icon={k === 'DEL' ? Delete : undefined}
                            onClick={() => handleInput(k)}
                            variant={k === 'DEL' ? 'secondary' : 'default'}
                        />
                    ))}
                    {['1', '2', '3', ''].map(k => (
                        k ? <KeyBtn key={k} label={k} onClick={() => handleInput(k)} /> : <div key="empty" />
                    ))}
                    <KeyBtn label="0" onClick={() => handleInput('0')} className="col-span-2" />
                    <KeyBtn label="." onClick={() => handleInput('.')} />
                    <Button
                        onClick={handleConfirm}
                        className="h-16 rounded-2xl text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 active:scale-95 transition-all w-full col-span-1"
                    >
                        <Check className="w-8 h-8" />
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}

function KeyBtn({ label, icon: Icon, onClick, className, variant = "default" }: any) {
    const isNum = !isNaN(Number(label)) || label === '.'

    return (
        <button
            onClick={(e) => {
                e.preventDefault()
                onClick()
            }}
            className={cn(
                "h-16 rounded-2xl flex items-center justify-center text-2xl font-semibold transition-all active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-primary/20",
                isNum ? "bg-muted/30 hover:bg-muted/60 text-foreground" :
                    variant === 'destructive' ? "bg-rose-100 text-rose-600 dark:bg-rose-900/20 hover:bg-rose-200 dark:hover:bg-rose-900/40" :
                        "bg-muted/80 text-foreground hover:bg-muted",
                className
            )}
        >
            {Icon ? <Icon className="w-6 h-6" /> : label}
        </button>
    )
}
