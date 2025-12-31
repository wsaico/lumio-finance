"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ChevronRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettlementCodeStepProps {
    onNext: (data: { settlementCode: string }) => void
}

export function SettlementCodeStep({ onNext }: SettlementCodeStepProps) {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [isValidating, setIsValidating] = useState(false)
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
    const [error, setError] = useState<string | null>(null)

    const validateCode = async (inputCode: string) => {
        if (inputCode.length < 8) {
            setIsAvailable(null)
            setError(null)
            return
        }

        setIsValidating(true)
        setError(null)

        try {
            const response = await fetch(`/api/petty-cash/settlements/check-code?code=${encodeURIComponent(inputCode)}`)
            const data = await response.json()

            if (response.ok) {
                setIsAvailable(data.available)
                if (!data.available) {
                    setError("Este código ya existe. Usa otro código único.")
                }
            } else {
                setError(data.error || "Error al validar código")
                setIsAvailable(null)
            }
        } catch (err) {
            setError("Error de conexión")
            setIsAvailable(null)
        } finally {
            setIsValidating(false)
        }
    }

    const handleCodeChange = (value: string) => {
        const upper = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
        setCode(upper)

        // Debounce validation
        if (upper.length >= 8) {
            const timer = setTimeout(() => validateCode(upper), 500)
            return () => clearTimeout(timer)
        } else {
            setIsAvailable(null)
            setError(null)
        }
    }

    const handleContinue = () => {
        if (code && isAvailable) {
            onNext({ settlementCode: code })
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-b border-border/40 px-4 py-3 flex items-center gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">Liquidar Fondo Fijo</h1>
                    <p className="text-xs text-muted-foreground">Paso 1 de 4 • Código de Liquidación</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto p-6 md:p-12">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Código de Liquidación
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Este código identificará tu liquidación y servirá como número de seguimiento
                    </p>
                </div>

                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    {/* Input */}
                    <div className="relative">
                        <Input
                            value={code}
                            onChange={(e) => handleCodeChange(e.target.value)}
                            placeholder="FF-20252234"
                            className={cn(
                                "h-20 text-3xl text-center font-mono font-bold tracking-wider rounded-2xl border-2 transition-all",
                                isAvailable === true && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
                                isAvailable === false && "border-red-500 bg-red-50 dark:bg-red-950/30",
                                !isAvailable && "border-slate-200 dark:border-zinc-800"
                            )}
                            maxLength={20}
                            autoFocus
                        />
                        {isValidating && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                            </div>
                        )}
                    </div>

                    {/* Validation Messages */}
                    {isAvailable === true && (
                        <Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <AlertDescription className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                ✓ Código disponible y listo para usar
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-5 w-5" />
                            <AlertDescription className="font-semibold">
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-6 rounded-2xl border border-orange-200 dark:border-orange-900">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-3">
                            💡 Formato Sugerido
                        </p>
                        <div className="space-y-2 text-sm text-orange-700 dark:text-orange-300">
                            <p><strong>Opción 1:</strong> FF-YYYYMMDD (ej: FF-20250129)</p>
                            <p><strong>Opción 2:</strong> FF-YYYY-NNNN (ej: FF-2025-0001)</p>
                            <p><strong>Opción 3:</strong> Personalizado (mín. 8 caracteres)</p>
                        </div>
                    </div>

                    {/* Examples */}
                    <div className="flex flex-wrap gap-2">
                        <p className="text-xs text-muted-foreground w-full mb-1">Ejemplos rápidos:</p>
                        {[
                            `FF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
                            `FF-${new Date().getFullYear()}-0001`,
                            `LIQ-${new Date().getFullYear()}-001`
                        ].map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => handleCodeChange(example)}
                                className="px-3 py-1.5 text-xs font-mono font-semibold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Continue Button */}
                <Button
                    onClick={handleContinue}
                    disabled={!code || code.length < 8 || isAvailable !== true || isValidating}
                    className="w-full h-16 text-lg font-bold rounded-2xl mt-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:shadow-none"
                    size="lg"
                >
                    {isValidating ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Validando...
                        </>
                    ) : (
                        <>
                            Continuar
                            <ChevronRight className="ml-2 h-5 w-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
