import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardConfig, Widget } from '@/types/dashboard';

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: [
    { id: '1', type: 'balance', size: 'medium', order: 0, isVisible: true },
    { id: '2', type: 'spending-chart', size: 'large', order: 1, isVisible: true },
    { id: '3', type: 'category-breakdown', size: 'medium', order: 2, isVisible: true },
    { id: '4', type: 'recent-transactions', size: 'large', order: 3, isVisible: true },
    { id: '5', type: 'budget-progress', size: 'medium', order: 4, isVisible: true },
  ],
  layout: 'grid',
  compactMode: false,
};

async function fetchDashboardConfig(): Promise<DashboardConfig> {
  const response = await fetch('/api/dashboard/config');

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard config');
  }

  const data = await response.json();
  return data.config || DEFAULT_DASHBOARD_CONFIG;
}

async function saveDashboardConfig(config: DashboardConfig): Promise<void> {
  const response = await fetch('/api/dashboard/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    throw new Error('Failed to save dashboard config');
  }
}

export function useDashboard() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['dashboard-config'],
    queryFn: fetchDashboardConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const saveMutation = useMutation({
    mutationFn: saveDashboardConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-config'] });
    },
  });

  const updateWidgetOrder = useCallback(
    (widgetId: string, newOrder: number) => {
      if (!config) return;

      const updatedWidgets = config.widgets.map((widget) => {
        if (widget.id === widgetId) {
          return { ...widget, order: newOrder };
        }
        return widget;
      });

      // Reorder all widgets
      const sortedWidgets = updatedWidgets
        .sort((a, b) => a.order - b.order)
        .map((widget, index) => ({ ...widget, order: index }));

      const newConfig = { ...config, widgets: sortedWidgets };
      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      if (!config) return;

      const updatedWidgets = config.widgets.map((widget) => {
        if (widget.id === widgetId) {
          return { ...widget, isVisible: !widget.isVisible };
        }
        return widget;
      });

      const newConfig = { ...config, widgets: updatedWidgets };
      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const updateWidgetSize = useCallback(
    (widgetId: string, size: Widget['size']) => {
      if (!config) return;

      const updatedWidgets = config.widgets.map((widget) => {
        if (widget.id === widgetId) {
          return { ...widget, size };
        }
        return widget;
      });

      const newConfig = { ...config, widgets: updatedWidgets };
      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const updateWidgetConfig = useCallback(
    (widgetId: string, widgetConfig: Record<string, unknown>) => {
      if (!config) return;

      const updatedWidgets = config.widgets.map((widget) => {
        if (widget.id === widgetId) {
          return { ...widget, config: widgetConfig };
        }
        return widget;
      });

      const newConfig = { ...config, widgets: updatedWidgets };
      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const addWidget = useCallback(
    (widget: Omit<Widget, 'id' | 'order'>) => {
      if (!config) return;

      const newWidget: Widget = {
        ...widget,
        id: crypto.randomUUID(),
        order: config.widgets.length,
      };

      const newConfig = {
        ...config,
        widgets: [...config.widgets, newWidget],
      };

      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      if (!config) return;

      const updatedWidgets = config.widgets
        .filter((widget) => widget.id !== widgetId)
        .map((widget, index) => ({ ...widget, order: index }));

      const newConfig = { ...config, widgets: updatedWidgets };
      saveMutation.mutate(newConfig);
    },
    [config, saveMutation]
  );

  const toggleLayout = useCallback(() => {
    if (!config) return;

    const newConfig = {
      ...config,
      layout: config.layout === 'grid' ? ('masonry' as const) : ('grid' as const),
    };

    saveMutation.mutate(newConfig);
  }, [config, saveMutation]);

  const toggleCompactMode = useCallback(() => {
    if (!config) return;

    const newConfig = {
      ...config,
      compactMode: !config.compactMode,
    };

    saveMutation.mutate(newConfig);
  }, [config, saveMutation]);

  const resetToDefault = useCallback(() => {
    saveMutation.mutate(DEFAULT_DASHBOARD_CONFIG);
  }, [saveMutation]);

  return {
    config: config || DEFAULT_DASHBOARD_CONFIG,
    isLoading,
    isSaving: saveMutation.isPending,
    updateWidgetOrder,
    toggleWidgetVisibility,
    updateWidgetSize,
    updateWidgetConfig,
    addWidget,
    removeWidget,
    toggleLayout,
    toggleCompactMode,
    resetToDefault,
  };
}
