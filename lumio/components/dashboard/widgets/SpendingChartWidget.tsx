'use client';

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import type { WidgetProps } from '@/types/dashboard';

export function SpendingChartWidget({ config }: WidgetProps) {
  // TODO: Implement with Recharts
  return (
    <motion.div
      className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Spending Trend
        </h3>
        <BarChart3 className="w-5 h-5 text-neutral-400" />
      </div>

      <div className="h-64 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <p className="text-sm text-neutral-500">Chart implementation pending</p>
      </div>
    </motion.div>
  );
}
