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
    | 'credit-card-alerts'
    | 'daily-volatility'
    | 'activity-heatmap'
    | 'age-of-money'

// Widget size configuration
export interface WidgetSize {
    colSpan: 1 | 2 | 3
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
    'total-balance',
    'activity-heatmap',
    'financial-health',
    'savings-goals',
    'critical-budgets',
    'quick-actions',
    'cash-flow',
    'expense-structure',
    'recent-activity',
    'credit-card-alerts',
    'daily-volatility',
    'age-of-money'
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
    'credit-card-alerts',
    'daily-volatility',
    'activity-heatmap',
    'age-of-money'
]

// Default sizes based on widget type
const DEFAULT_WIDGET_SIZES: Record<WidgetId, WidgetSize> = {
    'total-balance': { colSpan: 2 },
    'financial-health': { colSpan: 1 },
    'savings-goals': { colSpan: 3 },
    'critical-budgets': { colSpan: 1 },
    'quick-actions': { colSpan: 1 },
    'cash-flow': { colSpan: 3 },
    'expense-structure': { colSpan: 2 },
    'recent-activity': { colSpan: 2 },
    'balance-trend': { colSpan: 1 },
    'currency-breakdown': { colSpan: 1 },
    'expense-nature': { colSpan: 1 },
    'credit-card-alerts': { colSpan: 1 },
    'daily-volatility': { colSpan: 2 },
    'activity-heatmap': { colSpan: 2 },
    'age-of-money': { colSpan: 1 },
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
            name: 'dashboard-layout-storage-v4',
            partialize: (state) => ({
                activeWidgets: state.activeWidgets,
                widgetSizes: state.widgetSizes
            }),
        }
    )
)
