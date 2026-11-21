import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
    title: "Términos de Uso — Lumio Finance",
    description: "Condiciones de uso del Plan Básico gratuito, prueba de 15 días y planes Premium en Lumio Finance.",
}

export default function TerminosPage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio
                </Link>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight">Términos de Uso</h1>
                    <p className="text-xs text-muted-foreground">Última actualización: noviembre de 2026</p>
                </div>

                <div className="space-y-6 text-sm text-muted-foreground leading-relaxed rounded-3xl bg-card border border-border/70 p-6 sm:p-8">
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">1. Prueba gratuita y Plan Básico</h2>
                        <p>
                            Toda cuenta nueva incluye un periodo de prueba completa de 15 días sin costo ni obligación de pago. Al finalizar, el usuario conserva acceso permanente al Plan Básico gratuito (1 cuenta activa, movimientos ilimitados y vista previa en modo lector de módulos Premium).
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">2. Planes Premium y pagos</h2>
                        <p>
                            Los planes Premium (Mensual, 6 meses, Anual o De por vida) desbloquean todas las herramientas durante el ciclo adquirido. No realizamos cobros automáticos sorpresa sin autorización del usuario.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">3. Propiedad de los datos</h2>
                        <p>
                            Eres propietario exclusivo de los datos financieros que ingresas y puedes exportarlos o eliminarlos libremente desde Ajustes.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
