import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type IconStyle = 'rounded' | 'soft' | 'circle';
export type TxListDensity = 'comfortable' | 'compact';
export type TxAmountTotalStyle = 'colorful' | 'neutral';
export type ProgressBarStyle = 'simple' | 'segmented' | 'gradient';
export type MotionMode = 'full' | 'reduced' | 'none';
export type ThemeMode = 'system' | 'light' | 'dark';
export type NewTxInitialEntry =
  | 'express_title'
  | 'express_amount'
  | 'express_category'
  | 'full_form';
export type ManualPayDateMode = 'scheduled' | 'today';
export type ConfirmAmountMode = 'always' | 'if_zero' | 'never';

export interface HomeWidgetsConfig {
  kpis: boolean;
  charts: boolean;
  budgets: boolean;
  recentTx: boolean;
}

const safeStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(name);
    }
    return AsyncStorage.getItem(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(name, value);
      return;
    }
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(name);
      return;
    }
    await AsyncStorage.removeItem(name);
  },
};

interface SettingsState {
  activeUserId: string | null;
  setActiveUserId: (id: string | null) => void;

  // SYSTEM & SECURITY
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  startHiddenBalances: boolean;
  setStartHiddenBalances: (enabled: boolean) => void;
  pinLockEnabled: boolean;
  setPinLockEnabled: (enabled: boolean) => void;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (enabled: boolean) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;

  // REGIONAL & FORMATO
  countryCode: string;
  setCountryCode: (c: string) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  numberFormat: string;
  setNumberFormat: (f: string) => void;
  currencyCode: string;
  setCurrencyCode: (c: string) => void;

  // PRESUPUESTOS & OBJETIVOS
  budgetTotalType: 'remaining' | 'spent' | 'percentage';
  setBudgetTotalType: (t: 'remaining' | 'spent' | 'percentage') => void;
  goalTotalType: 'remaining' | 'saved' | 'percentage';
  setGoalTotalType: (t: 'remaining' | 'saved' | 'percentage') => void;

  // PERSONALIZACIÓN
  accentColor: string;
  hasCustomAccent: boolean;
  setAccentColor: (color: string, isCustom?: boolean) => void;
  materialYou: boolean;
  setMaterialYou: (enabled: boolean) => void;
  iconStyle: IconStyle;
  setIconStyle: (style: IconStyle) => void;
  txListDensity: TxListDensity;
  setTxListDensity: (density: TxListDensity) => void;
  txAmountTotalStyle: TxAmountTotalStyle;
  setTxAmountTotalStyle: (style: TxAmountTotalStyle) => void;
  progressBarStyle: ProgressBarStyle;
  setProgressBarStyle: (style: ProgressBarStyle) => void;
  motionMode: MotionMode;
  setMotionMode: (mode: MotionMode) => void;
  leftHandedMode: boolean;
  setLeftHandedMode: (enabled: boolean) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontScale: number;
  setFontScale: (scale: number) => void;

  // PÁGINA DE INICIO
  homeWidgets: HomeWidgetsConfig;
  setHomeWidgets: (next: Partial<HomeWidgetsConfig>) => void;

  // TRANSACCIONES
  showAttachmentsButton: boolean;
  setShowAttachmentsButton: (enabled: boolean) => void;
  autoSuggestTitles: boolean;
  setAutoSuggestTitles: (enabled: boolean) => void;
  newTxInitialEntry: NewTxInitialEntry;
  setNewTxInitialEntry: (mode: NewTxInitialEntry) => void;
  defaultAutoPayRecurring: boolean;
  setDefaultAutoPayRecurring: (enabled: boolean) => void;
  manualPayDateMode: ManualPayDateMode;
  setManualPayDateMode: (mode: ManualPayDateMode) => void;
  confirmAmountMode: ConfirmAmountMode;
  setConfirmAmountMode: (mode: ConfirmAmountMode) => void;

  // EXPERIMENTAL & PRIVACIDAD
  enableAIReceiptScanning: boolean;
  setEnableAIReceiptScanning: (enabled: boolean) => void;
  saveScannedReceiptsToDrive: boolean;
  setSaveScannedReceiptsToDrive: (enabled: boolean) => void;
  isBalanceVisible: boolean;
  setIsBalanceVisible: (visible: boolean) => void;

  // INTELIGENCIA PERÚ / LATAM Y NOTIFICACIONES
  payYourselfFirstEnabled: boolean;
  setPayYourselfFirstEnabled: (enabled: boolean) => void;
  payYourselfFirstPct: number;
  setPayYourselfFirstPct: (pct: number) => void;
  payYourselfFirstGoalId: string | null;
  setPayYourselfFirstGoalId: (goalId: string | null) => void;
  noSpendTargetDays: number;
  setNoSpendTargetDays: (days: number) => void;
  mutedAlertTypes: string[];
  setMutedAlertTypes: (types: string[]) => void;
  toggleMutedAlertType: (key: string) => void;

  resetUserPreferencesForSwitch: (userId: string) => void;
}

