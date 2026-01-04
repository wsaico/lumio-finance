"use client"

import { useState } from "react"
import { Wand2, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface AutoAssignModalProps {
    cycleId: string
    onSuccess: () => void
    disabled?: boolean
    trigger?: React.ReactNode
}

export function AutoAssignModal({ cycleId, onSuccess, disabled, trigger }: AutoAssignModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleAutoAssign = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/zbb/auto-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cycleId })
            })

            const data = await res.json()

            if (!res.ok) {
                if (data.message) {
                    toast.error(data.message)
                } else {
                    toast.error("Ocurrió un error al intentar auto-asignar.")
                }
                return
            }

            // Case 0: No assignments made
            if (data.assignedCount === 0) {
                // If NO remaining funds either -> Truly empty
                if ((!data.remainingRTAPEN || data.remainingRTAPEN <= 0) && (!data.remainingRTAUSD || data.remainingRTAUSD <= 0)) {
                    const debugInfo = data.debug ? ` (Inc:${data.debug.incomePEN} vs Asg:${data.debug.assignedPEN})` : ""
                    toast.info("No hay fondos disponibles para asignar" + debugInfo)
                } else {
                    // Funds exist but logic decided not to assign (Goals full)
                    const remainingText = (data.remainingRTAPEN > 0 || data.remainingRTAUSD > 0)
                        ? ` Te sobran ${data.remainingRTAPEN > 0 ? "S/" + data.remainingRTAPEN : ""} ${data.remainingRTAUSD > 0 ? "$" + data.remainingRTAUSD : ""} para libre disposición.`
                        : ""
                    toast.success("¡Objetivos Cumplidos! Tus metas ya están al 100%." + remainingText)
                }
                onSuccess()
                setOpen(false)
                return
            }

            // Case > 0: Assignments made
            const remainingMsg = (data.remainingRTAPEN > 0 || data.remainingRTAUSD > 0)
                ? ` Sobran ${data.remainingRTAPEN > 0 ? "S/" + data.remainingRTAPEN : ""} ${data.remainingRTAUSD > 0 ? "$" + data.remainingRTAUSD : ""}.`
                : ""

            toast.success(`Magia completada: ${data.assignedCount} metas financiadas.${remainingMsg}`)
            onSuccess()
            setOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button
                        variant="outline"
                        className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-950/50"
                        disabled={disabled}
                    >
                        <Wand2 className="w-4 h-4" />
                        Auto-Asignar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-indigo-500" />
                        Asignación Inteligente
                    </DialogTitle>
                    <DialogDescription>
                        Lumio distribuirá tus fondos disponibles ("Por Asignar") siguiendo estas prioridades:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-3 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">1</Badge>
                            <span>Metas de Ahorro "Smart Targets"</span>
                        </div>
                        {/* 
                        <div className="flex items-center gap-3 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 opacity-50">
                            <Badge variant="outline">2</Badge>
                            <span>Promedio de Gasto (Próximamente)</span>
                        </div>
                        */}
                    </div>

                    <div className="flex items-start gap-2 p-3 text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 rounded-md">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            Solo se rellenarán las categorías que tengan una Meta de Ahorro vinculada y que aún no hayan alcanzado su cuota mensual.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAutoAssign} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Aplicar Magia
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
