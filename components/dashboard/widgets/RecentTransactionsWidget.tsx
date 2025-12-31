'use client';

import { motion } from 'framer-motion';
import { Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { WidgetProps } from '@/types/dashboard';
import { cn } from '@/lib/utils';

export function RecentTransactionsWidget({ config }: WidgetProps) {
  // TODO: Replace with actual data
  const transactions = [
    {
      id: '1',
      description: 'Grocery Store',
      amount: -85.5,
      category: 'Food & Dining',
      date: new Date(),
      type: 'expense' as const,
    },
    {
      id: '2',
      description: 'Salary',
      amount: 3500,
      category: 'Income',
      date: new Date(),
      type: 'income' as const,
    },
    {
      id: '3',
      description: 'Gas Station',
      amount: -45.0,
      category: 'Transportation',
      date: new Date(),
      type: 'expense' as const,
    },
    {
      id: '4',
      description: 'Netflix',
      amount: -15.99,
      category: 'Entertainment',
      date: new Date(),
      type: 'expense' as const,
    },
  ];

  return (
    <motion.div
      className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Recent Transactions
        </h3>
        <Receipt className="w-5 h-5 text-neutral-400" />
      </div>

      <div className="space-y-3">
        {transactions.map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-full',
                  transaction.type === 'income'
                    ? 'bg-success-100 dark:bg-success-900/30'
                    : 'bg-error-100 dark:bg-error-900/30'
                )}
              >
                {transaction.type === 'income' ? (
                  <ArrowDownRight className="w-4 h-4 text-success-600 dark:text-success-400" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-error-600 dark:text-error-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {transaction.description}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {transaction.category}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'text-sm font-semibold',
                transaction.type === 'income'
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-error-600 dark:text-error-400'
              )}
            >
              {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
