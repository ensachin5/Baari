"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { FlatMember } from "@/components/kaam/CreateKaamModal";

// Global in-memory cache for instant 0ms access
let globalCachedMembers: FlatMember[] = [];
let globalCachedMembersFlatId: string | null = null;
let globalMembersFetchedAt = 0;

export function useMembers() {
  const activeFlat = useSession((state) => state.activeFlat);
  const hasCache =
    globalCachedMembersFlatId === activeFlat?.id &&
    globalCachedMembers.length > 0;

  const [members, setMembers] = useState<FlatMember[]>(hasCache ? globalCachedMembers : []);
  const [loading, setLoading] = useState(!hasCache);

  const fetchMembers = useCallback(async (isSilent = false) => {
    if (!activeFlat?.id) {
      setLoading(false);
      return;
    }
    if (!isSilent && globalCachedMembers.length === 0) {
      setLoading(true);
    }
    try {
      const res = await api.get<{ members: any[] }>(
        `/api/flats/${activeFlat.id}/members`
      );
      if (res?.members) {
        const mapped = res.members.map((m) => ({
          userId: m.userId,
          name: m.name || "Member",
          image: m.image,
          role: m.role || "member",
        }));
        globalCachedMembers = mapped;
        globalCachedMembersFlatId = activeFlat.id;
        globalMembersFetchedAt = Date.now();
        setMembers(mapped);
      }
    } catch (err) {
      console.warn("Failed to fetch flat members:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFlat?.id]);

  useEffect(() => {
    if (!activeFlat?.id) return;
    const isStale = Date.now() - globalMembersFetchedAt > 30000;
    const isDifferentFlat = globalCachedMembersFlatId !== activeFlat.id;

    if (isDifferentFlat || !hasCache) {
      fetchMembers(false);
    } else if (isStale) {
      fetchMembers(true);
    }
  }, [fetchMembers, activeFlat?.id, hasCache]);

  return {
    members,
    loading,
    refetch: () => fetchMembers(true),
  };
}
