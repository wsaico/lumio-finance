'use client';

import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useFormat } from '@/hooks/use-format';
import type { WidgetProps } from '@/types/dashboard';

export function BalanceWidget({ config }: WidgetProps) {
    const { totalBalanceConverted, isLoading } = useAccounts();
    const { formatMoney } = useFormat();

    return (
        <motion.div
            className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Balance Total
                </h3>
                <Wallet className="w-5 h-5 text-primary" />
            </div>

            <div className="flex flex-col justify-center">
                {isLoading ? (
                    <div className="h-10 w-32 bg-neutral-100 dark:bg-neutral-700 animate-pulse rounded" />
                ) : (
                    <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-1">
                        {formatMoney(totalBalanceConverted)}
                    </div>
                )}
                <p className="text-sm text-neutral-500">Saldo consolidado</p>
            </div>
        </motion.div>
    );
}
