import { useCallback, useRef, useState } from 'react';

/**
 * Tracks explicit pull-to-refresh gestures so Android's RefreshControl spinner
 * only appears on user-initiated refreshes, never on background React Query fetches.
 */
export function useManualRefresh(refetchFn: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);

  const onRefresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try {
      await refetchFn();
    } finally {
      busyRef.current = false;
      setRefreshing(false);
    }
  }, [refetchFn]);

  return { refreshing, onRefresh };
}