const USER_DEFAULT_PREFS = {
  themeMode: 'system' as ThemeMode,
  highContrast: false,
  startHiddenBalances: false,
  pinLockEnabled: false,
  biometricsEnabled: false,
  hapticsEnabled: true,
  countryCode: 'PE',
  timezone: 'America/Lima',
  numberFormat: '1,234.56',
  currencyCode: 'PEN',
  budgetTotalType: 'remaining' as const,
  goalTotalType: 'remaining' as const,
  accentColor: '#5B35D5',
  hasCustomAccent: false,
  materialYou: false,
  iconStyle: 'rounded' as IconStyle,
  txListDensity: 'comfortable' as TxListDensity,
  txAmountTotalStyle: 'colorful' as TxAmountTotalStyle,
  progressBarStyle: 'gradient' as ProgressBarStyle,
  motionMode: 'full' as MotionMode,
  leftHandedMode: false,
  fontFamily: 'Outfit',
  fontScale: 100,
  homeWidgets: {
    kpis: true,
    charts: true,
    budgets: true,
    recentTx: true,
  },
  showAttachmentsButton: true,
  autoSuggestTitles: true,
  newTxInitialEntry: 'express_title' as NewTxInitialEntry,
  defaultAutoPayRecurring: true,
  manualPayDateMode: 'scheduled' as ManualPayDateMode,
  confirmAmountMode: 'if_zero' as ConfirmAmountMode,
  enableAIReceiptScanning: true,
  saveScannedReceiptsToDrive: true,
  isBalanceVisible: true,
  payYourselfFirstEnabled: false,
  payYourselfFirstPct: 10,
  payYourselfFirstGoalId: null as string | null,
  noSpendTargetDays: 8,
  mutedAlertTypes: [] as string[],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeUserId: null,
      setActiveUserId: (activeUserId) => set({ activeUserId }),

      ...USER_DEFAULT_PREFS,

      setThemeMode: (themeMode) => set({ themeMode }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setStartHiddenBalances: (startHiddenBalances) => set({ startHiddenBalances }),
      setPinLockEnabled: (pinLockEnabled) => set({ pinLockEnabled }),
      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),

      setCountryCode: (countryCode) => set({ countryCode }),
      setTimezone: (timezone) => set({ timezone }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      setCurrencyCode: (currencyCode) => set({ currencyCode }),

      setBudgetTotalType: (budgetTotalType) => set({ budgetTotalType }),
      setGoalTotalType: (goalTotalType) => set({ goalTotalType }),

      setAccentColor: (accentColor, isCustom = true) =>
        set({ accentColor, hasCustomAccent: isCustom }),
      setMaterialYou: (materialYou) => set({ materialYou }),
      setIconStyle: (iconStyle) => set({ iconStyle }),
      setTxListDensity: (txListDensity) => set({ txListDensity }),
      setTxAmountTotalStyle: (txAmountTotalStyle) => set({ txAmountTotalStyle }),
      setProgressBarStyle: (progressBarStyle) => set({ progressBarStyle }),
      setMotionMode: (motionMode) => set({ motionMode }),
      setLeftHandedMode: (leftHandedMode) => set({ leftHandedMode }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontScale: (fontScale) =>
        set({ fontScale: Math.min(115, Math.max(90, Math.round(fontScale))) }),

      setHomeWidgets: (next) =>
        set((state) => ({
          homeWidgets: { ...state.homeWidgets, ...next },
        })),

      setShowAttachmentsButton: (showAttachmentsButton) => set({ showAttachmentsButton }),
      setAutoSuggestTitles: (autoSuggestTitles) => set({ autoSuggestTitles }),
      setNewTxInitialEntry: (newTxInitialEntry) => set({ newTxInitialEntry }),
      setDefaultAutoPayRecurring: (defaultAutoPayRecurring) =>
        set({ defaultAutoPayRecurring }),
      setManualPayDateMode: (manualPayDateMode) => set({ manualPayDateMode }),
      setConfirmAmountMode: (confirmAmountMode) => set({ confirmAmountMode }),

      setEnableAIReceiptScanning: (enableAIReceiptScanning) =>
        set({ enableAIReceiptScanning }),
      setSaveScannedReceiptsToDrive: (saveScannedReceiptsToDrive) =>
        set({ saveScannedReceiptsToDrive }),
      setIsBalanceVisible: (isBalanceVisible) => set({ isBalanceVisible }),

      setPayYourselfFirstEnabled: (payYourselfFirstEnabled) => set({ payYourselfFirstEnabled }),
      setPayYourselfFirstPct: (payYourselfFirstPct) =>
        set({ payYourselfFirstPct: Math.min(50, Math.max(1, Math.round(payYourselfFirstPct))) }),
      setPayYourselfFirstGoalId: (payYourselfFirstGoalId) => set({ payYourselfFirstGoalId }),
      setNoSpendTargetDays: (noSpendTargetDays) =>
        set({ noSpendTargetDays: Math.min(25, Math.max(1, Math.round(noSpendTargetDays))) }),
      setMutedAlertTypes: (mutedAlertTypes) => set({ mutedAlertTypes }),
      toggleMutedAlertType: (key) =>
        set((state) => {
          const exists = state.mutedAlertTypes.includes(key);
          return {
            mutedAlertTypes: exists
              ? state.mutedAlertTypes.filter((k) => k !== key)
              : [...state.mutedAlertTypes, key],
          };
        }),

      resetUserPreferencesForSwitch: (userId) =>
        set({
          ...USER_DEFAULT_PREFS,
          activeUserId: userId,
        }),
    }),
    {
      name: 'lumio-mobile-settings-v1',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
