'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { WidgetProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface HeatmapValue {
  date: string;
  count: number;
}

export function CalendarHeatmapWidget({ config }: WidgetProps) {
  // TODO: Replace with actual transaction data
  const generateMockData = (): HeatmapValue[] => {
    const data: HeatmapValue[] = [];
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const randomCount = Math.floor(Math.random() * 10);
      if (randomCount > 0) {
        data.push({
          date: new Date(d).toISOString().split('T')[0],
          count: randomCount,
        });
      }
    }

    return data;
  };

  const heatmapData = generateMockData();
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  return (
    <motion.div
      className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Activity Overview
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Transaction frequency over the past year
          </p>
        </div>
        <Calendar className="w-5 h-5 text-neutral-400" />
      </div>

      <div className="calendar-heatmap-container">
        <CalendarHeatmap
          startDate={oneYearAgo}
          endDate={today}
          values={heatmapData}
          classForValue={(value) => {
            if (!value || value.count === 0) {
              return 'color-empty';
            }
            if (value.count < 3) {
              return 'color-scale-1';
            }
            if (value.count < 6) {
              return 'color-scale-2';
            }
            if (value.count < 9) {
              return 'color-scale-3';
            }
            return 'color-scale-4';
          }}
          tooltipDataAttrs={(value: HeatmapValue) => {
            if (!value || !value.date) {
              return { 'data-tip': 'No transactions' };
            }
            return {
              'data-tip': `${value.count} transaction${value.count !== 1 ? 's' : ''} on ${
                value.date
              }`,
            };
          }}
          showWeekdayLabels
        />
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-neutral-100 dark:bg-neutral-700" />
          <div className="w-3 h-3 rounded-sm bg-primary-200 dark:bg-primary-900" />
          <div className="w-3 h-3 rounded-sm bg-primary-400 dark:bg-primary-700" />
          <div className="w-3 h-3 rounded-sm bg-primary-600 dark:bg-primary-500" />
          <div className="w-3 h-3 rounded-sm bg-primary-800 dark:bg-primary-400" />
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">More</span>
      </div>

      <style jsx global>{`
        .calendar-heatmap-container {
          font-size: 10px;
        }

        .react-calendar-heatmap {
          width: 100%;
        }

        .react-calendar-heatmap text {
          font-size: 10px;
          fill: #9ca3af;
        }

        .react-calendar-heatmap .color-empty {
          fill: #f3f4f6;
        }

        .react-calendar-heatmap .color-scale-1 {
          fill: #bae6fd;
        }

        .react-calendar-heatmap .color-scale-2 {
          fill: #7dd3fc;
        }

        .react-calendar-heatmap .color-scale-3 {
          fill: #38bdf8;
        }

        .react-calendar-heatmap .color-scale-4 {
          fill: #0ea5e9;
        }

        .dark .react-calendar-heatmap text {
          fill: #6b7280;
        }

        .dark .react-calendar-heatmap .color-empty {
          fill: #374151;
        }

        .dark .react-calendar-heatmap .color-scale-1 {
          fill: #0c4a6e;
        }

        .dark .react-calendar-heatmap .color-scale-2 {
          fill: #075985;
        }

        .dark .react-calendar-heatmap .color-scale-3 {
          fill: #0369a1;
        }

        .dark .react-calendar-heatmap .color-scale-4 {
          fill: #0ea5e9;
        }

        .react-calendar-heatmap rect:hover {
          stroke: #0ea5e9;
          stroke-width: 2px;
        }
      `}</style>
    </motion.div>
  );
}
