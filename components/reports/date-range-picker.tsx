"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DateRangePicker({
    className,
    date,
    setDate,
}: DateRangePickerProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-bold text-[11px] bg-white/5 border-none h-9 rounded-xl hover:bg-white/10 transition-all focus:ring-1 ring-primary/50",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                    {format(date.to, "LLL dd, y", { locale: es })}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y", { locale: es })
                            )
                        ) : (
                            <span>Seleccionar rango</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-white/10 bg-black/95 backdrop-blur-xl z-[110]" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={es}
                        className="rounded-xl"
                        classNames={{
                            month_caption: "flex justify-center pt-1 relative items-center text-white font-bold uppercase text-[11px] tracking-widest",
                            weekday: "text-muted-foreground/60 w-8 font-bold text-[10px] uppercase",
                            day: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 text-white",
                            day_today: "bg-white/10 text-white",
                            day_outside: "text-white/20 opacity-50",
                            day_disabled: "text-white/10 opacity-50",
                            day_hidden: "invisible",
                        }}
                    />
                    {date && (
                        <div className="p-3 border-t border-white/5 flex justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] font-bold uppercase tracking-tighter hover:text-rose-500"
                                onClick={() => setDate(undefined)}
                            >
                                <X className="h-3 w-3 mr-1" />
                                Limpiar Rango
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}
