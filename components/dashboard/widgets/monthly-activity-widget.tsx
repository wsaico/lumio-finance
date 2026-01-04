'use client';

import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    getDay,
    startOfWeek,
    endOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface HeatmapValue {
    date: string;
    count: number;
}

export function MonthlyActivityWidget() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { data: heatmapData, isLoading } = useQuery({
        queryKey: ['activity-heatmap-monthly', format(currentDate, 'yyyy-MM')],
        queryFn: async () => {
            // We can use the same API but we might filter or the API might already return enough
            const res = await fetch('/api/analytics/activity-heatmap')
            if (!res.ok) throw new Error('Failed')
            return res.json() as Promise<HeatmapValue[]>
        }
    })

    // Calendar calculations
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const getDayIntensity = (date: Date) => {
        if (!heatmapData) return 0;
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = heatmapData.find(d => d.date === dateStr);
        return dayData ? dayData.count : 0;
    };

    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-neutral-50 dark:bg-neutral-900/50';
        if (count < 2) return 'bg-primary/20 text-primary-900 dark:text-primary-100';
        if (count < 4) return 'bg-primary/40 text-primary-900 dark:text-primary-100';
        if (count < 6) return 'bg-primary/60 text-white';
        if (count < 8) return 'bg-primary/80 text-white';
        return 'bg-primary text-white';
    };

    return (
        <motion.div
            className="widget-surface h-full flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <div className="widget-header">
                <div>
                    <p className="widget-kicker">Actividad</p>
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <h3 className="widget-title">Intensidad de gastos</h3>
                    </div>
                    <p className="widget-subtitle">
                        Actividad diaria de {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                        className="h-7 w-7 rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                        className="h-7 w-7 rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ChevronRight className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            </div>

            <div className="flex-1 px-4 pb-4 pt-3">
                <div className="grid grid-cols-7 gap-1">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                        <div key={day} className="text-[10px] font-bold text-muted-foreground text-center mb-1">
                            {day}
                        </div>
                    ))}

                    {days.map((day, idx) => {
                        const count = getDayIntensity(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "relative aspect-square rounded-md flex flex-col items-center justify-center transition-all duration-200 group cursor-default border border-white/5",
                                    isCurrentMonth ? getIntensityClass(count) : "opacity-20 pointer-events-none",
                                    isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                )}
                            >
                                <span className={cn(
                                    "text-[10px] font-medium",
                                    count > 4 ? "text-white" : "text-muted-foreground"
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {count > 0 && isCurrentMonth && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded-md z-10 p-1">
                                        <span className="text-[9px] text-white font-bold leading-none text-center">
                                            {count} {count === 1 ? 'movimiento' : 'movimientos'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mx-4 mb-4 flex items-center justify-between border-t border-white/10 pt-3">
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                        {[0, 2, 4, 6, 8].map(c => (
                            <div
                                key={c}
                                className={cn("w-2 h-2 rounded-sm", getIntensityClass(c))}
                            />
                        ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">Intensidad</span>
                </div>
                {heatmapData && (
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {heatmapData.filter(d => {
                            const dDate = new Date(d.date);
                            return dDate.getMonth() === monthStart.getMonth() && dDate.getFullYear() === monthStart.getFullYear();
                        }).reduce((acc, curr) => acc + curr.count, 0)} Total
                    </span>
                )}
            </div>
        </motion.div>
    );
}
