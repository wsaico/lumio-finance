
"use client"

import { CategoryFormModal } from "@/components/categories/category-form-modal"
import { CategoryCard } from "@/components/categories/category-card"
import { useCategories } from "@/hooks/use-categories"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

export default function CategoriesPage() {
    const { categories, isLoading } = useCategories()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
                    <p className="text-muted-foreground">
                        Personaliza cómo organizas tus transacciones.
                    </p>
                </div>
                <CategoryFormModal />
            </div>

            {isLoading ? (
                <div className="flex h-[200px] w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Tabs defaultValue="expense" className="w-full">
                    <TabsList>
                        <TabsTrigger value="expense">Gastos</TabsTrigger>
                        <TabsTrigger value="income">Ingresos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="expense" className="mt-4">
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                            {categories?.expense.map((cat: any) => (
                                <CategoryCard key={cat.id} category={{ ...cat, type: 'EXPENSE' }} />
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="income" className="mt-4">
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                            {categories?.income.map((cat: any) => (
                                <CategoryCard key={cat.id} category={{ ...cat, type: 'INCOME' }} />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
