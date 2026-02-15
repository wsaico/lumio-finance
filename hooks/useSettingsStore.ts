
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface SettingsState {
    // SYSTEM
    highContrast: boolean
    setHighContrast: (enabled: boolean) => void

    // FORMATO
    numberFormat: string
    setNumberFormat: (f: string) => void

    currencyCode: string
    setCurrencyCode: (c: string) => void

    // PRESUPUESTOS & OBJETIVOS
    budgetTotalType: 'remaining' | 'spent' | 'percentage'
    setBudgetTotalType: (t: 'remaining' | 'spent' | 'percentage') => void

    goalTotalType: 'remaining' | 'saved' | 'percentage'
    setGoalTotalType: (t: 'remaining' | 'saved' | 'percentage') => void

    // PERSONALIZACIÓN
    accentColor: string
    setAccentColor: (color: string) => void

    fontFamily: string
    setFontFamily: (font: string) => void

    sidebarCollapsed: boolean
    setSidebarCollapsed: (collapsed: boolean) => void

    // EXPERIMENTAL
    enableAIReceiptScanning: boolean
    setEnableAIReceiptScanning: (enabled: boolean) => void

    pettyCashSimpleMode: boolean
    setPettyCashSimpleMode: (enabled: boolean) => void

    showPettyCashIndicators: boolean
    setShowPettyCashIndicators: (enabled: boolean) => void

    isBalanceVisible: boolean
    setIsBalanceVisible: (visible: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // DEFAULTS
            highContrast: false,
            setHighContrast: (highContrast) => set({ highContrast }),

            numberFormat: 'S/. 1,234.56',
            setNumberFormat: (numberFormat) => set({ numberFormat }),

            currencyCode: 'PEN',
            setCurrencyCode: (currencyCode) => set({ currencyCode }),

            budgetTotalType: 'remaining',
            setBudgetTotalType: (budgetTotalType) => set({ budgetTotalType }),

            goalTotalType: 'remaining',
            setGoalTotalType: (goalTotalType) => set({ goalTotalType }),

            accentColor: '#E8572A',
            setAccentColor: (accentColor) => set({ accentColor }),

            fontFamily: 'Geist',
            setFontFamily: (fontFamily) => set({ fontFamily }),

            sidebarCollapsed: false,
            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

            enableAIReceiptScanning: false, // Default DISABLED for safety
            setEnableAIReceiptScanning: (enableAIReceiptScanning) => set({ enableAIReceiptScanning }),

            pettyCashSimpleMode: false,
            setPettyCashSimpleMode: (pettyCashSimpleMode) => set({ pettyCashSimpleMode }),

            showPettyCashIndicators: true,
            setShowPettyCashIndicators: (showPettyCashIndicators) => set({ showPettyCashIndicators }),

            isBalanceVisible: true,
            setIsBalanceVisible: (isBalanceVisible) => set({ isBalanceVisible }),
        }),
        {
            name: 'lumio-settings-storage', // unique name
            storage: createJSONStorage(() => localStorage),
        }
    )
)
