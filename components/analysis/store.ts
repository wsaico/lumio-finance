import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WidgetInstance, WidgetType } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisState {
    widgets: WidgetInstance[];
    isEditMode: boolean;

    // Actions
    toggleEditMode: () => void;
    updateLayout: (widgets: WidgetInstance[]) => void;
    addWidget: (type: WidgetType) => void;
    removeWidget: (id: string) => void;
    resetLayout: () => void;
}

const DEFAULT_LAYOUT: WidgetInstance[] = [
    // Row 1: KPIs
    { id: '1', type: 'available-money', size: 'medium', order: 0, isVisible: true },
    { id: '2', type: 'income-trend', size: 'small', order: 1, isVisible: true },
    { id: '3', type: 'expense-trend', size: 'small', order: 2, isVisible: true },
    { id: '6', type: 'transactions-count', size: 'small', order: 3, isVisible: true },

    // Row 2: KPIs + Snapshot
    { id: '4', type: 'net-flow', size: 'medium', order: 4, isVisible: true },
    { id: '5', type: 'savings-rate', size: 'small', order: 5, isVisible: true },
    { id: '7', type: 'global-budget', size: 'small', order: 6, isVisible: true },
    { id: '12', type: 'accounts-list', size: 'small', order: 7, isVisible: true },

    // Row 3: Trends
    { id: '8', type: 'balance-history', size: 'wide', order: 8, isVisible: true },
    { id: '9', type: 'financial-trend', size: 'wide', order: 9, isVisible: true },

    // Row 4: Focus
    { id: '10', type: 'financial-health', size: 'medium', order: 10, isVisible: true },
    { id: '15', type: 'monthly-evolution', size: 'medium', order: 11, isVisible: true },
    { id: '13', type: 'expense-treemap', size: 'medium', order: 12, isVisible: true },

    // Row 5: Ops
    { id: '11', type: 'cash-flow-daily', size: 'medium', order: 13, isVisible: true },
    { id: '16', type: 'daily-volatility', size: 'medium', order: 14, isVisible: true },
    { id: '17', type: 'budget-alerts', size: 'medium', order: 15, isVisible: true },

    // Row 6: Activity
    { id: '14', type: 'expense-calendar', size: 'large', order: 16, isVisible: true }
];

export const useAnalysisStore = create<AnalysisState>()(
    persist(
        (set) => ({
            widgets: DEFAULT_LAYOUT,
            isEditMode: false,

            toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

            updateLayout: (newWidgets) => set({ widgets: newWidgets }),

            addWidget: (type) => set((state) => {
                const newWidget: WidgetInstance = {
                    id: uuidv4(),
                    type,
                    size: 'medium',
                    order: state.widgets.length,
                    isVisible: true
                };
                return { widgets: [...state.widgets, newWidget] };
            }),

            removeWidget: (id) => set((state) => ({
                widgets: state.widgets.filter((w) => w.id !== id)
            })),

            resetLayout: () => set({ widgets: DEFAULT_LAYOUT })
        }),
        {
            name: 'lumio-analysis-layout',
        }
    )
);
