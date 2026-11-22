import { create } from 'zustand';
import { triggerHaptic } from '@/lib/haptics';

export type AppAlertVariant = 'premium' | 'error' | 'warning' | 'success' | 'info';

export interface ToastItem {
  id: string;
  variant: AppAlertVariant;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  badge?: string;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (item: Omit<ToastItem, 'id'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (item) => {
    const id = item.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts.filter((t) => t.id !== id).slice(-2), { ...item, id }],
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));

type ToastOptions = {
  id?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  badge?: string;
};

export const showAppToast = {
  premium: (options: Partial<ToastOptions> & { title?: string }) => {
    triggerHaptic('medium');
    return useToastStore.getState().push({
      id: options.id,
      variant: 'premium',
      title: options.title || 'Función disponible en Plan Premium',
      description:
        options.description ||
        'Desbloquea cuentas ilimitadas, presupuestos inteligentes, reportes y respaldos.',
      actionLabel: options.actionLabel || 'Ver planes',
      onAction: options.onAction,
      badge: options.badge || 'PRO',
      duration: options.duration ?? 5200,
    });
  },
  success: (options: ToastOptions) => {
    triggerHaptic('success');
    return useToastStore.getState().push({
      ...options,
      variant: 'success',
      duration: options.duration ?? 3600,
    });
  },
  error: (options: ToastOptions) => {
    triggerHaptic('error');
    return useToastStore.getState().push({
      ...options,
      variant: 'error',
      duration: options.duration ?? 4500,
    });
  },
  warning: (options: ToastOptions) => {
    triggerHaptic('warning');
    return useToastStore.getState().push({
      ...options,
      variant: 'warning',
      duration: options.duration ?? 4200,
    });
  },
  info: (options: ToastOptions) => {
    triggerHaptic('light');
    return useToastStore.getState().push({
      ...options,
      variant: 'info',
      duration: options.duration ?? 3800,
    });
  },
};
