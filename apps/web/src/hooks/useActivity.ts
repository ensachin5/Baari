"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { getSocket } from "@/lib/socket";
import { ActivityEntry } from "@/components/activity/ActivityItem";

// Global in-memory cache for instant 0ms tab switching
let globalCachedActivities: ActivityEntry[] = [];
let globalCachedActivityFlatId: string | null = null;
let globalActivityFetchedAt = 0;

/**
 * Mirrors baari-app/hooks/useActivity.ts with instant SWR caching.
 */
export const useActivity = () => {
  const token = useSession((state) => state.token);
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);

  const hasCache =
    globalCachedActivityFlatId === activeFlat?.id &&
    globalCachedActivities.length > 0;

  const [activities, setActivities] = useState<ActivityEntry[]>(hasCache ? globalCachedActivities : []);
  const [loading, setLoading] = useState(!hasCache);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchActivities = useCallback(
    async (isRefresh = false, isSilent = false) => {
      if (!activeFlat?.id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!isSilent && isRefresh && globalCachedActivities.length === 0) {
        setLoading(true);
      }
      try {
        const data = await api.get<{
          items: ActivityEntry[];
          nextCursor: string | null;
          hasMore: boolean;
        }>("/api/activity", {
          flatId: activeFlat.id,
          cursor: isRefresh ? undefined : cursor || undefined,
          limit: 20,
        });

        const newItems = data.items || [];
        if (isRefresh) {
          globalCachedActivities = newItems;
          globalCachedActivityFlatId = activeFlat.id;
          globalActivityFetchedAt = Date.now();
          setActivities(newItems);
        } else {
          setActivities((prev) => {
            const updated = [...prev, ...newItems];
            globalCachedActivities = updated;
            return updated;
          });
        }
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (error: any) {
        if (error?.status === 401) return;
        console.error("Error fetching activity log:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFlat?.id, cursor]
  );

  useEffect(() => {
    if (!activeFlat?.id) return;

    const isStale = Date.now() - globalActivityFetchedAt > 15000;
    const isDifferentFlat = globalCachedActivityFlatId !== activeFlat.id;

    if (isDifferentFlat || !hasCache) {
      fetchActivities(true, false);
    } else if (isStale) {
      // Background revalidation without spinner
      fetchActivities(true, true);
    }
  }, [activeFlat?.id, fetchActivities, hasCache]);

  // Live Socket.io updates for new activities
  useEffect(() => {
    const socket = getSocket();

    const handleActivityEvent = (data: { entry: ActivityEntry }) => {
      if (data?.entry) {
        setActivities((prev) => [data.entry, ...prev]);
      }
    };

    socket.on("activity_event", handleActivityEvent);

    return () => {
      socket.off("activity_event", handleActivityEvent);
    };
  }, []);

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
