"use client"

import { useEffect, useState } from "react"
import { Lock, Delete, LogOut } from "lucide-react"
import { useSettingsStore } from "@/hooks/useSettingsStore"
import { triggerHaptic } from "@/lib/haptics"
import { createClient } from "@/lib/supabase/client"
import { performSafeSignOut } from "@/lib/auth-cleanup"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

export function PinLockOverlay() {
    const { pinLockEnabled, pinCode } = useSettingsStore()
    const queryClient = useQueryClient()
    const [locked, setLocked] = useState(false)
    const [entered, setEntered] = useState("")
    const [errorShake, setErrorShake] = useState(false)

    useEffect(() => {
        if (!pinLockEnabled || pinCode.length !== 4) {
            setLocked(false)
            return
        }
        const unlocked =
            typeof window !== "undefined" &&
            window.sessionStorage.getItem("lumio_pin_unlocked") === "true"
        if (!unlocked) {
            setLocked(true)
        }
    }, [pinLockEnabled, pinCode])

    useEffect(() => {
        const onLock = () => {
            if (pinLockEnabled && pinCode.length === 4) {
                if (typeof window !== "undefined") {
                    window.sessionStorage.removeItem("lumio_pin_unlocked")
                }
                setEntered("")
                setLocked(true)
            }
        }
        window.addEventListener("lumio:lock-pin", onLock)
        return () => window.removeEventListener("lumio:lock-pin", onLock)
    }, [pinLockEnabled, pinCode])

    if (!locked) return null

    const handleDigit = (d: string) => {
        if (entered.length >= 4) return
        triggerHaptic(10)
        const next = entered + d
        setEntered(next)

        if (next.length === 4) {
            if (next === pinCode) {
                triggerHaptic([12, 30, 15])
                if (typeof window !== "undefined") {
                    window.sessionStorage.setItem("lumio_pin_unlocked", "true")
                }
                setLocked(false)
                setEntered("")
            } else {
                triggerHaptic([35, 30, 35])
                setErrorShake(true)
                setTimeout(() => {
                    setEntered("")
                    setErrorShake(false)
                }, 420)
            }
        }
    }

    const handleBackspace = () => {
        triggerHaptic(8)
        setEntered((prev) => prev.slice(0, -1))
    }

    return (
        <div className="fixed inset-0 z-[250] bg-background/98 backdrop-blur-xl flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-xs space-y-8 text-center">
                <div className="space-y-3">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/12 text-primary flex items-center justify-center">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-black text-foreground">
                        Ingresa tu PIN de acceso
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Protección local activa en este dispositivo
                    </p>
                </div>

                {/* Dots */}
                <div
                    className={cn(
                        "flex items-center justify-center gap-4 transition-transform",
                        errorShake && "translate-x-1 text-rose-500"
                    )}
                >
                    {[0, 1, 2, 3].map((idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "h-4 w-4 rounded-full border-2 transition-all",
                                entered.length > idx
                                    ? errorShake
                                        ? "bg-rose-500 border-rose-500 scale-110"
                                        : "bg-primary border-primary scale-110"
                                    : "border-muted-foreground/40 bg-transparent"
                            )}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleDigit(num)}
                            className="h-14 rounded-2xl bg-card border border-border/70 text-lg font-black text-foreground hover:bg-muted active:scale-95 transition-all"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => performSafeSignOut(createClient(), queryClient)}
                        className="h-14 rounded-2xl bg-card border border-border/70 text-xs font-bold text-muted-foreground hover:text-destructive flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all"
                        title="Cerrar sesión"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Salir</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDigit("0")}
                        className="h-14 rounded-2xl bg-card border border-border/70 text-lg font-black text-foreground hover:bg-muted active:scale-95 transition-all"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        onClick={handleBackspace}
                        aria-label="Borrar"
                        className="h-14 rounded-2xl bg-card border border-border/70 text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-95 transition-all"
                    >
                        <Delete className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
