'use client';

import type { Widget } from '@/types/dashboard';
import { BalanceWidget } from './widgets/BalanceWidget';
import { SpendingChartWidget } from './widgets/SpendingChartWidget';
import { CategoryBreakdownWidget } from './widgets/CategoryBreakdownWidget';
import { RecentTransactionsWidget } from './widgets/RecentTransactionsWidget';
import { BudgetProgressWidget } from './widgets/BudgetProgressWidget';

interface WidgetRendererProps {
  widget: Widget;
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case 'balance':
      return <BalanceWidget config={widget.config} />;
    case 'spending-chart':
      return <SpendingChartWidget config={widget.config} />;
    case 'category-breakdown':
      return <CategoryBreakdownWidget config={widget.config} />;
    case 'recent-transactions':
      return <RecentTransactionsWidget config={widget.config} />;
    case 'budget-progress':
      return <BudgetProgressWidget config={widget.config} />;
    default:
      return (
        <div className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Widget not implemented: {widget.type}</p>
        </div>
      );
  }
}
