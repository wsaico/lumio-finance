"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ChevronRight, Wallet, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePettyCashFunds } from "@/hooks/use-petty-cash"

interface FundSelectionStepProps {
    onNext: (data: { fundId: string; fundCode: string; responsibleName: string }) => void
    onBack: () => void
}

export function FundSelectionStep({ onNext, onBack }: FundSelectionStepProps) {
    const { data: funds, isLoading } = usePettyCashFunds('ACTIVE')
    const [selectedFund, setSelectedFund] = useState<string | null>(null)

    const handleContinue = () => {
        const fund = funds?.find((f: any) => f.id === selectedFund)
        if (fund) {
            onNext({
                fundId: fund.id,
                fundCode: fund.fundCode,
                responsibleName: fund.responsibleName
            })
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
                    onClick={onBack}
                    className="rounded-full w-10 h-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">Liquidar Fondo Fijo</h1>
                    <p className="text-xs text-muted-foreground">Paso 2 de 4 • Selección de Fondo</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto p-6 md:p-12">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-4xl font-black mb-3">
                        Selecciona el Fondo
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Elige el fondo de caja chica que deseas liquidar
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Cargando fondos...</p>
                    </div>
                ) : funds && funds.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        {funds.map((fund: any) => {
                            const balance = Number(fund.currentBalance)
                            const assigned = Number(fund.assignedAmount)
                            const spent = assigned - balance
                            const percentage = assigned > 0 ? (spent / assigned) * 100 : 0
                            const isSelected = selectedFund === fund.id
                            const needsSettlement = percentage >= Number(fund.settlementThreshold)

                            return (
                                <Card
                                    key={fund.id}
                                    className={cn(
                                        "p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] relative overflow-hidden",
                                        isSelected && "ring-2 ring-orange-500 shadow-xl shadow-orange-500/20",
                                        needsSettlement && "border-amber-500"
                                    )}
                                    onClick={() => setSelectedFund(fund.id)}
                                >
                                    {/* Background gradient */}
                                    < div className={
                                        cn(
                                            "absolute inset-0 opacity-0 transition-opacity",
                                            isSelected && "opacity-100 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20"
                                        )} />

                                    <div className="relative space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg mb-1">{fund.fundName}</h3>
                                                <Badge variant="outline" className="font-mono text-xs">
                                                    {fund.fundCode}
                                                </Badge>
                                            </div>
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                                isSelected
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-slate-100 dark:bg-zinc-800"
                                            )}>
                                                <Wallet className="w-6 h-6" />
                                            </div>
                                        </div>

                                        {/* Responsible */}
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Responsable:</span> {fund.responsibleName}
                                            {fund.department && ` • ${fund.department}`}
                                        </div>

                                        {/* Progress */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Gastado</span>
                                                <span className="font-bold">
                                                    S/ {spent.toFixed(2)} ({percentage.toFixed(0)}%)
                                                </span>
                                            </div>
                                            <Progress
                                                value={percentage}
                                                className={cn(
                                                    "h-3",
                                                    percentage >= Number(fund.settlementThreshold) && "[&>div]:bg-amber-500"
                                                )}
                                            />
                                        </div>

                                        {/* Balance */}
                                        <div className="flex justify-between items-center pt-3 border-t">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Disponible
                                            </span>
                                            <span className="text-xl font-black text-emerald-600">
                                                S/ {balance.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Settlement Alert */}
                                        {needsSettlement && (
                                            <div className="flex items-center gap-2 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                                <TrendingDown className="w-4 h-4 text-amber-600" />
                                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                                    Requiere liquidación ({fund.settlementThreshold}% alcanzado)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No hay fondos activos disponibles</p>
                    </div>
                )}

                {/* Continue Button */}
                <div className="flex gap-4 mt-12">
                    <Button
                        variant="outline"
                        onClick={onBack}
                        className="h-14 px-8 rounded-2xl"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Atrás
                    </Button>
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedFund}
                        className="flex-1 h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                        Continuar
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div >
    )
}
