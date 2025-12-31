
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type HeaderHeight = 'large' | 'small'
export type IconStyle = 'rounded' | 'square' | 'circle'
export type FontType = 'default' | 'inter' | 'roboto' | 'mono'
export type AnimationLevel = 'all' | 'minimal' | 'none'
export type NumberAnimationType = 'count' | 'instant'
export type DateBannerTotal = 'day' | 'week' | 'month' | 'none'

interface SettingsState {
    // ESTILO
    headerHeight: HeaderHeight
    setHeaderHeight: (h: HeaderHeight) => void

    iconStyle: IconStyle
    setIconStyle: (s: IconStyle) => void

    font: FontType
    setFont: (f: FontType) => void

    animations: AnimationLevel
    setAnimations: (a: AnimationLevel) => void

    numberAnimation: NumberAnimationType
    setNumberAnimation: (t: NumberAnimationType) => void

    highContrast: boolean
    setHighContrast: (enabled: boolean) => void

    // TRANSACCIONES
    autoPayTransactions: boolean
    setAutoPayTransactions: (enabled: boolean) => void

    paymentDate: 'actual' | 'due'
    setPaymentDate: (d: 'actual' | 'due') => void

    dateBannerTotal: DateBannerTotal
    setDateBannerTotal: (t: DateBannerTotal) => void

    monthlySummary: boolean
    setMonthlySummary: (enabled: boolean) => void

    // CUENTAS
    showAccountLabel: boolean
    setShowAccountLabel: (enabled: boolean) => void

    // PRESUPUESTOS & OBJETIVOS
    budgetTotalType: 'remaining' | 'spent' | 'percentage'
    setBudgetTotalType: (t: 'remaining' | 'spent' | 'percentage') => void

    goalTotalType: 'remaining' | 'saved' | 'percentage'
    setGoalTotalType: (t: 'remaining' | 'saved' | 'percentage') => void

    // TÍTULOS
    promptTransactionTitle: boolean
    setPromptTransactionTitle: (enabled: boolean) => void

    autoTitles: boolean
    setAutoTitles: (enabled: boolean) => void

    // FORMATO
    numberFormat: string
    setNumberFormat: (f: string) => void

    currencyCode: string
    setCurrencyCode: (c: string) => void

    // CAJA CHICA
    pettyCashSimpleMode: boolean
    setPettyCashSimpleMode: (enabled: boolean) => void

    enableAIReceiptScanning: boolean
    setEnableAIReceiptScanning: (enabled: boolean) => void

    showPettyCashIndicators: boolean
    setShowPettyCashIndicators: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // DEFAULTS
            headerHeight: 'large',
            setHeaderHeight: (headerHeight) => set({ headerHeight }),

            iconStyle: 'rounded',
            setIconStyle: (iconStyle) => set({ iconStyle }),

            font: 'default',
            setFont: (font) => set({ font }),

            animations: 'all',
            setAnimations: (animations) => set({ animations }),

            numberAnimation: 'count',
            setNumberAnimation: (numberAnimation) => set({ numberAnimation }),

            highContrast: false,
            setHighContrast: (highContrast) => set({ highContrast }),

            autoPayTransactions: false,
            setAutoPayTransactions: (autoPayTransactions) => set({ autoPayTransactions }),

            paymentDate: 'actual',
            setPaymentDate: (paymentDate) => set({ paymentDate }),

            dateBannerTotal: 'day',
            setDateBannerTotal: (dateBannerTotal) => set({ dateBannerTotal }),

            monthlySummary: true,
            setMonthlySummary: (monthlySummary) => set({ monthlySummary }),

            showAccountLabel: false,
            setShowAccountLabel: (showAccountLabel) => set({ showAccountLabel }),

            budgetTotalType: 'remaining',
            setBudgetTotalType: (budgetTotalType) => set({ budgetTotalType }),

            goalTotalType: 'remaining',
            setGoalTotalType: (goalTotalType) => set({ goalTotalType }),

            promptTransactionTitle: true,
            setPromptTransactionTitle: (promptTransactionTitle) => set({ promptTransactionTitle }),

            autoTitles: true,
            setAutoTitles: (autoTitles) => set({ autoTitles }),

            numberFormat: 'S/. 1,234.56',
            setNumberFormat: (numberFormat) => set({ numberFormat }),

            currencyCode: 'PEN',
            setCurrencyCode: (currencyCode) => set({ currencyCode }),

            pettyCashSimpleMode: false,
            setPettyCashSimpleMode: (pettyCashSimpleMode) => set({ pettyCashSimpleMode }),

            enableAIReceiptScanning: false, // Default DISABLED for safety
            setEnableAIReceiptScanning: (enableAIReceiptScanning) => set({ enableAIReceiptScanning }),

            showPettyCashIndicators: false,
            setShowPettyCashIndicators: (showPettyCashIndicators) => set({ showPettyCashIndicators }),
        }),
        {
            name: 'lumio-settings-storage', // unique name
            storage: createJSONStorage(() => localStorage),
        }
    )
)
