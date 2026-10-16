import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useSession } from '../store/session';
import { getSocket } from '../lib/socket';
import { ActivityEntry } from '../components/activity/ActivityItem';

export const useActivity = () => {
  const token = useSession((state) => state.token);
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (!token || !currentUser || !activeFlat?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await api.get<{
        items: ActivityEntry[];
        nextCursor: string | null;
        hasMore: boolean;
      }>('/api/activity', {
        flatId: activeFlat.id,
        cursor: isRefresh ? undefined : cursor || undefined,
        limit: 20,
      });

      if (isRefresh) {
        setActivities(data.items || []);
      } else {
        setActivities((prev) => [...prev, ...(data.items || [])]);
      }
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error: any) {
      if (error?.status === 401) return;
      console.error('Error fetching activity log:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFlat?.id, token, currentUser, cursor]);

  useEffect(() => {
    if (!token || !currentUser || !activeFlat?.id) return;
    fetchActivities(true);
  }, [activeFlat?.id, token, currentUser]);

  // Live Socket.io updates for new activities
  useEffect(() => {
    if (!token || !currentUser || !activeFlat?.id) return;
    const socket = getSocket();

    const handleActivityEvent = (data: { entry: ActivityEntry }) => {
      if (data?.entry) {
        setActivities((prev) => [data.entry, ...prev]);
      }
    };

    socket.on('activity_event', handleActivityEvent);

    return () => {
      socket.off('activity_event', handleActivityEvent);
    };
  }, [token, currentUser, activeFlat?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchActivities(false);
    }
  };

  return {
    activities,
    loading,
    refreshing,
    hasMore,
    onRefresh,
    loadMore,
  };
};
