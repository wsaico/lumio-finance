"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowRight,
    Check,
    LayoutDashboard,
    Plus,
    PieChart,
    Settings,
    Wallet,
    X,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TourStep {
    title: string
    description: string
    icon: any
    tip: string
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Tu resumen en una vista",
        description:
            "En Inicio ves tu patrimonio real, ingresos y gastos del mes, y lo que falta para cubrir tus presupuestos sin hojas de cálculo.",
        icon: LayoutDashboard,
        tip: "Puedes ocultar cualquier monto con el ícono del ojo en la barra superior.",
    },
    {
        title: "Registra gastos en 3 segundos",
        description:
            "Usa el botón + o la tecla N en escritorio para abrir el registro rápido con calculadora integrada y sugerencias automáticas.",
        icon: Plus,
        tip: "Si pagas con tarjeta de crédito, tu deuda disponible se actualiza sola.",
    },
    {
        title: "Cuentas, tarjetas y etiquetas",
        description:
            "Separa efectivo, bancos y tarjetas de crédito en distintas monedas, y agrupa movimientos con etiquetas creables como Viaje o Hogar.",
        icon: Wallet,
        tip: "Puedes usar Ctrl + K (o ⌘K) para buscar o registrar escribiendo, ej. 'gasto 25 café'.",
    },
    {
        title: "Planifica y adelántate al mes",
        description:
            "Crea presupuestos mensuales, metas de ahorro, préstamos por cobrar o pagar y suscripciones automáticas.",
        icon: PieChart,
        tip: "Tienes 15 días de acceso completo a todas estas herramientas.",
    },
    {
        title: "Ajusta todo a tu manera",
        description:
            "En Ajustes cambias tu país y zona horaria, activas Material You, bloqueo con PIN de 4 dígitos o importas tus datos en CSV.",
        icon: Settings,
        tip: "Si necesitas volver a ver esta guía o el asistente inicial, está en Ajustes → Acerca de.",
    },
]

export function GuidedTour() {
    const [active, setActive] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)

    useEffect(() => {
        const handler = () => {
            setStepIndex(0)
            setActive(true)
        }
        window.addEventListener("lumio:start-tour", handler)
        return () => window.removeEventListener("lumio:start-tour", handler)
    }, [])

    if (!active) return null

    const step = TOUR_STEPS[stepIndex]
    const Icon = step.icon
    const isLast = stepIndex === TOUR_STEPS.length - 1

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[180] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
                <motion.div
                    key={stepIndex}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-md rounded-3xl bg-card border border-border/80 shadow-2xl p-6 space-y-5"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                                    Paso {stepIndex + 1} de {TOUR_STEPS.length}
                                </span>
                                <h3 className="text-lg font-black text-foreground leading-snug">
                                    {step.title}
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActive(false)}
                            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Cerrar recorrido"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                    </p>

                    <div className="rounded-2xl bg-muted/50 border border-border/50 px-3.5 py-2.5 text-xs text-foreground/85 font-medium">
                        {step.tip}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setStepIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all ${
                                        idx === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                                    }`}
                                    aria-label={`Ir al paso ${idx + 1}`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            {stepIndex > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStepIndex((i) => i - 1)}
                                    className="rounded-xl text-xs font-semibold"
                                >
                                    Atrás
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    if (isLast) {
                                        setActive(false)
                                    } else {
                                        setStepIndex((i) => i + 1)
                                    }
                                }}
                                className="rounded-xl px-4 font-bold text-xs gap-1.5"
                            >
                                {isLast ? (
                                    <>
                                        Listo <Check className="h-3.5 w-3.5" />
                                    </>
                                ) : (
                                    <>
                                        Siguiente <ArrowRight className="h-3.5 w-3.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
