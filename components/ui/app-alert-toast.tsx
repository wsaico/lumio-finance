"use client"

import * as React from "react"
import { toast } from "sonner"
import {
    Crown,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    X,
    Sparkles,
    ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type AppAlertVariant = "premium" | "error" | "warning" | "success" | "info"

export interface AppAlertToastProps {
    id?: string | number
    variant?: AppAlertVariant
    title: React.ReactNode
    description?: React.ReactNode
    actionLabel?: string
    onAction?: () => void
    onClose?: () => void
    badge?: string
    className?: string
}

const VARIANT_CONFIG: Record<
    AppAlertVariant,
    {
        topBar: string
        iconBadge: string
        defaultIcon: React.ComponentType<{ className?: string }>
        actionButtonClass: string
        defaultBadge?: string
    }
> = {
    premium: {
        topBar: "bg-gradient-to-r from-amber-400 via-amber-500 to-primary",
        iconBadge:
            "bg-gradient-to-br from-amber-500 via-amber-600 to-primary text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-300/40",
        defaultIcon: Crown,
        actionButtonClass:
            "bg-gradient-to-r from-amber-500 via-amber-600 to-primary hover:opacity-95 text-white shadow-md shadow-amber-500/25",
        defaultBadge: "PRO",
    },
    error: {
        topBar: "bg-gradient-to-r from-rose-500 via-red-500 to-rose-600",
        iconBadge:
            "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-300/40",
        defaultIcon: AlertCircle,
        actionButtonClass:
            "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25",
    },
    warning: {
        topBar: "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600",
        iconBadge:
            "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-300/40",
        defaultIcon: AlertTriangle,
        actionButtonClass:
            "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25",
    },
    success: {
        topBar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600",
        iconBadge:
            "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300/40",
        defaultIcon: CheckCircle2,
        actionButtonClass:
            "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25",
    },
    info: {
        topBar: "bg-gradient-to-r from-sky-500 via-primary to-indigo-500",
        iconBadge:
            "bg-gradient-to-br from-sky-500 to-primary text-white shadow-lg shadow-primary/30 ring-1 ring-sky-300/40",
        defaultIcon: Info,
        actionButtonClass:
            "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25",
    },
}

/**
 * Modern app-style floating alert card.
 * Can be used standalone, in modals, or inside `toast.custom`.
 */
export function AppAlertToast({
    id,
    variant = "premium",
    title,
    description,
    actionLabel,
    onAction,
    onClose,
    badge,
    className,
}: AppAlertToastProps) {
    const config = VARIANT_CONFIG[variant]
    const Icon = config.defaultIcon
    const effectiveBadge = badge ?? config.defaultBadge

    const handleDismiss = () => {
        if (onClose) {
            onClose()
        }
        if (id !== undefined) {
            toast.dismiss(id)
        }
    }

    const handleActionClick = () => {
        if (onAction) {
            onAction()
        }
        if (id !== undefined) {
            toast.dismiss(id)
        }
    }

    return (
        <div
            className={cn(
                "relative flex w-full max-w-[420px] items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-3.5 shadow-2xl backdrop-blur-2xl transition-all dark:bg-[#14151C]/95 select-none",
                className
            )}
            role="alert"
        >
            {/* Top subtle glowing accent bar */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 h-[2.5px]",
                    config.topBar
                )}
            />

            {/* Medallion Icon */}
            <div className="relative shrink-0">
                <div
                    className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl transition-transform",
                        config.iconBadge
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
                {effectiveBadge && (
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 px-1.5 py-[1px] text-[9px] font-black tracking-wider text-amber-300 ring-1 ring-amber-400/50 shadow-sm dark:bg-black">
                        {effectiveBadge}
                    </span>
                )}
            </div>

            {/* Content Text */}
            <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-bold leading-snug text-foreground tracking-tight">
                    {title}
                </p>
                {description && (
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                )}
            </div>

            {/* CTA Action Button */}
            {actionLabel && (
                <button
                    type="button"
                    onClick={handleActionClick}
                    className={cn(
                        "shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer",
                        config.actionButtonClass
                    )}
                >
                    {variant === "premium" && <Sparkles className="h-3 w-3 shrink-0" />}
                    <span>{actionLabel}</span>
                    {variant !== "premium" && <ArrowRight className="h-3 w-3 shrink-0" />}
                </button>
            )}

            {/* Close 'X' Button */}
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Cerrar notificación"
                className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

/**
 * Reusable helper functions to fire app-style toasts anywhere.
 */
export const showAppToast = {
    premium: (options: {
        id?: string | number
        title?: React.ReactNode
        description?: React.ReactNode
        actionLabel?: string
        onAction?: () => void
        duration?: number
        badge?: string
    }) => {
        return toast.custom(
            (id) => (
                <AppAlertToast
                    id={id}
                    variant="premium"
                    title={options.title || "Función disponible en Plan Premium"}
                    description={
                        options.description ||
                        "Desbloquea exportaciones ilimitadas, reportes y sincronización avanzada."
                    }
                    actionLabel={options.actionLabel || "Ver planes"}
                    onAction={
                        options.onAction ||
                        (() => {
                            if (typeof window !== "undefined") {
                                window.location.href = "/dashboard/billing"
                            }
                        })
                    }
                    badge={options.badge}
                />
            ),
            {
                id: options.id,
                duration: options.duration ?? 5500,
            }
        )
    },

    error: (options: {
        id?: string | number
        title: React.ReactNode
        description?: React.ReactNode
        actionLabel?: string
        onAction?: () => void
        duration?: number
    }) => {
        return toast.custom(
            (id) => (
                <AppAlertToast
                    id={id}
                    variant="error"
                    title={options.title}
                    description={options.description}
                    actionLabel={options.actionLabel}
                    onAction={options.onAction}
                />
            ),
            {
                id: options.id,
                duration: options.duration ?? 4500,
            }
        )
    },

    warning: (options: {
        id?: string | number
        title: React.ReactNode
        description?: React.ReactNode
        actionLabel?: string
        onAction?: () => void
        duration?: number
    }) => {
        return toast.custom(
            (id) => (
                <AppAlertToast
                    id={id}
                    variant="warning"
                    title={options.title}
                    description={options.description}
                    actionLabel={options.actionLabel}
                    onAction={options.onAction}
                />
            ),
            {
                id: options.id,
                duration: options.duration ?? 4500,
            }
        )
    },

    success: (options: {
        id?: string | number
        title: React.ReactNode
        description?: React.ReactNode
        actionLabel?: string
        onAction?: () => void
        duration?: number
    }) => {
        return toast.custom(
            (id) => (
                <AppAlertToast
                    id={id}
                    variant="success"
                    title={options.title}
                    description={options.description}
                    actionLabel={options.actionLabel}
                    onAction={options.onAction}
                />
            ),
            {
                id: options.id,
                duration: options.duration ?? 4000,
            }
        )
    },

    info: (options: {
        id?: string | number
        title: React.ReactNode
        description?: React.ReactNode
        actionLabel?: string
        onAction?: () => void
        duration?: number
    }) => {
        return toast.custom(
            (id) => (
                <AppAlertToast
                    id={id}
                    variant="info"
                    title={options.title}
                    description={options.description}
                    actionLabel={options.actionLabel}
                    onAction={options.onAction}
                />
            ),
            {
                id: options.id,
                duration: options.duration ?? 4000,
            }
        )
    },
}
