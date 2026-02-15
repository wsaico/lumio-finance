'use client';

import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export function CalendarHeatmapWidget() {
  const [currentDate] = useState(new Date());

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ['activity-heatmap-v2'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/activity-heatmap')
      if (!res.ok) throw new Error('Failed')
      return res.json()
    }
  })

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const getIntensityClass = (day: number) => {
    // Logic to match high activity or current day
    if (day === currentDate.getDate()) return 'bg-[#FF007A] text-white shadow-lg shadow-[#FF007A]/40 scale-110 z-10';

    // Check heatmap data
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const activity = heatmapData?.find((d: any) => d.date === dateStr);

    if (!activity || activity.count === 0) return 'bg-zinc-100 dark:bg-white/5 text-zinc-400 dark:text-zinc-600';
    if (activity.count < 3) return 'bg-zinc-200 dark:bg-white/10 text-zinc-500 dark:text-zinc-400';
    if (activity.count < 6) return 'bg-zinc-300 dark:bg-white/20 text-zinc-700 dark:text-zinc-200';
    return 'bg-zinc-400 dark:bg-white/30 text-zinc-900 dark:text-white';
  };

  if (isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-full"
    >
      <Card className="widget-surface bg-white dark:bg-zinc-900 border-none h-full flex flex-col overflow-hidden relative shadow-2xl">
        {/* Header Section */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#FF007A]/10 border border-[#FF007A]/20">
              <Calendar className="w-5 h-5 text-[#FF007A]" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Mapa de Calor de Gastos</h3>
              <p className="text-[9px] font-bold text-zinc-500 opacity-60">Intensidad diaria (Mes Actual)</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-white/5 rounded-lg transition-colors"><ChevronLeft className="w-3.5 h-3.5 text-zinc-600" /></button>
            <button className="p-1 hover:bg-white/5 rounded-lg transition-colors"><ChevronRight className="w-3.5 h-3.5 text-zinc-600" /></button>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(wd => (
              <div key={wd} className="text-center text-[8px] font-black text-zinc-600 uppercase">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map(i => <div key={`empty-${i}`} className="aspect-square" />)}
            {days.map(day => (
              <motion.div
                key={day}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "aspect-square rounded-xl flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-all cursor-default",
                  getIntensityClass(day)
                )}
              >
                {day}
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
