"use client"

import { useDashboardStore, WidgetId } from "@/hooks/useDashboardStore"
import { WIDGET_REGISTRY } from "@/components/dashboard/widget-registry"
import { ResizableWidget } from "@/components/dashboard/resizable-widget"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Plus, RotateCcw, Save, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function DashboardPage() {
    const {
        activeWidgets,
        widgetSizes,
        availableWidgets,
        isEditMode,
        toggleEditMode,
        addWidget,
        reorderWidgets,
        resetToDefault,
        setDragging
    } = useDashboardStore()

    const [activeId, setActiveId] = useState<WidgetId | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const unusedWidgets = availableWidgets.filter(id => !activeWidgets.includes(id))

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as WidgetId)
        setDragging(true)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setDragging(false)

        if (!over || active.id === over.id) return

        const oldIndex = activeWidgets.indexOf(active.id as WidgetId)
        const newIndex = activeWidgets.indexOf(over.id as WidgetId)

        if (oldIndex !== -1 && newIndex !== -1) {
            reorderWidgets(arrayMove(activeWidgets, oldIndex, newIndex))
        }
    }

    const activeWidget = activeId ? WIDGET_REGISTRY[activeId] : null

    return (
        <div className="dashboard-compact dashboard-premium space-y-4 pb-20 md:pb-6 relative min-h-screen">
            {/* Header with Premium Animation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Header removed for global uniqueness */}
                <div />

                {/* Control Buttons */}
                <div className="flex items-center gap-2">
                    <AnimatePresence>
                        {isEditMode && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                                className="flex gap-2"
                            >
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={resetToDefault}
                                    title="Restaurar diseño original"
                                    className="shadow-lg shadow-red-500/20"
                                >
                                    <RotateCcw className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Restaurar</span>
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary shadow-lg shadow-primary/10"
                                        >
                                            <Plus className="w-4 h-4 md:mr-2" />
                                            <span className="hidden md:inline">Añadir Widget</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 glass">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                            Widgets Disponibles
                                        </div>
                                        <DropdownMenuSeparator />
                                        {unusedWidgets.length === 0 ? (
                                            <div className="px-2 py-3 text-sm text-center text-muted-foreground italic">
                                                Todos los widgets activos
                                            </div>
                                        ) : (
                                            unusedWidgets.map(id => (
                                                <DropdownMenuItem
                                                    key={id}
                                                    onClick={() => addWidget(id)}
                                                    className="cursor-pointer gap-2"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-primary" />
                                                    {WIDGET_REGISTRY[id]?.title || id}
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button
                        variant={isEditMode ? "default" : "outline"}
                        size="sm"
                        onClick={toggleEditMode}
                        className={cn(
                            "transition-all duration-300",
                            isEditMode && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
                        )}
                    >
                        {isEditMode ? (
                            <>
                                <Save className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Guardar</span>
                            </>
                        ) : (
                            <>
                                <LayoutDashboard className="w-4 h-4 md:mr-2" />
                                <span className="hidden md:inline">Personalizar</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* DND Context with Smart Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={activeWidgets} strategy={rectSortingStrategy}>
                    <motion.div
                        layout
                        className={cn(
                            "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-min transition-all duration-300",
                            isEditMode ? "gap-6 md:gap-8" : "gap-4 md:gap-6"
                        )}
                        style={{ gridAutoFlow: 'dense' }}
                    >
                        <AnimatePresence mode="popLayout">
                            {activeWidgets.map((widgetId) => {
                                const widgetDef = WIDGET_REGISTRY[widgetId]
                                if (!widgetDef) return null

                                const size = widgetSizes[widgetId] || { colSpan: 1 }

                                return (
                                    <ResizableWidget
                                        key={widgetId}
                                        id={widgetId}
                                        size={size}
                                        title={widgetDef.title}
                                        minH={widgetDef.minH}
                                    >
                                        {widgetDef.component}
                                    </ResizableWidget>
                                )
                            })}
                        </AnimatePresence>
                    </motion.div>
                </SortableContext>

                {/* Drag Overlay for smooth preview */}
                <DragOverlay>
                    {activeWidget && (
                        <motion.div
                            initial={{ scale: 1.05, opacity: 0.9 }}
                            animate={{ scale: 1.05, opacity: 0.9 }}
                            className="pointer-events-none rounded-xl shadow-2xl shadow-black/30"
                        >
                            <div className="opacity-80">
                                {activeWidget.component}
                            </div>
                        </motion.div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Empty State */}
            <AnimatePresence>
                {activeWidgets.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5"
                    >
                        <div className="p-4 rounded-full bg-primary/10 mb-4">
                            <LayoutDashboard className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-muted-foreground mb-4">Tu dashboard está vacío</p>
                        <Button
                            onClick={() => {
                                if (!isEditMode) toggleEditMode()
                            }}
                            className="shadow-lg shadow-primary/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Empieza a añadir widgets
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Mode Instructions */}
            <AnimatePresence>
                {isEditMode && activeWidgets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40"
                    >
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/80 backdrop-blur-xl text-white text-sm shadow-2xl border border-white/10">
                            <span className="text-primary">⬌</span>
                            <span>Arrastra para mover</span>
                            <span className="w-px h-4 bg-white/20" />
                            <span className="text-primary">↔</span>
                            <span>Bordes para redimensionar</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
