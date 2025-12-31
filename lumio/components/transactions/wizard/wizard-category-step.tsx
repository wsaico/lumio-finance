
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useCategories } from "@/hooks/use-categories"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Button } from "@/components/ui/button"

interface WizardCategoryStepProps {
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
    onComplete: (categoryId: string, subcategoryId?: string) => void
    onBack: () => void
}

export function WizardCategoryStep({ type: initialType, onComplete, onBack }: WizardCategoryStepProps) {
    const [currentType, setCurrentType] = useState<any>(initialType === 'TRANSFER' ? 'EXPENSE' : initialType)
    const { expense, income } = useCategories()

    // Filter categories based on type
    const list = currentType === 'EXPENSE' ? expense : income

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col pt-2"
        >
            <div className="px-6 mb-4">
                <h1 className="text-2xl font-bold">Selecciona una Categoría</h1>
                <div className="mt-4">
                    <Tabs value={currentType} onValueChange={(val) => setCurrentType(val)} className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="EXPENSE">Gastos</TabsTrigger>
                            <TabsTrigger value="INCOME">Ingresos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {list?.map((cat: any) => (
                        <div
                            key={cat.id}
                            onClick={() => onComplete(cat.id)}
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all aspect-square shadow-sm"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <CategoryIcon name={cat.icon} className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-center leading-tight">{cat.name}</span>
                        </div>
                    ))}
                    <div
                        onClick={() => {/* Open Create Category Modal? Use existing one in future */ }}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-muted hover:border-primary/50 cursor-pointer transition-all aspect-square opacity-60 hover:opacity-100"
                    >
                        <span className="text-3xl font-light">+</span>
                        <span className="text-xs font-medium">Crear</span>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t">
                <Button variant="outline" onClick={onBack} className="w-full">Atrás</Button>
            </div>
        </motion.div>
    )
}
