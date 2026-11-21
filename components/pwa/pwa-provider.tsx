"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { Download, Share, X, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
    prompt(): Promise<void>
}

interface PWAContextValue {
    canInstall: boolean
    isInstalled: boolean
    isIOS: boolean
    promptInstall: () => Promise<boolean>
    showIOSHint: boolean
    dismissBanner: () => void
    bannerDismissed: boolean
}

const PWAContext = createContext<PWAContextValue>({
    canInstall: false,
    isInstalled: false,
    isIOS: false,
    promptInstall: async () => false,
    showIOSHint: false,
    dismissBanner: () => {},
    bannerDismissed: true,
})

export function usePWA() {
    return useContext(PWAContext)
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [bannerDismissed, setBannerDismissed] = useState(true)

    useEffect(() => {
        if (typeof window === "undefined") return

        // Register Service Worker
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js", { scope: "/" })
                .catch((err) => console.warn("[PWA] SW registration failed:", err))
        }

        // Detect standalone / installed state
        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true
        setIsInstalled(standalone)

        // Detect iOS Safari
        const ua = window.navigator.userAgent
        const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
        setIsIOS(iosDevice)

        // Check dismissal persistence (7 days)
        const dismissedAt = localStorage.getItem("lumio-pwa-dismissed")
        if (dismissedAt) {
            const elapsed = Date.now() - Number(dismissedAt)
            setBannerDismissed(elapsed < 1000 * 60 * 60 * 24 * 7)
        } else {
            setBannerDismissed(false)
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setDeferredPrompt(null)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstall)
        window.addEventListener("appinstalled", handleAppInstalled)

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
            window.removeEventListener("appinstalled", handleAppInstalled)
        }
    }, [])

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return false
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === "accepted") {
            setDeferredPrompt(null)
            setIsInstalled(true)
            return true
        }
        return false
    }, [deferredPrompt])

    const dismissBanner = useCallback(() => {
        setBannerDismissed(true)
        try {
            localStorage.setItem("lumio-pwa-dismissed", String(Date.now()))
        } catch {}
    }, [])

    const canInstall = !isInstalled && !!deferredPrompt
    const showIOSHint = !isInstalled && isIOS && !deferredPrompt

    return (
        <PWAContext.Provider
            value={{
                canInstall,
                isInstalled,
                isIOS,
                promptInstall,
                showIOSHint,
                dismissBanner,
                bannerDismissed,
            }}
        >
            {children}
        </PWAContext.Provider>
    )
}

export function PWAInstallBanner({ className }: { className?: string }) {
    const { canInstall, showIOSHint, isInstalled, bannerDismissed, promptInstall, dismissBanner } = usePWA()

    if (isInstalled || bannerDismissed || (!canInstall && !showIOSHint)) {
        return null
    }

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm shadow-sm backdrop-blur-md",
                className
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                    <Smartphone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">Instala Lumio en tu dispositivo</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {showIOSHint
                            ? "Toca Compartir y luego «Añadir a pantalla de inicio»"
                            : "Acceso instantáneo en pantalla completa, como una app nativa."}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                {canInstall && (
                    <Button
                        size="sm"
                        onClick={promptInstall}
                        className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 h-9 px-3.5 shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        <span>Instalar</span>
                    </Button>
                )}
                {showIOSHint && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary">
                        <Share className="h-3.5 w-3.5" /> Safari
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={dismissBanner}
                    aria-label="Cerrar aviso de instalación"
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
