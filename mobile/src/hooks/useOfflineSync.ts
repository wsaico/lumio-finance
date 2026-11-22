import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, apiPost } from '@/lib/api-client';
import { invalidateFinancialGraph } from '@/lib/query-keys';
import {
  getOfflineQueue,
  removeOfflineTransaction,
  subscribeOfflineQueue,
} from '@/lib/offline-queue';
import { showAppToast } from '@/stores/toast-store';

let isFlushingGlobal = false;

export function useOfflineSync(enabled = true) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(
    Platform.OS === 'web' && typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const flushingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const list = await getOfflineQueue();
    setPendingCount(list.length);
    return list;
  }, []);

  const flushQueue = useCallback(async (force = false) => {
    if ((!enabled && !force) || flushingRef.current || isFlushingGlobal) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      return;
    }

    const queue = await getOfflineQueue();
    setPendingCount(queue.length);
    if (queue.length === 0) return;

    flushingRef.current = true;
    isFlushingGlobal = true;
    setIsSyncing(true);
    let syncedCount = 0;

    try {
      for (const item of queue) {
        try {
          await apiPost('/api/transactions', item.payload);
          await removeOfflineTransaction(item.id);
          syncedCount += 1;
        } catch (err: any) {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            // Permanent validation/limit error: remove so queue doesn't stall forever
            await removeOfflineTransaction(item.id);
          } else {
            // Still offline / transient server failure: pause remaining queue
            break;
          }
        }
      }

      if (syncedCount > 0) {
        invalidateFinancialGraph(queryClient);
        showAppToast.success({
          title:
            syncedCount === 1
              ? 'Movimiento offline sincronizado'
              : `${syncedCount} movimientos offline sincronizados`,
        });
      }
    } finally {
      flushingRef.current = false;
      isFlushingGlobal = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [enabled, queryClient, refreshCount]);

  useEffect(() => {
    void refreshCount();
    const unsub = subscribeOfflineQueue(() => {
      void refreshCount();
    });
    return unsub;
  }, [refreshCount]);

  useEffect(() => {
    if (!enabled) return;
    void flushQueue();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onOnline = () => {
        setIsOffline(false);
        void flushQueue();
      };
      const onOffline = () => {
        setIsOffline(true);
      };
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void flushQueue();
      }
    });
    return () => {
      sub.remove();
    };
  }, [enabled, flushQueue]);

  return {
    isOffline,
    pendingCount,
    isSyncing,
    flushQueue,
  };
}
