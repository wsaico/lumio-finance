"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, FileText, Eye, Plus, Sparkles } from "lucide-react"
import Link from "next/link"
import Confetti from "react-confetti"
import { useWindowSize } from "@/hooks/use-window-size"

interface ConfirmationStepProps {
    settlementCode: string
    settlementId: string
    fundCode: string
    totalAmount: number
    expenseCount: number
}

export function ConfirmationStep({
    settlementCode,
    settlementId,
    fundCode,
    totalAmount,
    expenseCount
}: ConfirmationStepProps) {
    const router = useRouter()
    const { width, height } = useWindowSize()

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 flex items-center justify-center p-6">
            <Confetti
                width={width}
                height={height}
                recycle={false}
                numberOfPieces={500}
                gravity={0.3}
            />

            <div className="max-w-2xl w-full animate-in zoom-in-95 fade-in duration-500">
                {/* Success Icon */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30 animate-in zoom-in-95 duration-700">
                        <CheckCircle2 className="w-14 h-14 text-white" />
                    </div>
                    <h2 className="text-5xl font-black mb-3 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        ¡Liquidación Creada!
                    </h2>
                    <p className="text-xl text-muted-foreground">
                        Tu liquidación ha sido registrada exitosamente
                    </p>
                </div>

                {/* Settlement Details Card */}
                <Card className="p-8 mb-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-2xl border-2 border-emerald-200 dark:border-emerald-900">
                    <div className="space-y-6">
                        {/* Tracking Code */}
                        <div className="text-center pb-6 border-b">
                            <p className="text-sm text-muted-foreground mb-2">Código de Seguimiento</p>
                            <div className="flex items-center justify-center gap-3">
                                <FileText className="w-6 h-6 text-emerald-600" />
                                <p className="text-4xl font-black font-mono text-emerald-600">
                                    {settlementCode}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Usa este código para rastrear tu liquidación y reposición
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Fondo</p>
                                <Badge variant="outline" className="font-mono text-base px-3 py-1">
                                    {fundCode}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Comprobantes</p>
                                <p className="text-2xl font-bold">{expenseCount}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-muted-foreground mb-1">Total Liquidado</p>
                                <p className="text-4xl font-black text-emerald-600">
                                    S/ {totalAmount.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900">
                            <p className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                                📋 Próximos Pasos
                            </p>
                            <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                                <li>• Finanzas revisará la liquidación</li>
                                <li>• Se procesará la reposición del fondo</li>
                                <li>• Recibirás notificación al aprobar</li>
                            </ul>
                        </div>
                    </div>
                </Card>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-14 rounded-2xl font-semibold"
                        asChild
                    >
                        <Link href={`/dashboard/petty-cash?tab=settlements`}>
                            <Eye className="mr-2 h-5 w-5" />
                            Ver Liquidación
                        </Link>
                    </Button>
                    <Button
                        size="lg"
                        className="h-14 rounded-2xl font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                        onClick={() => router.push('/dashboard/petty-cash/new-settlement')}
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Crear Otra
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    className="w-full mt-4"
                    onClick={() => router.push('/dashboard/petty-cash')}
                >
                    Volver a Caja Chica
                </Button>
            </div>
        </div>
    )
}
