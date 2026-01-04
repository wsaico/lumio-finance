'use client';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { useAnalysisStore } from './store';
import { DraggableWidget } from './draggable-widget';
import { WidgetRegistry } from './widget-registry';
import { Button } from '@/components/ui/button';
import { Edit, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnalysisBoard() {
    const { widgets, isEditMode, toggleEditMode, updateLayout, resetLayout } = useAnalysisStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = widgets.findIndex((w) => w.id === active.id);
            const newIndex = widgets.findIndex((w) => w.id === over?.id);

            const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, index) => ({
                ...w,
                order: index
            }));

            updateLayout(newWidgets);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Analisis financiero
                    </p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                        Panel de analisis
                    </h2>
                </div>

                <div className="flex gap-2">
                    {isEditMode && (
                        <Button variant="outline" size="sm" onClick={resetLayout}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restablecer
                        </Button>
                    )}
                    <Button
                        variant={isEditMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={toggleEditMode}
                        className={cn(
                            'shadow-sm',
                            isEditMode && 'bg-amber-500 hover:bg-amber-600 border-amber-500/60'
                        )}
                    >
                        {isEditMode ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                        {isEditMode ? 'Listo' : 'Personalizar'}
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-12 gap-4 auto-rows-[150px] sm:auto-rows-[160px] lg:auto-rows-[170px] grid-flow-dense pb-16">
                        {widgets.filter((w) => w.isVisible).map((widget) => {
                            const Component = WidgetRegistry[widget.type];

                            if (!Component) return null;

                            return (
                                <DraggableWidget
                                    key={widget.id}
                                    id={widget.id}
                                    size={widget.size}
                                    isEditMode={isEditMode}
                                >
                                    <Component />
                                </DraggableWidget>
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
