'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  animated?: boolean;
}

const heightClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  default: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

export function ProgressBar({
  current,
  total,
  className,
  height = 'md',
  variant = 'default',
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min((current / total) * 100, 100);

  // Auto-determine variant based on percentage if not specified
  const autoVariant =
    variant === 'default'
      ? percentage >= 100
        ? 'error'
        : percentage >= 80
        ? 'warning'
        : 'success'
      : variant;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(current)}
          </span>
          <span className="text-neutral-500 dark:text-neutral-500">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn('w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden', heightClasses[height], className)}>
        <motion.div
          className={cn('h-full rounded-full', variantClasses[autoVariant])}
          initial={{ width: animated ? 0 : `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? 0.6 : 0,
            ease: 'easeOut',
          }}
        />
      </div>
    </div>
  );
}
