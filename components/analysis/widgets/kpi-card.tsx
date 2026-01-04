'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        label?: string;
    };
    variant?: 'default' | 'cyan' | 'magenta' | 'black';
    className?: string;
    children?: React.ReactNode;
}

const VARIANTS = {
    default: 'bg-white/70 text-zinc-900 border-white/40 dark:bg-zinc-900/60 dark:text-white dark:border-white/5',
    cyan: 'bg-gradient-to-br from-cyan-500/80 via-sky-500/70 to-blue-600/80 text-white border-white/10',
    magenta: 'bg-gradient-to-br from-fuchsia-500/80 via-pink-500/70 to-rose-500/80 text-white border-white/10',
    black: 'bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 text-white border-white/5'
};

export function KpiCard({
    title,
    value,
    icon: Icon,
    trend,
    variant = 'default',
    className,
    children
}: KpiCardProps) {
    const isDefault = variant === 'default';

    return (
        <Card
            className={cn(
                'relative h-full w-full overflow-hidden rounded-2xl border p-4 backdrop-blur-xl shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] transition-transform duration-300 hover:-translate-y-0.5',
                VARIANTS[variant],
                className
            )}
        >
            <div className="absolute -right-14 -top-16 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                        <span
                            className={cn(
                                'text-[11px] font-semibold uppercase tracking-[0.2em]',
                                isDefault ? 'text-muted-foreground' : 'text-white/70'
                            )}
                        >
                            {title}
                        </span>
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-semibold tracking-tight truncate"
                        >
                            {value}
                        </motion.div>
                    </div>

                    {Icon && (
                        <div
                            className={cn(
                                'rounded-xl border p-2 backdrop-blur-sm',
                                isDefault
                                    ? 'bg-zinc-900/5 border-zinc-200/60 text-zinc-500 dark:border-zinc-800/60 dark:bg-white/5 dark:text-white/70'
                                    : 'bg-white/15 border-white/10 text-white'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {trend && (
                    <div className="flex items-center gap-2 text-xs">
                        <span
                            className={cn(
                                'rounded-full px-2 py-1 font-semibold',
                                trend.isPositive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            )}
                        >
                            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                        </span>
                        <span className={cn('text-[11px] truncate', isDefault ? 'text-muted-foreground' : 'text-white/70')}>
                            {trend.label || 'vs mes anterior'}
                        </span>
                    </div>
                )}
            </div>

            {children}
        </Card>
    );
}
