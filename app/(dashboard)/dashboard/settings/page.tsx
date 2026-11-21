"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
    ArrowLeft,
    ChevronRight,
    Download,
    Globe,
    Info,
    ListOrdered,
    Palette,
    Settings as SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useSystemBranding } from "@/hooks/useSystemBranding"
import {
    GeneralSettingsSection,
    AppearanceSettingsSection,
    TransactionsSettingsSection,
    LocalizationSettingsSection,
    DataSettingsSection,
    AboutSettingsSection,
} from "@/components/settings/cashew-sections"

type SectionId = "general" | "appearance" | "transactions" | "localization" | "data" | "about"

interface SectionMeta {
    id: SectionId
    title: string
    subtitle: string
    icon: any
}

function SettingsContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const branding = useSystemBranding()
    const isDesktop = useMediaQuery("(min-width: 1024px)")

    const sections: SectionMeta[] = [
        {
            id: "general",
            title: "Configuración general",
            subtitle: "Perfil, bloqueo con PIN, respuesta háptica, edición de datos",
            icon: SettingsIcon,
        },
        {
            id: "appearance",
            title: "Tema y estilo",
            subtitle: "Color del tema, Material You, íconos, animaciones, fuente",
            icon: Palette,
        },
        {
            id: "transactions",
            title: "Transacciones",
            subtitle: "Nueva transacción, adjuntos, transacciones programadas",
            icon: ListOrdered,
        },
        {
            id: "localization",
            title: "Localización y formato",
            subtitle: "País, moneda principal, zona horaria y formato numérico",
            icon: Globe,
        },
        {
            id: "data",
            title: "Importar y exportar datos",
            subtitle: "Importar CSV, copias de seguridad JSON, Google Drive",
            icon: Download,
        },
        {
            id: "about",
            title: `Acerca de ${branding.appName.split(" ")[0] || "Lumio"}`,
            subtitle: "Información, guía de inicio y desarrollador",
            icon: Info,
        },
    ]

    const rawSection = searchParams.get("section")
    const legacyTab = searchParams.get("tab")

    const mapLegacy = (tab?: string | null): SectionId | null => {
        if (!tab) return null
        if (tab === "appearance") return "appearance"
        if (tab === "regional" || tab === "strategy") return "localization"
        if (tab === "data" || tab === "ai" || tab === "reports") return "data"
        return null
    }

    const activeSectionParam = (rawSection as SectionId | null) || mapLegacy(legacyTab)
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const selectSection = (id: SectionId | null) => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete("tab")
        if (id) params.set("section", id)
        else params.delete("section")
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }

    if (!mounted) return null

    // Desktop defaults to "general" when no section is chosen; Mobile shows clean Hub first
    const resolvedSection: SectionId | null = isDesktop
        ? activeSectionParam || "general"
        : activeSectionParam || null

    const currentMeta = sections.find((s) => s.id === resolvedSection)

    const renderSectionBody = (id: SectionId) => {
        switch (id) {
            case "general":
                return <GeneralSettingsSection onNavigateSection={(s) => selectSection(s as SectionId)} />
            case "appearance":
                return <AppearanceSettingsSection />
            case "transactions":
                return <TransactionsSettingsSection />
            case "localization":
                return <LocalizationSettingsSection />
            case "data":
                return <DataSettingsSection />
            case "about":
                return <AboutSettingsSection />
        }
    }

    return (
        <div className="max-w-6xl mx-auto py-4 sm:py-6 px-1 sm:px-4 pb-28 animate-in fade-in duration-300">
            {/* MOBILE HUB (when no section selected) */}
            {!isDesktop && !resolvedSection && (
                <div className="space-y-6">
                    <h1 className="text-2xl font-black tracking-tight text-center text-foreground">
                        Ajustes
                    </h1>

                    <div className="rounded-3xl bg-card border border-border/60 divide-y divide-border/50 overflow-hidden shadow-sm">
                        {sections.map((sec) => (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => selectSection(sec.id)}
                                className="w-full flex items-center gap-3.5 px-4 py-4 text-left hover:bg-muted/35 active:bg-muted/50 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-[var(--icon-radius,0.85rem)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <sec.icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-foreground leading-snug">
                                        {sec.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-snug line-clamp-1 mt-0.5">
                                        {sec.subtitle}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* MOBILE DRILL-DOWN */}
            {!isDesktop && resolvedSection && currentMeta && (
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => selectSection(null)}
                            className="h-10 w-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
                            aria-label="Volver a Ajustes"
                        >
                            <ArrowLeft className="h-4.5 w-4.5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-black tracking-tight text-foreground truncate">
                                {currentMeta.title}
                            </h1>
                        </div>
                    </div>

                    {renderSectionBody(resolvedSection)}
                </div>
            )}

            {/* DESKTOP MASTER-DETAIL */}
            {isDesktop && resolvedSection && (
                <div className="grid grid-cols-[290px_1fr] gap-7 items-start">
                    {/* Left Menu */}
                    <aside className="sticky top-24 space-y-4">
                        <div className="px-2">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                Ajustes
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Personaliza tu experiencia financiera
                            </p>
                        </div>

                        <nav className="rounded-3xl bg-card border border-border/60 divide-y divide-border/40 overflow-hidden shadow-xs">
                            {sections.map((sec) => {
                                const active = resolvedSection === sec.id
                                return (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => selectSection(sec.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all",
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-muted/35 text-foreground"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-9 w-9 rounded-[var(--icon-radius,0.85rem)] flex items-center justify-center shrink-0 transition-colors",
                                                active
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <sec.icon className="h-4.5 w-4.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    "text-sm leading-tight truncate",
                                                    active ? "font-extrabold" : "font-semibold"
                                                )}
                                            >
                                                {sec.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                {sec.subtitle}
                                            </p>
                                        </div>
                                    </button>
                                )
                            })}
                        </nav>
                    </aside>

                    {/* Right Detail */}
                    <div className="min-w-0 space-y-5">
                        {currentMeta && (
                            <div className="px-1">
                                <h2 className="text-xl font-black tracking-tight text-foreground">
                                    {currentMeta.title}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {currentMeta.subtitle}
                                </p>
                            </div>
                        )}

                        {renderSectionBody(resolvedSection)}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function SettingsPage() {
    return (
        <Suspense fallback={null}>
            <SettingsContent />
        </Suspense>
    )
}
