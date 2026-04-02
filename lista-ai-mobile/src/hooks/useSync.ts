import { useEffect } from 'react';
import { useStore } from '../store';
import { getPending } from '../sync/queue';

export function useSync() {
  const { pendingCount, lastSyncError, isOnline, setPendingCount } = useStore();

  useEffect(() => {
    const refresh = async () => {
      const pending = await getPending();
      // Filter out permanently failed entries (retryCount === -1)
      const active = pending.filter((e) => e.retryCount !== -1);
      setPendingCount(active.length);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, lastSyncError, isOnline };
}
