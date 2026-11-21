import Link from "next/link"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
    title: "Política de Privacidad — Lumio Finance",
    description: "Cómo protegemos tus datos financieros y privacidad dentro de Lumio Finance.",
}

export default function PrivacidadPage() {
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
                    <h1 className="text-3xl font-black tracking-tight">Política de Privacidad</h1>
                    <p className="text-xs text-muted-foreground">Última actualización: noviembre de 2026</p>
                </div>

                <div className="space-y-6 text-sm text-muted-foreground leading-relaxed rounded-3xl bg-card border border-border/70 p-6 sm:p-8">
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">1. Aislamiento total de tu cuenta</h2>
                        <p>
                            Cada cuenta en Lumio Finance está estrictamente separada mediante autenticación cifrada y políticas de acceso por fila (Row Level Security). Ningún otro usuario puede ver, consultar ni operar sobre tus cuentas, movimientos o metas.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">2. Datos que registras</h2>
                        <p>
                            Únicamente almacenamos la información necesaria para operar tu panel: nombre, correo, moneda, zona horaria y los registros financieros que tú decidas ingresar o importar. Puedes exportar una copia completa en JSON/CSV o eliminar tus datos desde Ajustes en cualquier momento.
                        </p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-base font-black text-foreground">3. Responsable</h2>
                        <p>
                            Plataforma desarrollada por <strong className="text-foreground">Wilber Saico</strong> (
                            <a href="https://esaico.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                esaico.com
                            </a>
                            ).
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
