
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
        <section className={cn("space-y-3", className)}>
            {title && (
                <h3 className="text-sm font-bold text-primary px-1 uppercase tracking-wide opacity-90">
                    {title}
                </h3>
            )}
            <div className="space-y-1">
                {children}
            </div>
        </section>
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
}

export function SettingsRow({ icon: Icon, title, description, action, onClick, className, variant = "default" }: SettingsRowProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "flex items-center justify-between p-3 rounded-xl transition-all duration-200",
                "hover:bg-accent/40 active:scale-[0.99] cursor-pointer bg-card/40 backdrop-blur-sm border border-transparent hover:border-border/30",
                onClick ? "cursor-pointer" : "cursor-default",
                className
            )}
        >
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                {Icon && (
                    <div className={cn(
                        "h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors",
                        variant === "danger" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className={cn(
                        "font-medium text-[15px] truncate",
                        variant === "danger" ? "text-red-500" : "text-foreground"
                    )}>
                        {title}
                    </span>
                    {description && (
                        <span className="text-xs text-muted-foreground break-words leading-tight line-clamp-2">
                            {description}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 pl-3">
                {action}
                {onClick && !action && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                )}
            </div>
        </div>
    )
}

// --- CONTROL SELECT ---
interface SettingsSelectProps {
    value: string
    onValueChange: (val: string) => void
    options: { label: string, value: string }[]
    placeholder?: string
    disabled?: boolean
}

export function SettingsSelect({ value, onValueChange, options, placeholder, disabled }: SettingsSelectProps) {
    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className="h-8 w-auto gap-2 border-none bg-muted/50 hover:bg-muted text-xs font-medium px-3 rounded-lg focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent align="end">
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
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
}

export function SettingsSwitch({ checked, onCheckedChange }: SettingsSwitchProps) {
    return (
        <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            className="data-[state=checked]:bg-primary"
        />
    )
}
