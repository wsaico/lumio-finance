"use client"

import * as React from "react"
import { format } from "date-fns"
import { Clock, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export interface PremiumTimePickerProps {
    value: Date
    onChange: (date: Date) => void
    label?: string
    variant?: "input" | "hero"
    className?: string
    disabled?: boolean
}

const TIME_PRESETS = [
    { label: "Ahora", get: () => new Date() },
    { label: "09:00", h: 9, m: 0 },
    { label: "13:00", h: 13, m: 0 },
    { label: "19:00", h: 19, m: 0 },
]

export function PremiumTimePicker({
    value,
    onChange,
    label = "Hora",
    variant = "hero",
    className,
    disabled = false,
}: PremiumTimePickerProps) {
    const [open, setOpen] = React.useState(false)
    const isMobile = useMediaQuery("(max-width: 768px)")

    const safeDate = value instanceof Date && !isNaN(value.getTime()) ? value : new Date()
    const hours = safeDate.getHours()
    const minutes = safeDate.getMinutes()

    const updateTime = (newH: number, newM: number) => {
        const next = new Date(safeDate)
        next.setHours(((newH % 24) + 24) % 24, ((newM % 60) + 60) % 60, 0, 0)
        onChange(next)
    }

    const pickerBody = (
        <div className="flex flex-col gap-4 w-full sm:w-[270px]">
            {/* Interactive Steppers */}
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-muted/50 p-4 border border-border/50">
                {/* Hours */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => updateTime(hours + 1, minutes)}
                        className="h-9 w-14 rounded-xl bg-card hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors shadow-xs border border-border/50"
                        aria-label="Sumar hora"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <div className="text-3xl font-black tabular-nums tracking-tight text-foreground w-14 text-center py-1">
                        {String(hours).padStart(2, "0")}
                    </div>
                    <button
                        type="button"
                        onClick={() => updateTime(hours - 1, minutes)}
                        className="h-9 w-14 rounded-xl bg-card hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors shadow-xs border border-border/50"
                        aria-label="Restar hora"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Horas</span>
                </div>

                <span className="text-3xl font-black text-muted-foreground pb-5">:</span>

                {/* Minutes */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => updateTime(hours, minutes + 5)}
                        className="h-9 w-14 rounded-xl bg-card hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors shadow-xs border border-border/50"
                        aria-label="Sumar 5 minutos"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </button>
                    <div className="text-3xl font-black tabular-nums tracking-tight text-foreground w-14 text-center py-1">
                        {String(minutes).padStart(2, "0")}
                    </div>
                    <button
                        type="button"
                        onClick={() => updateTime(hours, minutes - 5)}
                        className="h-9 w-14 rounded-xl bg-card hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors shadow-xs border border-border/50"
                        aria-label="Restar 5 minutos"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min</span>
                </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5">
                {TIME_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                            if (preset.get) {
                                const now = preset.get()
                                updateTime(now.getHours(), now.getMinutes())
                            } else {
                                updateTime(preset.h!, preset.m!)
                            }
                        }}
                        className="rounded-xl bg-muted/70 hover:bg-primary hover:text-primary-foreground py-2 text-xs font-bold transition-all"
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <Button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl font-bold h-10 bg-primary text-primary-foreground"
            >
                Listo
            </Button>
        </div>
    )

    const triggerButton =
        variant === "hero" ? (
            <button
                type="button"
                disabled={disabled}
                onClick={() => isMobile && setOpen(true)}
                className={cn(
                    "flex items-center gap-3 group text-right rounded-2xl p-1.5 -mr-1.5 hover:bg-muted/50 transition-all disabled:opacity-50",
                    className
                )}
            >
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                    </span>
                    <span className="text-lg sm:text-xl font-black text-foreground tabular-nums tracking-tight leading-tight">
                        {format(safeDate, "HH:mm")}
                    </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center shadow-xs transition-colors shrink-0">
                    <Clock className="w-5 h-5" />
                </div>
            </button>
        ) : (
            <button
                type="button"
                disabled={disabled}
                onClick={() => isMobile && setOpen(true)}
                className={cn(
                    "flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-input bg-card px-3.5 text-sm font-semibold text-foreground shadow-xs hover:border-primary/40 transition-all",
                    className
                )}
            >
                <span className="flex items-center gap-2.5 tabular-nums">
                    <Clock className="h-4 w-4 text-primary" />
                    {format(safeDate, "HH:mm")}
                </span>
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
                            <SheetTitle className="text-lg font-extrabold">Seleccionar hora</SheetTitle>
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
                align="end"
                className="w-auto p-4 rounded-3xl border border-border/60 shadow-2xl bg-popover z-[200]"
            >
                {pickerBody}
            </PopoverContent>
        </Popover>
    )
}
