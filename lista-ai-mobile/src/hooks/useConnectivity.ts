import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';
import { executeSync } from '../sync/executor';

export function useConnectivity(): { isOnline: boolean } {
  const { isOnline, setOnline, setLastSyncError } = useStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;

      if (online && !isOnline) {
        setOnline(true);
        try {
          await executeSync();
          setLastSyncError(null);
        } catch (err) {
          setLastSyncError(err instanceof Error ? err.message : String(err));
        }
        await queryClient.invalidateQueries();
      } else if (!online && isOnline) {
        setOnline(false);
      }
    });

    return unsubscribe;
  }, [isOnline]);

  return { isOnline };
}
