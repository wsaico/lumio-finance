"use client"

import { Input } from "@/components/ui/input"
import { Sparkles, Search, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface SmartSearchBarProps {
    onSearch: (filters: { query: string; type?: string; month?: string; year?: string; day?: string }) => void
    className?: string
}

const MONTHS = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
}

type MonthKey = keyof typeof MONTHS

export function SmartSearchBar({ onSearch, className }: SmartSearchBarProps) {
    const [inputValue, setInputValue] = useState("")
    const [parsedFilters, setParsedFilters] = useState<{
        type?: 'INCOME' | 'EXPENSE';
        month?: string;
        year?: string;
        day?: string;
        text?: string;
    }>({})
    const [isFocused, setIsFocused] = useState(false)
    const debounceTimer = useRef<NodeJS.Timeout>(null)

    // Parser Logic
    const parseQuery = (text: string) => {
        let cleanText = text.toLowerCase()
        const result: any = { query: "" }

        // Detect Type
        if (cleanText.includes('ingreso') || cleanText.includes('entrada')) {
            result.type = 'INCOME'
            cleanText = cleanText.replace(/ingreso(s)?|entrada(s)?/g, '')
        } else if (cleanText.includes('gasto') || cleanText.includes('salida')) {
            result.type = 'EXPENSE'
            cleanText = cleanText.replace(/gasto(s)?|salida(s)?/g, '')
        }

        // Detect Day + Month (e.g. "1 de enero", "25 mayo")
        const monthNames = Object.keys(MONTHS).join('|')
        const dayMonthRegex = new RegExp(`\\b(\\d{1,2})\\s*(?:de)?\\s*(${monthNames})\\b`, 'i')
        const dayMonthMatch = cleanText.match(dayMonthRegex)

        if (dayMonthMatch) {
            result.day = dayMonthMatch[1].padStart(2, '0')
            const monthName = dayMonthMatch[2].toLowerCase() as MonthKey
            result.month = MONTHS[monthName]
            cleanText = cleanText.replace(dayMonthMatch[0], '')
        }

        // Detect Month (standalone if not found above)
        if (!result.month) {
            for (const [name, code] of Object.entries(MONTHS)) {
                if (cleanText.includes(name)) {
                    result.month = code
                    cleanText = cleanText.replace(name, '')
                    break
                }
            }
        }

        // Detect Year
        const yearMatch = cleanText.match(/\b20\d{2}\b/)
        if (yearMatch) {
            result.year = yearMatch[0]
            cleanText = cleanText.replace(yearMatch[0], '')
        }

        // Cleanup stopwords
        cleanText = cleanText.replace(/\b(de|del|en|el|la|los|las)\b/g, '')

        // Consolidate spaces
        result.text = cleanText.replace(/\s+/g, ' ').trim()
        return result
    }

    // Effect for Debounce and Real-time parsing
    useEffect(() => {
        const filters = parseQuery(inputValue)
        setParsedFilters(filters)

        if (debounceTimer.current) clearTimeout(debounceTimer.current)

        debounceTimer.current = setTimeout(() => {
            onSearch({
                query: filters.text,
                type: filters.type,
                month: filters.month,
                year: filters.year,
                day: filters.day
            })
        }, 500)

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current)
        }
    }, [inputValue])

    const getMonthName = (code: string) => {
        const entry = Object.entries(MONTHS).find(([_, c]) => c === code)
        return entry ? entry[0] : code
    }

    return (
        <div className={cn("relative w-full group", className)}>
            <div className={cn(
                "relative flex items-center w-full rounded-xl border-2 transition-all duration-300 bg-background",
                isFocused ? "border-primary shadow-[0_0_20px_rgba(124,58,237,0.1)] scale-[1.01]" : "border-border"
            )}>
                {/* AI Icon */}
                <div className="pl-4 flex items-center justify-center">
                    <Sparkles className={cn(
                        "h-5 w-5 transition-colors duration-500",
                        parsedFilters.type || parsedFilters.month || inputValue.length > 0
                            ? "text-primary animate-pulse"
                            : "text-muted-foreground"
                    )} />
                </div>

                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Prueba 'gastos enero 2025' o 'supermercado'..."
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 h-12 text-base bg-transparent"
                />

                {/* Clear Button */}
                {inputValue && (
                    <button
                        onClick={() => setInputValue("")}
                        className="p-2 mr-2 rounded-full hover:bg-muted text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Smart Chips Visualization */}
            {(parsedFilters.type || parsedFilters.month || parsedFilters.year) && (
                <div className="absolute top-14 left-0 flex gap-2 animate-in fade-in slide-in-from-top-2 z-10">
                    {parsedFilters.type && (
                        <Badge variant="secondary" className={cn(
                            "px-3 py-1 text-xs font-medium border",
                            parsedFilters.type === 'INCOME'
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                        )}>
                            {parsedFilters.type === 'INCOME' ? 'Ingresos' : 'Gastos'}
                        </Badge>
                    )}
                    {parsedFilters.month && (
                        <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-primary/20 text-primary uppercase text-xs">
                            <Calendar className="mr-1 h-3 w-3" />
                            {getMonthName(parsedFilters.month)}
                        </Badge>
                    )}
                    {parsedFilters.year && (
                        <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-primary/20 text-primary text-xs">
                            {parsedFilters.year}
                        </Badge>
                    )}
                    {parsedFilters.day && (
                        <Badge variant="outline" className="px-3 py-1 bg-background shadow-sm border-primary/20 text-primary text-xs">
                            Día: {parsedFilters.day}
                        </Badge>
                    )}
                </div>
            )}
        </div>
    )
}

// Icon helper
import { Calendar } from "lucide-react"
