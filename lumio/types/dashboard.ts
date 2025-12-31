export type WidgetType =
  | 'balance'
  | 'spending-chart'
  | 'category-breakdown'
  | 'recent-transactions'
  | 'budget-progress'
  | 'calendar-heatmap'
  | 'savings-goal'
  | 'cash-flow'
  | 'upcoming-bills';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface Widget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  order: number;
  isVisible: boolean;
  config?: Record<string, unknown>;
}

export interface DashboardConfig {
  widgets: Widget[];
  layout: 'grid' | 'masonry';
  compactMode: boolean;
}

export interface WidgetProps {
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}
