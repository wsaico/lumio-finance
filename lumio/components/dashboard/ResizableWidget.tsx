"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, X, Maximize2, Minimize2, Square } from 'lucide-react'
import { useState, useRef } from 'react'
import { useDashboardStore, WidgetId, WidgetSize } from '@/hooks/use-dashboard-store'
import { cn } from '@/lib/utils'

interface ResizableWidgetProps {
    id: WidgetId
    size: WidgetSize
    children: React.ReactNode
    title: string
    minH?: string
}

const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
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

    const handleResize = (newSize: 1 | 2 | 3) => {
        resizeWidget(id, { colSpan: newSize })
        setShowSizeMenu(false)
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className={cn(
                colSpanClasses[size.colSpan],
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
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/40 border border-white/20 backdrop-blur-sm">
                                <GripVertical className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-bold tracking-wide">{title}</span>
                            </div>
                        </motion.div>

                        {/* Remove Button */}
                        <motion.button
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute -top-2 -right-2 z-50 h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                            onClick={() => removeWidget(id)}
                        >
                            <X className="h-3.5 w-3.5" />
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
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 border border-white/20 text-[10px] font-bold hover:scale-105 active:scale-95 transition-transform"
                            >
                                {size.colSpan === 1 && <Minimize2 className="h-3 w-3" />}
                                {size.colSpan === 2 && <Square className="h-3 w-3" />}
                                {size.colSpan === 3 && <Maximize2 className="h-3 w-3" />}
                                <span>
                                    {size.colSpan === 1 && 'Pequeño'}
                                    {size.colSpan === 2 && 'Mediano'}
                                    {size.colSpan === 3 && 'Grande'}
                                </span>
                            </button>

                            {/* Size Dropdown */}
                            <AnimatePresence>
                                {showSizeMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/95 backdrop-blur-xl rounded-xl p-1 shadow-2xl border border-white/10 min-w-[140px]"
                                    >
                                        <button
                                            onClick={() => handleResize(1)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                size.colSpan === 1 ? "bg-violet-500/30 text-violet-300" : "hover:bg-white/10 text-white/70"
                                            )}
                                        >
                                            <Minimize2 className="h-3.5 w-3.5" />
                                            Pequeño (1 col)
                                        </button>
                                        <button
                                            onClick={() => handleResize(2)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                size.colSpan === 2 ? "bg-violet-500/30 text-violet-300" : "hover:bg-white/10 text-white/70"
                                            )}
                                        >
                                            <Square className="h-3.5 w-3.5" />
                                            Mediano (2 col)
                                        </button>
                                        <button
                                            onClick={() => handleResize(3)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                size.colSpan === 3 ? "bg-violet-500/30 text-violet-300" : "hover:bg-white/10 text-white/70"
                                            )}
                                        >
                                            <Maximize2 className="h-3.5 w-3.5" />
                                            Grande (3 col)
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Edit Mode Border */}
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500/50 ring-offset-2 ring-offset-transparent pointer-events-none" />
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
