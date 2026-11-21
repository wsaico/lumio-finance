"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// --- SECCIÓN DE CONFIGURACIÓN ---
interface SettingsSectionProps {
    title?: string
    children: React.ReactNode
    className?: string
}

export function SettingsSection({ title, children, className }: SettingsSectionProps) {
    return (
        <section className={cn("space-y-2.5", className)}>
            {title && (
                <h3 className="text-xs font-extrabold text-primary px-1 tracking-wide">
                    {title}
                </h3>
            )}
            <div className="space-y-2">{children}</div>
        </section>
    )
}

// --- TARJETA AGRUPADA ESTILO CASHEW ---
export function SettingsGroupCard({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                "rounded-3xl bg-card border border-border/60 divide-y divide-border/50 overflow-hidden shadow-xs",
                className
            )}
        >
            {children}
        </div>
    )
}

// --- FILA DE CONFIGURACIÓN ---
interface SettingsRowProps {
    icon?: React.ElementType
    title: string
    description?: string
    action?: React.ReactNode
    onClick?: () => void
    className?: string
    variant?: "default" | "danger"
    grouped?: boolean
}

export function SettingsRow({
    icon: Icon,
    title,
    description,
    action,
    onClick,
    className,
    variant = "default",
    grouped = false,
}: SettingsRowProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center justify-between px-4 py-3.5 transition-all duration-150",
                !grouped && "rounded-2xl bg-card border border-border/60 hover:border-border hover:shadow-sm",
                grouped && "hover:bg-muted/35",
                variant === "danger" && grouped && "bg-rose-500/8 hover:bg-rose-500/15",
                onClick ? "cursor-pointer active:scale-[0.995]" : "cursor-default",
                className
            )}
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {Icon && (
                    <div
                        className={cn(
                            "h-9 w-9 flex-shrink-0 rounded-[var(--icon-radius,0.85rem)] flex items-center justify-center transition-colors",
                            variant === "danger"
                                ? "bg-rose-500/12 text-rose-500"
                                : "bg-primary/10 text-primary"
                        )}
                    >
                        <Icon className="h-[18px] w-[18px]" />
                    </div>
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                        className={cn(
                            "font-semibold text-sm leading-snug truncate",
                            variant === "danger" ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                        )}
                    >
                        {title}
                    </span>
                    {description && (
                        <span className="text-xs text-muted-foreground leading-snug line-clamp-2">
                            {description}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pl-3 shrink-0">
                {action}
                {onClick && !action && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                )}
            </div>
        </div>
    )
}

// --- PÍLDORA SELECTORA ESTILO CASHEW ---
interface SettingsSelectProps {
    value: string
    onValueChange: (val: string) => void
    options: { label: string; value: string }[]
    placeholder?: string
    className?: string
}

export function SettingsSelect({
    value,
    onValueChange,
    options,
    placeholder,
    className,
}: SettingsSelectProps) {
    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger
                className={cn(
                    "min-w-[130px] max-w-[200px] h-9 text-xs font-bold rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
                    className
                )}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-72">
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs rounded-lg">
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// --- CONTROL SWITCH ---
interface SettingsSwitchProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    label?: string
    id?: string
}

export function SettingsSwitch({ checked, onCheckedChange, label, id }: SettingsSwitchProps) {
    return (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
            {label && (
                <Label htmlFor={id} className="text-xs cursor-pointer">
                    {label}
                </Label>
            )}
        </div>
    )
}
