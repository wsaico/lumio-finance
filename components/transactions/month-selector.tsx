"use client"

import { useState, useRef, useEffect } from "react"
import { format, addMonths, subMonths, startOfYear, eachMonthOfInterval, endOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MonthSelectorProps {
    currentMonth: Date
    onMonthChange: (date: Date) => void
}

export function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [year, setYear] = useState(currentMonth.getFullYear())

    // Generate months for the selected year
    const months = eachMonthOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
    })

    // Scroll to active month on mount or change
    useEffect(() => {
        if (scrollRef.current) {
            const activeBtn = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement
            if (activeBtn) {
                const containerWidth = scrollRef.current.offsetWidth
                const btnLeft = activeBtn.offsetLeft
                const btnWidth = activeBtn.offsetWidth

                scrollRef.current.scrollTo({
                    left: btnLeft - (containerWidth / 2) + (btnWidth / 2),
                    behavior: 'smooth'
                })
            }
        }
    }, [currentMonth, year])

    const handleYearChange = (increment: number) => {
        const newYear = year + increment
        setYear(newYear)
        // Try to keep same month index
        const newDate = new Date(newYear, currentMonth.getMonth(), 1)
        onMonthChange(newDate)
    }

    return (
        <div className="flex flex-col gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-20 md:top-24 z-20 pb-2 border-b">
            {/* Year Navigator (Optional visual enhancement) */}
            <div className="flex items-center justify-between px-4 py-1 text-sm font-medium text-muted-foreground">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleYearChange(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>{year}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleYearChange(1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Horizontal Month Scroll */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide px-4 gap-2 items-center select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {months.map((monthDate) => {
                    const isSelected = monthDate.getMonth() === currentMonth.getMonth() && monthDate.getFullYear() === currentMonth.getFullYear()

                    return (
                        <button
                            key={monthDate.toString()}
                            data-active={isSelected}
                            onClick={() => onMonthChange(monthDate)}
                            className={cn(
                                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize whitespace-nowrap",
                                isSelected
                                    ? "bg-primary text-primary-foreground shadow-md scale-105 transform"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            {format(monthDate, "MMMM", { locale: es })}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
