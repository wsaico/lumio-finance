"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Sparkles, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"
import { useUser } from "@/hooks/useUser"
import { toast } from "sonner"

export function DemoModeBanner() {
    const { profile, mutateProfile } = useUser()
    const queryClient = useQueryClient()
    const router = useRouter()
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    if (!profile?.demo_mode_active) return null

    const handleExitDemo = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/demo", { method: "DELETE" })
            if (!res.ok) throw new Error("No se pudo limpiar el modo demo")

            await queryClient.invalidateQueries()
            await mutateProfile()
            toast.success("Modo demo desactivado", {
                description: "Tus registros reales permanecen intactos.",
            })
            setConfirmOpen(false)
            router.refresh()
        } catch (err: any) {
            toast.error(err?.message || "No se pudo desactivar el modo demo")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-7 w-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                        <span className="font-bold text-foreground">Modo demostración activo. </span>
                        <span className="text-muted-foreground">
                            Explora todo con datos de ejemplo; al salir no perderás nada de lo que hayas registrado por tu cuenta.
                        </span>
                    </div>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmOpen(true)}
                    disabled={loading}
                    className="h-8 rounded-xl border-primary/30 bg-card text-xs font-bold shrink-0 gap-1.5 self-end sm:self-auto"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Desactivar demo
                </Button>
            </div>

            <ConfirmAlertModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                variant="info"
                title="¿Desactivar el modo demostración?"
                description="Se eliminarán únicamente las cuentas, movimientos y metas de ejemplo. Todo registro real que hayas creado se conservará intacto con sus saldos actualizados."
                confirmLabel="Sí, limpiar ejemplo"
                cancelLabel="Seguir probando"
                onConfirm={handleExitDemo}
            />
        </>
    )
}
