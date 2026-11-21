"use client"

import * as React from "react"
import { format, isSameDay, subDays, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export interface PremiumDatePickerProps {
    value?: Date | string | null
    onChange: (date: Date) => void
    label?: string
    placeholder?: string
    variant?: "input" | "hero"
    className?: string
    disabled?: boolean
    showPresets?: boolean
    minDate?: Date
    maxDate?: Date
}

function normalizeDate(value?: Date | string | null): Date {
    if (!value) return new Date()
    if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value
    // Handle YYYY-MM-DD safely in local timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split("-").map(Number)
        return new Date(y, m - 1, d, 12, 0, 0)
    }
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? new Date() : parsed
}

export function PremiumDatePicker({
    value,
    onChange,
    label = "Fecha",
    placeholder = "Seleccionar fecha",
    variant = "input",
    className,
    disabled = false,
    showPresets = true,
    minDate,
    maxDate,
}: PremiumDatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")
    const selectedDate = React.useMemo(() => normalizeDate(value), [value])

    const handleSelect = (day: Date | undefined) => {
        if (!day) return
        // Preserve existing hours/minutes when picking a new day
        const next = new Date(day)
        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0)
        onChange(next)
        setOpen(false)
    }

    const presets = [
        { label: "Ayer", date: subDays(new Date(), 1) },
        { label: "Hoy", date: new Date() },
        { label: "Mañana", date: addDays(new Date(), 1) },
    ]

    const displayLabel = React.useMemo(() => {
        if (!value) return placeholder
        const today = new Date()
        if (isSameDay(selectedDate, today)) return "Hoy"
        if (isSameDay(selectedDate, subDays(today, 1))) return "Ayer"
        if (isSameDay(selectedDate, addDays(today, 1))) return "Mañana"
        return variant === "hero"
            ? format(selectedDate, "d MMM", { locale: es })
            : format(selectedDate, "d 'de' MMM, yyyy", { locale: es })
    }, [value, selectedDate, placeholder, variant])

    const pickerBody = (
        <div className="flex flex-col gap-3">
            {showPresets && (
                <div className="grid grid-cols-3 gap-2">
                    {presets.map((preset) => {
                        const active = isSameDay(selectedDate, preset.date)
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleSelect(preset.date)}
                                className={cn(
                                    "rounded-xl py-2 px-3 text-xs font-bold transition-all",
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                                        : "bg-muted/70 text-foreground hover:bg-muted"
                                )}
                            >
                                {preset.label}
                            </button>
                        )
                    })}
                </div>
            )}
            <div className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    locale={es}
                    disabled={(date) => {
                        if (minDate && date < minDate) return true
                        if (maxDate && date > maxDate) return true
                        return false
                    }}
                    className="rounded-2xl border border-border/50 bg-card p-3"
                />
            </div>
        </div>
    )

    const triggerButton =
        variant === "hero" ? (
            <button
                type="button"
                disabled={disabled}
                onClick={() => isMobile && setOpen(true)}
                className={cn(
                    "flex items-center gap-3 group text-left rounded-2xl p-1.5 -ml-1.5 hover:bg-muted/50 transition-all disabled:opacity-50",
                    className
                )}
            >
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs group-hover:bg-primary/15 transition-colors shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-foreground capitalize tracking-tight leading-tight">
                        {displayLabel}
                    </span>
                </div>
            </button>
        ) : (
            <button
                type="button"
                disabled={disabled}
                onClick={() => isMobile && setOpen(true)}
                className={cn(
                    "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-input bg-card px-3.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
                    !value && "text-muted-foreground font-normal",
                    className
                )}
            >
                <span className="flex items-center gap-2.5 truncate">
                    <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate capitalize">{displayLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
        )

    if (isMobile) {
        return (
            <>
                {triggerButton}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pt-4 pb-8">
                        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
                        <SheetHeader className="mb-4 text-left">
                            <SheetTitle className="text-lg font-extrabold">{label}</SheetTitle>
                        </SheetHeader>
                        {pickerBody}
                    </SheetContent>
                </Sheet>
            </>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-auto p-3.5 rounded-3xl border border-border/60 shadow-2xl bg-popover z-[200]"
            >
                {pickerBody}
            </PopoverContent>
        </Popover>
    )
}
