"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Check, Crown, Eye, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useSubscription } from "@/hooks/useSubscription"

interface PremiumPreviewGateProps {
    moduleName: string
    summary?: string
    children: React.ReactNode
}

const MUTATION_KEYWORDS = [
    "nuevo",
    "nueva",
    "crear",
    "agregar",
    "registrar",
    "aportar",
    "descargar",
    "exportar",
    "generar",
    "editar",
    "eliminar",
    "pausar",
    "activar",
    "guardar",
    "duplicar",
    "cobrar",
    "pagar",
]

export function PremiumPreviewGate({
    moduleName,
    summary,
    children,
}: PremiumPreviewGateProps) {
    const { isFree, isTrial, trialDaysRemaining, isLoading } = useSubscription()
    const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false)

    // Trial or paid Premium gets full unrestricted access
    if (isLoading || !isFree) {
        return (
            <div className="space-y-4">
                {isTrial && (
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                            <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-semibold text-foreground">
                                Estás en tu prueba gratuita Premium ({trialDaysRemaining}{" "}
                                {trialDaysRemaining === 1 ? "día restante" : "días restantes"}).
                            </span>
                        </div>
                        <Link
                            href="/dashboard/billing"
                            className="font-extrabold text-primary hover:underline shrink-0"
                        >
                            Ver planes desde S/. 10/mes
                        </Link>
                    </div>
                )}
                {children}
            </div>
        )
    }

    const handleCaptureClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null
        if (!target) return

        // Allow navigation links and explicit read-only controls
        if (target.closest("[data-preview-allow]")) return
        const anchor = target.closest("a")
        if (anchor) {
            const href = anchor.getAttribute("href") || ""
            if (href.startsWith("/dashboard/billing") || href.startsWith("/dashboard")) {
                // Block links to creation routes like /savings-goals/new
                if (!href.includes("/new")) return
            }
        }

        const btn = target.closest("button, a[href*='/new']")
        if (!btn) return

        const text = (btn.textContent || btn.getAttribute("aria-label") || "").toLowerCase()
        const isTab = btn.getAttribute("role") === "tab"
        if (isTab) return

        const matchesMutation = MUTATION_KEYWORDS.some((kw) => text.includes(kw))
        if (matchesMutation || btn.getAttribute("data-premium-action") === "true") {
            e.preventDefault()
            e.stopPropagation()
            setUpgradeModalOpen(true)
        }
    }

    const handleCaptureSubmit = (e: React.FormEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setUpgradeModalOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Reader mode CTA banner */}
            <div className="rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                        <Eye className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                                Vista previa · Modo lector
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                Plan Básico Gratis
                            </span>
                        </div>
                        <p className="text-sm font-extrabold text-foreground leading-snug">
                            Estás explorando {moduleName}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {summary ||
                                "Activa Lumio Premium desde S/. 10 al mes (o pago único de por vida S/. 169) para crear, editar y exportar aquí."}
                        </p>
                    </div>
                </div>

                <Button
                    asChild
                    className="h-10 px-5 rounded-2xl font-extrabold text-xs gap-1.5 shrink-0 shadow-md shadow-primary/20"
                >
                    <Link href="/dashboard/billing">
                        <Crown className="h-3.5 w-3.5" />
                        Pasar a Premium
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>

            <div onClickCapture={handleCaptureClick} onSubmitCapture={handleCaptureSubmit}>
                {children}
            </div>

            <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <div className="h-12 w-12 rounded-2xl bg-primary/12 text-primary flex items-center justify-center mb-2">
                            <Lock className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-xl font-black">
                            Desbloquea {moduleName} con Premium
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm leading-relaxed">
                            Tu Plan Básico te mantiene las cuentas y movimientos diarios gratis de por vida. Pásate a Premium para gestionar {moduleName.toLowerCase()} sin límites.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-2xl bg-muted/40 border border-border/60 p-4 space-y-2 text-xs">
                        {[
                            "Cuentas y tarjetas de crédito ilimitadas",
                            "Presupuestos, metas de ahorro y préstamos completos",
                            "Suscripciones automáticas y recordatorios",
                            "Reportes descargables en Excel, PDF y CSV",
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-2 font-semibold text-foreground/90">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => setUpgradeModalOpen(false)}
                            className="rounded-xl"
                        >
                            Seguir explorando
                        </Button>
                        <Button asChild className="rounded-xl font-bold gap-1.5">
                            <Link href="/dashboard/billing">
                                Elegir plan desde S/. 10
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
