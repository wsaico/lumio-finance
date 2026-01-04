'use client';

import type { Widget } from '@/types/dashboard';
import { BalanceWidget } from './widgets/balance-widget';
import { SpendingChartWidget } from './widgets/spending-chart-widget';
import { CategoryBreakdownWidget } from './widgets/category-breakdown-widget';
import { RecentTransactionsWidget } from './widgets/recent-transactions-widget';
import { BudgetProgressWidget } from './widgets/budget-progress-widget';

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
