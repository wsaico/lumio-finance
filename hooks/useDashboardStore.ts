import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WidgetId =
    | 'total-balance'
    | 'financial-health'
    | 'savings-goals'
    | 'critical-budgets'
    | 'quick-actions'
    | 'recent-activity'
    | 'cash-flow'
    | 'expense-structure'
    | 'balance-trend'
    | 'currency-breakdown'
    | 'expense-nature'
    | 'credit-card-alerts'
    | 'daily-volatility'
    | 'activity-heatmap'
    | 'activity-heatmap-v2'
    | 'age-of-money'
    | 'balance-history'
    | 'financial-trend'
    | 'expense-treemap'
    | 'premium-summary'
    | 'loans-summary'

// Widget size configuration
export interface WidgetSize {
    colSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

interface DashboardState {
    activeWidgets: WidgetId[]
    widgetSizes: Record<WidgetId, WidgetSize>
    availableWidgets: WidgetId[] // For add modal
    isEditMode: boolean
    isDragging: boolean

    // Actions
    toggleEditMode: () => void
    addWidget: (id: WidgetId) => void
    removeWidget: (id: WidgetId) => void
    reorderWidgets: (newOrder: WidgetId[]) => void
    resetToDefault: () => void
    resizeWidget: (id: WidgetId, size: WidgetSize) => void
    setDragging: (isDragging: boolean) => void
}

const DEFAULT_WIDGETS: WidgetId[] = [
    'premium-summary',
    'financial-health',
    'balance-trend',
    'loans-summary',
    'activity-heatmap-v2',
    'daily-volatility',
    'financial-trend',
    'expense-treemap',
    'quick-actions',
    'recent-activity',
]

const ALL_WIDGETS: WidgetId[] = [
    'total-balance',
    'financial-health',
    'savings-goals',
    'critical-budgets',
    'quick-actions',
    'recent-activity',
    'cash-flow',
    'expense-structure',
    'balance-trend',
    'currency-breakdown',
    'expense-nature',
    'credit-card-alerts',
    'daily-volatility',
    'activity-heatmap',
    'activity-heatmap-v2',
    'age-of-money',
    'balance-history',
    'financial-trend',
    'expense-treemap',
    'premium-summary',
    'loans-summary'
]

// Default sizes based on widget type (12-column grid)
const DEFAULT_WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
    'total-balance': { colSpan: 4 },
    'financial-health': { colSpan: 4 },
    'savings-goals': { colSpan: 12 },
    'critical-budgets': { colSpan: 4 },
    'quick-actions': { colSpan: 4 },
    'cash-flow': { colSpan: 12 },
    'expense-structure': { colSpan: 8 },
    'recent-activity': { colSpan: 4 },
    'balance-trend': { colSpan: 4 },
    'currency-breakdown': { colSpan: 4 },
    'expense-nature': { colSpan: 4 },
    'credit-card-alerts': { colSpan: 4 },
    'daily-volatility': { colSpan: 4 },
    'activity-heatmap': { colSpan: 6 },
    'activity-heatmap-v2': { colSpan: 8 },
    'age-of-money': { colSpan: 4 },
    'balance-history': { colSpan: 8 },
    'financial-trend': { colSpan: 4 },
    'expense-treemap': { colSpan: 8 },
    'premium-summary': { colSpan: 12 },
    'loans-summary': { colSpan: 4 },
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            activeWidgets: DEFAULT_WIDGETS,
            widgetSizes: DEFAULT_WIDGET_SIZES,
            availableWidgets: ALL_WIDGETS,
            isEditMode: false,
            isDragging: false,

            toggleEditMode: () => set({ isEditMode: !get().isEditMode }),

            addWidget: (id) => {
                const current = get().activeWidgets
                const currentSizes = get().widgetSizes
                if (!current.includes(id)) {
                    set({
                        activeWidgets: [...current, id],
                        widgetSizes: {
                            ...currentSizes,
                            [id]: DEFAULT_WIDGET_SIZES[id] || { colSpan: 1 }
                        }
                    })
                }
            },

            removeWidget: (id) => {
                const current = get().activeWidgets
                set({ activeWidgets: current.filter(w => w !== id) })
            },

            reorderWidgets: (newOrder) => {
                set({ activeWidgets: newOrder })
            },

            resetToDefault: () => {
                set({
                    activeWidgets: DEFAULT_WIDGETS,
                    widgetSizes: DEFAULT_WIDGET_SIZES
                })
            },

            resizeWidget: (id, size) => {
                const currentSizes = get().widgetSizes
                set({
                    widgetSizes: {
                        ...currentSizes,
                        [id]: size
                    }
                })
            },

            setDragging: (isDragging) => set({ isDragging })
        }),
        {
            name: 'dashboard-layout-storage-v8',
            partialize: (state) => ({
                activeWidgets: state.activeWidgets,
                widgetSizes: state.widgetSizes
            }),
        }
    )
)
