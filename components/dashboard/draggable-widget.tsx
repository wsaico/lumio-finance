'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Widget } from '@/types/dashboard';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import { WidgetRenderer } from './widget-renderer';
import { useState } from 'react';

interface DraggableWidgetProps {
  widget: Widget;
}

export function DraggableWidget({ widget }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const { removeWidget, toggleWidgetVisibility } = useDashboard();
  const [showActions, setShowActions] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-1',
    large: 'col-span-1 md:col-span-2',
    full: 'col-span-1 md:col-span-2 lg:col-span-3',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        'relative group',
        isDragging && 'z-50 opacity-50'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {/* Widget Actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : -10 }}
        className="absolute top-2 right-2 z-10 flex items-center gap-1"
      >
        <button
          type="button"
          className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Widget settings"
        >
          <Settings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
        <button
          type="button"
          onClick={() => toggleWidgetVisibility(widget.id)}
          className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Hide widget"
        >
          <X className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-grab active:cursor-grabbing"
          aria-label="Drag widget"
        >
          <GripVertical className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        </button>
      </motion.div>

      {/* Widget Content */}
      <div className="h-full">
        <WidgetRenderer widget={widget} />
      </div>
    </motion.div>
  );
}
