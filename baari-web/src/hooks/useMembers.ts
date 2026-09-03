"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { FlatMember } from "@/components/kaam/CreateKaamModal";

export function useMembers() {
  const activeFlat = useSession((state) => state.activeFlat);
  const [members, setMembers] = useState<FlatMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!activeFlat?.id) return;
    try {
      setLoading(true);
      const res = await api.get<{ members: any[] }>(
        `/api/flats/${activeFlat.id}/members`
      );
      if (res?.members) {
        setMembers(
          res.members.map((m) => ({
            userId: m.userId,
            name: m.name || "Member",
            image: m.image,
            role: m.role || "member",
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to fetch flat members:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFlat?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    refetch: fetchMembers,
  };
}
