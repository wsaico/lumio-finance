'use client';

import { useDashboard } from '../dashboard-context';
import { KpiCard } from './kpi-card';
import { Wallet } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

export function AvailableMoneyWidget() {
    const { data } = useDashboard();
    const balance = data?.metrics?.availableMoney ?? 0;
    const { format } = useCurrency();

    return (
        <KpiCard
            title="Dinero Disponible"
            value={format(balance)}
            icon={Wallet}
            variant="cyan"
            className="border-none"
        >
            <div className="absolute bottom-3 right-4 opacity-25">
                <Wallet className="w-12 h-12 -rotate-12" />
            </div>
        </KpiCard>
    );
}
