'use client';

import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Edit, Copy } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableItemProps {
  onDelete?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  children: ReactNode;
  className?: string;
  deleteThreshold?: number;
  editThreshold?: number;
}

export function SwipeableItem({
  onDelete,
  onEdit,
  onDuplicate,
  children,
  className,
  deleteThreshold = -120,
  editThreshold = 120,
}: SwipeableItemProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const leftActionOpacity = useTransform(x, [0, 150], [0, 1]);
  const leftActionScale = useTransform(x, [0, 150], [0.8, 1]);

  const rightActionOpacity = useTransform(x, [-150, 0], [1, 0]);
  const rightActionScale = useTransform(x, [-150, 0], [1, 0.8]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);

    if (info.offset.x < deleteThreshold && onDelete) {
      onDelete();
    } else if (info.offset.x > editThreshold && onEdit) {
      onEdit();
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Actions (Edit/Duplicate) */}
      {(onEdit || onDuplicate) && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4 z-0"
          style={{ opacity: leftActionOpacity }}
        >
          {onEdit && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{ scale: leftActionScale }}
              className="p-3 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-colors"
            >
              <Edit className="w-5 h-5" />
            </motion.button>
          )}
          {onDuplicate && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              style={{ scale: leftActionScale }}
              className="p-3 bg-success-500 text-white rounded-full shadow-lg hover:bg-success-600 transition-colors"
            >
              <Copy className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Right Actions (Delete) */}
      {onDelete && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center px-4 z-0"
          style={{ opacity: rightActionOpacity }}
        >
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{ scale: rightActionScale }}
            className="p-3 bg-error-500 text-white rounded-full shadow-lg hover:bg-error-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* Draggable Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'relative z-10 bg-white dark:bg-neutral-900',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
