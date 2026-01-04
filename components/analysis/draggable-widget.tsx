'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { WidgetSize, WIDGET_SIZES } from './types';
import { Card } from '@/components/ui/card';
import { GripVertical, X } from 'lucide-react';
import { useAnalysisStore } from './store';
import { motion } from 'framer-motion';

interface DraggableWidgetProps {
    id: string;
    children: React.ReactNode;
    size: WidgetSize;
    isEditMode: boolean;
}

export function DraggableWidget({ id, children, size, isEditMode }: DraggableWidgetProps) {
    const { removeWidget } = useAnalysisStore();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                WIDGET_SIZES[size],
                "relative group h-full rounded-2xl",
                isEditMode && "cursor-move"
            )}
            {...(isEditMode ? attributes : {})}
        >
            <motion.div
                layout
                initial={false}
                className={cn(
                    "h-full w-full rounded-2xl transition-shadow",
                    isDragging && "opacity-50 scale-95"
                )}
            >
                {isEditMode && (
                    <div className="absolute -top-2 -right-2 z-50 flex gap-1">
                        <button
                            onClick={() => removeWidget(id)}
                            className="p-1 bg-red-500 rounded-full text-white shadow-md hover:bg-red-600 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Drag Handle Overlay for Edit Mode */}
                {isEditMode && (
                    <div
                        {...listeners}
                        className="absolute inset-0 z-40 rounded-2xl bg-white/5 backdrop-blur-[2px] border-2 border-dashed border-primary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <GripVertical className="w-8 h-8 text-primary/80" />
                    </div>
                )}

                {children}
            </motion.div>
        </div>
    );
}
