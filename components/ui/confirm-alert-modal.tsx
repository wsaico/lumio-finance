"use client"

import * as React from "react"
import { Trash2, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

export type ConfirmAlertVariant = "danger" | "warning" | "info" | "success"

export interface ConfirmAlertModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    variant?: ConfirmAlertVariant
    title: string
    description?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void | Promise<void>
    isLoading?: boolean
    autoCloseOnConfirm?: boolean
    icon?: React.ReactNode
    errorMessage?: string | null
    children?: React.ReactNode
}

const VARIANT_CONFIG: Record<
    ConfirmAlertVariant,
    {
        bar: string
        glow: string
        medallion: string
        button: string
        defaultIcon: React.ComponentType<{ className?: string }>
    }
> = {
    danger: {
        bar: "bg-gradient-to-r from-rose-500 via-red-500 to-rose-600",
        glow: "bg-rose-500/15",
        medallion: "bg-rose-500/12 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25",
        button: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25",
        defaultIcon: Trash2,
    },
    warning: {
        bar: "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500",
        glow: "bg-amber-500/15",
        medallion: "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25",
        button: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25",
        defaultIcon: AlertTriangle,
    },
    success: {
        bar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600",
        glow: "bg-emerald-500/15",
        medallion: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
        button: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25",
        defaultIcon: CheckCircle2,
    },
    info: {
        bar: "bg-gradient-to-r from-primary via-primary to-primary/80",
        glow: "bg-primary/15",
        medallion: "bg-primary/12 text-primary ring-1 ring-primary/25",
        button: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
        defaultIcon: Info,
    },
}

/**
 * Reusable confirmation and alert modal with semantic variants (`danger`, `warning`, `info`, `success`).
 */
export function ConfirmAlertModal({
    open,
    onOpenChange,
    variant = "danger",
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    isLoading = false,
    autoCloseOnConfirm = true,
    icon,
    errorMessage,
    children,
}: ConfirmAlertModalProps) {
    const [internalLoading, setInternalLoading] = React.useState(false)
    const loading = Boolean(isLoading || internalLoading)
    const meta = VARIANT_CONFIG[variant]
    const DefaultIcon = meta.defaultIcon

    const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        if (loading) return
        try {
            setInternalLoading(true)
            await onConfirm()
            if (autoCloseOnConfirm) {
                onOpenChange(false)
            }
        } catch {
            // Leave modal open so caller can present any error feedback
        } finally {
            setInternalLoading(false)
        }
    }

    return (
        <AlertDialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (loading && !nextOpen) return
                onOpenChange(nextOpen)
            }}
        >
            <AlertDialogContent className="p-0 overflow-hidden sm:max-w-[420px] rounded-[1.75rem] border border-border/70 bg-card shadow-2xl gap-0">
                {/* Ambient Top Accent & Soft Glow */}
                <div className={cn("h-1.5 w-full", meta.bar)} />
                <div className="relative px-6 pt-6 pb-5">
                    <div
                        className={cn(
                            "pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-44 rounded-full blur-2xl opacity-70",
                            meta.glow
                        )}
                        aria-hidden="true"
                    />

                    {/* Centered Medallion Icon */}
                    <div
                        className={cn(
                            "relative h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xs",
                            meta.medallion
                        )}
                    >
                        {icon ?? <DefaultIcon className="h-6 w-6 stroke-[2.25]" />}
                    </div>

                    {/* Title & Description */}
                    <div className="relative space-y-1.5 text-center">
                        <AlertDialogTitle className="text-lg font-black tracking-tight text-foreground text-center leading-snug">
                            {title}
                        </AlertDialogTitle>
                        {description ? (
                            <AlertDialogDescription className="text-sm text-muted-foreground text-center leading-relaxed">
                                {description}
                            </AlertDialogDescription>
                        ) : (
                            <AlertDialogDescription className="sr-only">{title}</AlertDialogDescription>
                        )}
                    </div>

                    {children && <div className="relative mt-4">{children}</div>}

                    {errorMessage && (
                        <div className="relative mt-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 text-center">
                            {errorMessage}
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <div className="px-6 pb-6 pt-2 grid grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => onOpenChange(false)}
                        className="h-11 rounded-2xl font-bold text-sm border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleConfirm}
                        className={cn(
                            "h-11 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60",
                            meta.button
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <span>{confirmLabel}</span>
                        )}
                    </button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
