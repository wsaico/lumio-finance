import { useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

export type StartupSyncPhase = 'idle' | 'syncing' | 'done';

const INITIAL_SYNC_KEYS = new Set([
  'user-profile',
  'accounts',
  'dashboard-analytics',
  'exchange-rates',
  'budgets',
]);

const completedSessions = new Set<string>();

export function useStartupSync(hasSession: boolean, userId?: string | null): StartupSyncPhase {
  const [phase, setPhase] = useState<StartupSyncPhase>('idle');
  const sawFetchRef = useRef(false);
  const startedAtRef = useRef(0);

  const fetchingInitial = useIsFetching({
    predicate: (query) => {
      const rootKey = Array.isArray(query.queryKey) ? String(query.queryKey[0]) : '';
      return INITIAL_SYNC_KEYS.has(rootKey);
    },
  });

  useEffect(() => {
    if (!hasSession) {
      completedSessions.clear();
      sawFetchRef.current = false;
      setPhase('idle');
      return;
    }

    const sessionKey = userId || 'authenticated';
    if (completedSessions.has(sessionKey)) {
      return;
    }

    startedAtRef.current = Date.now();
    sawFetchRef.current = fetchingInitial > 0;
    setPhase('syncing');

    const maxTimer = setTimeout(() => {
      completedSessions.add(sessionKey);
      setPhase('done');
    }, 8500);

    return () => {
      clearTimeout(maxTimer);
    };
  }, [hasSession, userId]);

  useEffect(() => {
    if (phase !== 'syncing') return;
    if (fetchingInitial > 0) {
      sawFetchRef.current = true;
      return;
    }

    const sessionKey = userId || 'authenticated';
    const elapsed = Date.now() - startedAtRef.current;
    const minVisibleMs = sawFetchRef.current ? 750 : 1200;
    const waitMs = Math.max(150, minVisibleMs - elapsed);

    const timer = setTimeout(() => {
      completedSessions.add(sessionKey);
      setPhase('done');
    }, waitMs);

    return () => clearTimeout(timer);
  }, [phase, fetchingInitial, userId]);

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => {
      setPhase('idle');
    }, 1150);
    return () => clearTimeout(timer);
  }, [phase]);

  return phase;
}
