"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, X, Maximize2, Minimize2, Square } from 'lucide-react'
import { useState, useRef } from 'react'
import { useDashboardStore, WidgetId, WidgetSize } from '@/hooks/useDashboardStore'
import { cn } from '@/lib/utils'

interface ResizableWidgetProps {
    id: WidgetId
    size: WidgetSize
    children: React.ReactNode
    title: string
    minH?: string
}

const getColSpanClass = (span: number) => {
    return `col-span-1 md:col-span-${span} lg:col-span-${span}`;
}

export function ResizableWidget({ id, size, children, title, minH }: ResizableWidgetProps) {
    const { isEditMode, removeWidget, resizeWidget } = useDashboardStore()
    const [showSizeMenu, setShowSizeMenu] = useState(false)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: !isEditMode })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const handleResize = (newSize: 4 | 8 | 12) => {
        resizeWidget(id, { colSpan: newSize })
        setShowSizeMenu(false)
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className={cn(
                getColSpanClass(size.colSpan),
                minH,
                'relative group/widget',
                isDragging && 'z-50 opacity-70 scale-105'
            )}
            layout
            layoutId={id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
        >
            {/* Edit Mode Controls */}
            <AnimatePresence>
                {isEditMode && (
                    <>
                        {/* Drag Handle */}
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute -top-3 left-1/2 -translate-x-1/2 z-50 cursor-grab active:cursor-grabbing"
                            {...attributes}
                            {...listeners}
                        >
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/90 dark:bg-white text-white dark:text-black shadow-boutique border border-white/10 dark:border-black/5 backdrop-blur-xl">
                                <GripVertical className="h-3 w-3 opacity-50" />
                                <span className="text-[10px] font-bold tracking-tight uppercase">{title}</span>
                            </div>
                        </motion.div>

                        {/* Remove Button */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute -top-3 -right-3 z-50 h-6 w-6 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-boutique flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border border-white/10"
                            onClick={() => removeWidget(id)}
                        >
                            <X className="h-3 w-3" />
                        </motion.button>

                        {/* Size Menu Button */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute -bottom-2 right-1/2 translate-x-1/2 z-50"
                        >
                            <button
                                onClick={() => setShowSizeMenu(!showSizeMenu)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/90 dark:bg-white text-white dark:text-black shadow-boutique border border-white/10 dark:border-black/5 text-[9px] font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-transform"
                            >
                                {size.colSpan <= 4 && <Minimize2 className="h-2.5 w-2.5" />}
                                {size.colSpan > 4 && size.colSpan <= 8 && <Square className="h-2.5 w-2.5" />}
                                {size.colSpan > 8 && <Maximize2 className="h-2.5 w-2.5" />}
                                <span>
                                    {size.colSpan <= 4 && 'Compacto'}
                                    {size.colSpan > 4 && size.colSpan <= 8 && 'Estándar'}
                                    {size.colSpan > 8 && 'Extendido'}
                                </span>
                            </button>

                            {/* Size Dropdown */}
                            <AnimatePresence>
                                {showSizeMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/95 dark:bg-white backdrop-blur-xl rounded-xl p-1 shadow-boutique border border-white/10 dark:border-black/5 min-w-[150px]"
                                    >
                                        {[
                                            { val: 4, label: 'Compacto', icon: Minimize2 },
                                            { val: 8, label: 'Estándar', icon: Square },
                                            { val: 12, label: 'Extendido', icon: Maximize2 },
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                onClick={() => handleResize(opt.val as 4 | 8 | 12)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                                                    size.colSpan === opt.val
                                                        ? "bg-primary text-primary-foreground"
                                                        : "hover:bg-white/10 dark:hover:bg-black/5 text-white/50 dark:text-black/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <opt.icon className="h-3 w-3" />
                                                    {opt.label}
                                                </div>
                                                {size.colSpan === opt.val && <div className="w-1 h-1 rounded-full bg-current" />}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Edit Mode Border */}
                        <div className="absolute -inset-0.5 rounded-[1.4rem] border-2 border-primary/20 pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-500" />
                    </>
                )}
            </AnimatePresence>

            {/* Widget Content */}
            <div className={cn("h-full", isEditMode && "pointer-events-none")}>
                {children}
            </div>
        </motion.div>
    )
}
