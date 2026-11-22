import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiPost } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings-store';

export interface AppNotification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'REMINDER';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

function resolveAlertCategory(n: AppNotification): string | null {
  const direct = n.data?.alertCategory;
  if (typeof direct === 'string' && direct) return direct;
  const key = String(n.data?.dedupeKey || '');
  if (key.startsWith('recurring_') || key.startsWith('upcoming_')) return 'subscriptions';
  if (key.startsWith('budget_')) return 'budgets';
  if (key.startsWith('month_end_shortfall_')) return 'shortfall';
  if (key.startsWith('loan_') || key.startsWith('card_')) return 'payments';
  if (key.startsWith('unusual_expense_')) return 'unusual_expense';
  return null;
}

// Module-level singleton Realtime subscription with reference counting
// Prevents Supabase v2 error: "cannot add postgres_changes callbacks after subscribe()"
let activeSubscribers = 0;
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let lastSmartSyncAt = 0;
const SMART_SYNC_COOLDOWN_MS = 120_000;

async function fetchNotificationsFromDb(): Promise<AppNotification[]> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) return [];

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40);

  return Array.isArray(data) ? (data as AppNotification[]) : [];
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const mutedAlertTypes = useSettingsStore((s) => s.mutedAlertTypes);

  const query = useQuery<AppNotification[]>({
    queryKey: ['mobile-notifications'],
    queryFn: fetchNotificationsFromDb,
    staleTime: 30_000,
  });

  const allNotifications = query.data || [];
  const notifications = useMemo(
    () =>
      allNotifications.filter((n) => {
        const cat = resolveAlertCategory(n);
        return !cat || !mutedAlertTypes.includes(cat);
      }),
    [allNotifications, mutedAlertTypes]
  );
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const syncSmartNotifications = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastSmartSyncAt < SMART_SYNC_COOLDOWN_MS) return;
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) return;

      lastSmartSyncAt = now;
      try {
        setIsSyncing(true);
        const currentMuted = useSettingsStore.getState().mutedAlertTypes;
        await apiPost('/api/notifications/sync', { mutedTypes: currentMuted });
        await queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
      } catch {
        // silent fallback
      } finally {
        setIsSyncing(false);
      }
    },
    [queryClient]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      queryClient.setQueryData<AppNotification[]>(['mobile-notifications'], (prev = []) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    [queryClient]
  );

  const markAllRead = useCallback(async () => {
    queryClient.setQueryData<AppNotification[]>(['mobile-notifications'], (prev = []) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session?.user?.id) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', sess.session.user.id)
        .eq('is_read', false);
    }
  }, [queryClient]);

  const deleteNotification = useCallback(
    async (id: string) => {
      queryClient.setQueryData<AppNotification[]>(['mobile-notifications'], (prev = []) =>
        prev.filter((n) => n.id !== id)
      );
      await supabase.from('notifications').delete().eq('id', id);
    },
    [queryClient]
  );

  useEffect(() => {
    void syncSmartNotifications(false);

    activeSubscribers += 1;
    if (!sharedChannel) {
      const uniqueName = `lumio-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        sharedChannel = supabase
          .channel(uniqueName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload: any) => {
              const incoming = payload.new as AppNotification;
              if (!incoming?.id) return;
              queryClient.setQueryData<AppNotification[]>(
                ['mobile-notifications'],
                (prev = []) => {
                  if (prev.some((n) => n.id === incoming.id)) return prev;
                  return [incoming, ...prev];
                }
              );
            }
          )
          .subscribe();
      } catch {
        sharedChannel = null;
      }
    }

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      if (activeSubscribers === 0 && sharedChannel) {
        const ch = sharedChannel;
        sharedChannel = null;
        void supabase.removeChannel(ch);
      }
    };
  }, [queryClient, syncSmartNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isSyncing,
    refetch: query.refetch,
    syncSmartNotifications: () => syncSmartNotifications(true),
    markAsRead,
    markAllRead,
    deleteNotification,
  };
}
