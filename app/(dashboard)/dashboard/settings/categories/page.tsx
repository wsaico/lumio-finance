"use client"

import { useState } from "react"
import { useCategories } from "@/hooks/use-categories"
import { CategoryFormModal } from "@/components/categories/category-form-modal"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { CategoryIcon } from "@/components/icons/category-icon"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CategoriesSettingsPage() {
    const { expense, income, isLoading, deleteCategory } = useCategories()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("EXPENSE") // Default to EXPENSE

    if (isLoading) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return
        try {
            await deleteCategory.mutateAsync(categoryToDelete.id)
            setCategoryToDelete(null)
        } catch (error) {
            console.error("Error deleting category:", error)
        }
    }

    const CategoryList = ({ list }: { list: any[] }) => (
        <Accordion type="multiple" className="w-full space-y-4">
            {list?.map((cat) => (
                <AccordionItem
                    key={cat.id}
                    value={cat.id}
                    className="border border-border/40 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm"
                >
                    <div className="flex items-center justify-between pr-4 hover:bg-accent/30 transition-colors">
                        <AccordionTrigger className="hover:no-underline px-4 py-3 flex-1">
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-9 w-9 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }} // 20% opacity
                                >
                                    <CategoryIcon name={cat.icon} className="h-5 w-5" />
                                </div>
                                <span className="font-semibold text-lg">{cat.name}</span>
                                {cat.isSystem && (
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                        Sistema
                                    </span>
                                )}
                                {cat.budget_rule && (
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ml-1",
                                        cat.budget_rule === 'NEED' && "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
                                        cat.budget_rule === 'WANT' && "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
                                        cat.budget_rule === 'SAVINGS' && "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                                    )}>
                                        {cat.budget_rule === 'NEED' ? 'Necesidad' : cat.budget_rule === 'WANT' ? 'Deseo' : 'Ahorro'}
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 rounded-full bg-muted/50 border">
                                    {cat.subcategories?.length || 0} sub
                                </span>
                            </div>
                        </AccordionTrigger>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {!cat.isSystem && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingCategory(cat)
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}

                            {!cat.isSystem && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setCategoryToDelete(cat)
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <AccordionContent className="bg-muted/30 px-4 pb-3 pt-1 border-t border-border/30">
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                            <ul className="space-y-1 mt-2">
                                {cat.subcategories.map((sub: any) => (
                                    <li key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-background/80 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
                                            <span className="text-muted-foreground group-hover:text-foreground font-medium">{sub.name}</span>
                                        </div>
                                        {/* Sub actions could go here */}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-4 text-center text-muted-foreground text-sm italic opacity-70">
                                Sin subcategorías
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
                    <p className="text-muted-foreground mt-1">Gestiona tus categorías y subcategorías.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Categoría
                </Button>
            </div>

            <Tabs defaultValue="EXPENSE" className="w-full" onValueChange={(v) => setActiveTab(v)}>
                <TabsList className="grid w-full grid-cols-2 h-11 bg-muted p-1 rounded-xl mb-6">
                    <TabsTrigger value="EXPENSE" className="rounded-lg data-[state=active]:bg-rose-500 data-[state=active]:text-white font-medium">Gastos</TabsTrigger>
                    <TabsTrigger value="INCOME" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-medium">Ingresos</TabsTrigger>
                </TabsList>

                <TabsContent value="EXPENSE" className="space-y-4">
                    <CategoryList list={expense || []} />
                </TabsContent>

                <TabsContent value="INCOME" className="space-y-4">
                    <CategoryList list={income || []} />
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <CategoryFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                defaultType={activeTab}
                trigger={null}
            />

            <CategoryFormModal
                open={!!editingCategory}
                onOpenChange={(open) => !open && setEditingCategory(null)}
                data={editingCategory}
                trigger={null}
            />

            <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará la categoría <span className="font-bold text-foreground">{categoryToDelete?.name}</span> y todas sus subcategorías asociadas permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar Categoría
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
