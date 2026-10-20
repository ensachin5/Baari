"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export interface QuickPickPreset {
  id: string;
  flatId: string;
  label: string;
  title: string;
  category: "water" | "garbage" | "chore" | "custom";
  icon?: string | null;
  sortOrder: number;
  createdAt: string;
}

export const FALLBACK_QUICK_PICKS: QuickPickPreset[] = [
  {
    id: "water",
    flatId: "",
    label: "Water",
    title: "Water Tank Refill",
    category: "water",
    icon: "Droplet",
    sortOrder: 0,
    createdAt: "",
  },
  {
    id: "trash",
    flatId: "",
    label: "Trash",
    title: "Trash",
    category: "garbage",
    icon: "Trash2",
    sortOrder: 1,
    createdAt: "",
  },
  {
    id: "sweeping",
    flatId: "",
    label: "Sweeping",
    title: "Sweeping",
    category: "chore",
    icon: "Wind",
    sortOrder: 2,
    createdAt: "",
  },
  {
    id: "bathroom",
    flatId: "",
    label: "Bathroom",
    title: "Bathroom",
    category: "chore",
    icon: "Bath",
    sortOrder: 3,
    createdAt: "",
  },
  {
    id: "dishes",
    flatId: "",
    label: "Dishes",
    title: "Dishes",
    category: "chore",
    icon: "UtensilsCrossed",
    sortOrder: 4,
    createdAt: "",
  },
  {
    id: "laundry",
    flatId: "",
    label: "Laundry",
    title: "Laundry",
    category: "chore",
    icon: "Shirt",
    sortOrder: 5,
    createdAt: "",
  },
  {
    id: "groceries",
    flatId: "",
    label: "Groceries",
    title: "Groceries",
    category: "custom",
    icon: "ShoppingCart",
    sortOrder: 6,
    createdAt: "",
  },
];

// Global in-memory cache for instant 0ms access
let globalCachedQuickPicks: QuickPickPreset[] = [];
let globalCachedQuickPicksFlatId: string | null = null;
let globalQuickPicksFetchedAt = 0;

export function useQuickPicks(flatId?: string | null) {
  const hasCache =
    globalCachedQuickPicksFlatId === flatId &&
    globalCachedQuickPicks.length > 0;

  const [presets, setPresets] = useState<QuickPickPreset[]>(
    hasCache ? globalCachedQuickPicks : FALLBACK_QUICK_PICKS
  );
  const [loading, setLoading] = useState(!hasCache);

  const fetchPresets = useCallback(async (isSilent = false) => {
    if (!flatId) {
      setLoading(false);
      return;
    }
    if (!isSilent && globalCachedQuickPicks.length === 0) {
      setLoading(true);
    }
    try {
      const res = await api.get<{ presets: QuickPickPreset[] }>(
        `/api/quick-picks?flatId=${flatId}`
      );
      if (res.presets && res.presets.length > 0) {
        globalCachedQuickPicks = res.presets;
        globalCachedQuickPicksFlatId = flatId;
        globalQuickPicksFetchedAt = Date.now();
        setPresets(res.presets);
      }
    } catch (err) {
      console.warn("Failed to fetch quick picks from server, using fallback", err);
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    if (!flatId) return;
    const isStale = Date.now() - globalQuickPicksFetchedAt > 60000;
    const isDifferentFlat = globalCachedQuickPicksFlatId !== flatId;

    if (isDifferentFlat || !hasCache) {
      fetchPresets(false);
    } else if (isStale) {
      fetchPresets(true);
    }
  }, [fetchPresets, flatId, hasCache]);

  return {
    presets,
    loading,
    refetch: () => fetchPresets(true),
  };
}
