'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useDashboard } from '@/hooks/useDashboard';
import { DraggableWidget } from './DraggableWidget';
import { cn } from '@/lib/utils';

export function DashboardGrid() {
  const { config, updateWidgetOrder } = useDashboard();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleWidgets = useMemo(
    () => config.widgets.filter((w) => w.isVisible).sort((a, b) => a.order - b.order),
    [config.widgets]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = visibleWidgets.findIndex((w) => w.id === active.id);
    const newIndex = visibleWidgets.findIndex((w) => w.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedWidgets = arrayMove(visibleWidgets, oldIndex, newIndex);

    // Update order for all widgets
    reorderedWidgets.forEach((widget, index) => {
      if (widget.order !== index) {
        updateWidgetOrder(widget.id, index);
      }
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div
          className={cn(
            'grid gap-4 md:gap-6',
            config.layout === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1',
            config.compactMode && 'gap-3 md:gap-4'
          )}
        >
          {visibleWidgets.map((widget) => (
            <DraggableWidget key={widget.id} widget={widget} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
