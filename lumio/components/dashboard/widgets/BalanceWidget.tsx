'use client';

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';
import type { WidgetProps } from '@/types/dashboard';

export function BalanceWidget({ config }: WidgetProps) {
  // TODO: Replace with actual data from API
  const balance = 12450.75;
  const lastMonthBalance = 11200.0;
  const change = balance - lastMonthBalance;
  const changePercent = (change / lastMonthBalance) * 100;

  return (
    <motion.div
      className="p-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-lg text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium opacity-90">Total Balance</h3>
        <Wallet className="w-5 h-5 opacity-75" />
      </div>

      <div className="mb-4">
        <AnimatedNumber
          value={balance}
          currency="USD"
          className="text-3xl md:text-4xl font-bold"
        />
      </div>

      <div className="flex items-center gap-2">
        {change >= 0 ? (
          <TrendingUp className="w-4 h-4 text-success-300" />
        ) : (
          <TrendingDown className="w-4 h-4 text-error-300" />
        )}
        <span className="text-sm font-medium">
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)} ({changePercent.toFixed(1)}%)
        </span>
        <span className="text-sm opacity-75">vs last month</span>
      </div>
    </motion.div>
  );
}
