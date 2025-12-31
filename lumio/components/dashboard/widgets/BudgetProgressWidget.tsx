'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import type { WidgetProps } from '@/types/dashboard';

export function BudgetProgressWidget({ config }: WidgetProps) {
  // TODO: Replace with actual data
  const budgets = [
    { name: 'Monthly Budget', current: 2850, total: 3000, period: 'December' },
    { name: 'Dining Out', current: 450, total: 400, period: 'This month' },
    { name: 'Savings Goal', current: 1200, total: 2000, period: 'Q4 2024' },
  ];

  return (
    <motion.div
      className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Budget Progress
        </h3>
        <Target className="w-5 h-5 text-neutral-400" />
      </div>

      <div className="space-y-5">
        {budgets.map((budget, index) => (
          <motion.div
            key={budget.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {budget.name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{budget.period}</p>
              </div>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                ${budget.current.toFixed(0)} / ${budget.total.toFixed(0)}
              </span>
            </div>
            <ProgressBar current={budget.current} total={budget.total} showLabel />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
