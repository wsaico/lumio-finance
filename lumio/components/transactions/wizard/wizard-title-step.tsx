
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowRight, Search, Loader2 } from "lucide-react"
import { useSmartCategories } from "@/hooks/useSmartCategories"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Badge } from "@/components/ui/badge"

interface WizardTitleStepProps {
    initialValue?: string
    onComplete: (data: { description: string, categoryId?: string, subcategoryId?: string, confidence?: number }) => void
}

export function WizardTitleStep({ initialValue = "", onComplete }: WizardTitleStepProps) {
    const [value, setValue] = useState(initialValue)
    const [searchTerm, setSearchTerm] = useState(initialValue)

    // Smart Hook
    const { data: smartData, isLoading } = useSmartCategories(searchTerm)
    const suggestions = smartData?.suggestions || []

    useEffect(() => {
        const t = setTimeout(() => {
            if (value.length > 2) setSearchTerm(value)
            else setSearchTerm("")
        }, 300)
        return () => clearTimeout(t)
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && value.trim()) {
            onComplete({ description: value })
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col p-6"
        >
            <div className="mt-10 mb-6">
                <h1 className="text-3xl font-bold mb-2">¿Qué transacción es?</h1>
                <p className="text-muted-foreground">Escribe el nombre, ej: "Netflix", "Almuerzo"</p>
            </div>

            <div className="relative mb-6">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-16 text-2xl px-6 rounded-2xl shadow-lg border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Escribe aquí..."
                    autoFocus
                />
                <Button
                    size="icon"
                    className="absolute right-2 top-2 h-12 w-12 rounded-xl"
                    onClick={() => value.trim() && onComplete({ description: value })}
                >
                    <ArrowRight className="h-6 w-6" />
                </Button>
            </div>

            {/* Suggestions */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2">
                {isLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : suggestions.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sugerencias</p>
                        {suggestions.map((item: any, idx: number) => (
                            <div
                                key={idx}
                                onClick={() => onComplete({
                                    description: value, // Use current Input value or suggested name? smart suggestions matches description usually
                                    categoryId: item.categoryId,
                                    subcategoryId: item.subcategoryId,
                                    confidence: item.confidence
                                })}
                                className="flex items-center gap-4 p-4 rounded-xl bg-card border hover:border-primary/50 cursor-pointer transition-colors shadow-sm"
                            >
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <CategoryIcon name={item.categoryIcon || 'circle-help'} className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{item.categoryName}</h3>
                                    {item.subcategoryName && <p className="text-sm text-muted-foreground">{item.subcategoryName}</p>}
                                </div>
                                {item.confidence > 0.8 && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Smart</Badge>}
                            </div>
                        ))}
                    </div>
                ) : value.length > 1 && (
                    <div className="text-center py-10 opacity-50">
                        <p>Presiona Enter para continuar...</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
