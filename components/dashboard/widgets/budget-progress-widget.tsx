'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useBudget } from '@/hooks/useBudget';
import { useFormat } from '@/hooks/useFormat';
import type { WidgetProps } from '@/types/dashboard';

export function BudgetProgressWidget({ config }: WidgetProps) {
    const { budgets, isLoading } = useBudget();
    const { formatMoney } = useFormat();

    // Find the most critical or main budget
    const mainBudget = budgets?.[0];
    const spent = mainBudget?.spent || 0;
    const total = mainBudget?.amount || 0;
    const percentage = total > 0 ? (spent / total) * 100 : 0;

    return (
        <motion.div
            className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Progreso de Presupuesto
                </h3>
                <Target className="w-5 h-5 text-primary" />
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    <div className="h-4 w-full bg-neutral-100 animate-pulse rounded" />
                    <div className="h-2 w-full bg-neutral-100 animate-pulse rounded" />
                </div>
            ) : mainBudget ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-sm font-medium text-neutral-500">{mainBudget.name}</p>
                            <p className="text-xl font-bold">{formatMoney(spent)} / {formatMoney(total)}</p>
                        </div>
                        <span className="text-sm font-semibold">{percentage.toFixed(0)}%</span>
                    </div>

                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
            ) : (
                <div className="h-24 flex items-center justify-center border border-dashed rounded-lg">
                    <p className="text-xs text-neutral-400">Sin presupuestos activos</p>
                </div>
            )}
        </motion.div>
    );
}
