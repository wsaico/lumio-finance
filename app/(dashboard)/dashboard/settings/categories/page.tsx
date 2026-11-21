"use client"

import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
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
import { Loader2, Plus, Edit, Trash2, Tag as TagIcon, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useTags } from "@/hooks/useTags"
import { ACCENT_COLORS } from "@/lib/appearance"
import { cn } from "@/lib/utils"

import { ConfirmAlertModal } from "@/components/ui/confirm-alert-modal"

export default function CategoriesSettingsPage() {
    const { expense, income, isLoading, deleteCategory } = useCategories()
    const { tags, createTag, deleteTag } = useTags()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<any>(null)
    const [categoryToDelete, setCategoryToDelete] = useState<any>(null)
    const [tagToDelete, setTagToDelete] = useState<any>(null)
    const [newTagName, setNewTagName] = useState("")
    const [newTagColor, setNewTagColor] = useState(ACCENT_COLORS[0].value)
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

    const handleCreateTag = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTagName.trim()) return
        await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor })
        setNewTagName("")
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <Link
                        href="/dashboard/settings?section=general"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-1"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver a Ajustes
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Categorías y Etiquetas</h1>
                    <p className="text-sm text-muted-foreground">Organiza tus movimientos con categorías, subcategorías y etiquetas personalizadas.</p>
                </div>
                {activeTab !== "TAGS" && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-2xl shadow-lg shadow-primary/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Categoría
                    </Button>
                )}
            </div>

            <Tabs defaultValue="EXPENSE" className="w-full" onValueChange={(v) => setActiveTab(v)}>
                <TabsList className="grid w-full grid-cols-3 h-11 bg-muted p-1 rounded-2xl mb-6">
                    <TabsTrigger value="EXPENSE" className="rounded-xl data-[state=active]:bg-rose-500 data-[state=active]:text-white font-semibold">Gastos</TabsTrigger>
                    <TabsTrigger value="INCOME" className="rounded-xl data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-semibold">Ingresos</TabsTrigger>
                    <TabsTrigger value="TAGS" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">Etiquetas</TabsTrigger>
                </TabsList>

                <TabsContent value="EXPENSE" className="space-y-4">
                    <CategoryList list={expense || []} />
                </TabsContent>

                <TabsContent value="INCOME" className="space-y-4">
                    <CategoryList list={income || []} />
                </TabsContent>

                <TabsContent value="TAGS" className="space-y-5">
                    <form onSubmit={handleCreateTag} className="bg-card border border-border/60 rounded-3xl p-5 space-y-4 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground">Crear nueva etiqueta</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="Ej. Deducible, Viaje Cusco, Hogar..."
                                className="h-11 rounded-2xl flex-1"
                            />
                            <Button
                                type="submit"
                                disabled={!newTagName.trim() || createTag.isPending}
                                className="h-11 px-6 rounded-2xl font-bold"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Crear etiqueta
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground mr-1">Color:</span>
                            {ACCENT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setNewTagColor(c.value)}
                                    className={cn(
                                        "h-6 w-6 rounded-full transition-transform",
                                        newTagColor === c.value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "opacity-80 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    aria-label={c.name}
                                />
                            ))}
                        </div>
                    </form>

                    {tags.length === 0 ? (
                        <div className="text-center py-12 bg-card border border-border/50 rounded-3xl text-sm text-muted-foreground">
                            Aún no has creado etiquetas. Úsalas para agrupar gastos por proyecto, viaje o persona.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className="flex items-center justify-between p-4 bg-card border border-border/60 rounded-2xl shadow-xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span
                                            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
                                        >
                                            <TagIcon className="h-4 w-4" />
                                        </span>
                                        <span className="font-bold text-sm truncate">{tag.name}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTagToDelete(tag)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <ConfirmAlertModal
                open={!!tagToDelete}
                onOpenChange={(open) => !open && setTagToDelete(null)}
                variant="danger"
                title="¿Eliminar etiqueta?"
                description={
                    <>
                        Se eliminará la etiqueta{" "}
                        <span className="font-bold text-foreground">{tagToDelete?.name}</span> de tu catálogo personal.
                    </>
                }
                confirmLabel="Eliminar"
                onConfirm={async () => {
                    if (tagToDelete) {
                        await deleteTag.mutateAsync(tagToDelete.id)
                        setTagToDelete(null)
                    }
                }}
            />

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

            <ConfirmAlertModal
                open={!!categoryToDelete}
                onOpenChange={(open) => !open && setCategoryToDelete(null)}
                variant="danger"
                title="¿Eliminar categoría?"
                description={
                    <>
                        Esta acción no se puede deshacer. Esto eliminará la categoría{" "}
                        <span className="font-bold text-foreground">{categoryToDelete?.name}</span> y todas sus
                        subcategorías asociadas permanentemente.
                    </>
                }
                confirmLabel="Eliminar"
                onConfirm={handleDeleteCategory}
            />
        </div>
    )
}
