import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface QuickPickPreset {
  id: string;
  flatId: string;
  label: string;
  title: string;
  category: 'water' | 'garbage' | 'chore' | 'custom';
  sortOrder: number;
  createdAt: string;
}

export const FALLBACK_QUICK_PICKS: QuickPickPreset[] = [
  { id: 'water', flatId: '', label: 'Water', title: 'Water Tank Refill', category: 'water', sortOrder: 0, createdAt: '' },
  { id: 'trash', flatId: '', label: 'Trash', title: 'Trash', category: 'garbage', sortOrder: 1, createdAt: '' },
  { id: 'sweeping', flatId: '', label: 'Sweeping', title: 'Sweeping', category: 'chore', sortOrder: 2, createdAt: '' },
  { id: 'bathroom', flatId: '', label: 'Bathroom', title: 'Bathroom', category: 'chore', sortOrder: 3, createdAt: '' },
  { id: 'dishes', flatId: '', label: 'Dishes', title: 'Dishes', category: 'chore', sortOrder: 4, createdAt: '' },
  { id: 'laundry', flatId: '', label: 'Laundry', title: 'Laundry', category: 'chore', sortOrder: 5, createdAt: '' },
  { id: 'groceries', flatId: '', label: 'Groceries', title: 'Groceries', category: 'custom', sortOrder: 6, createdAt: '' },
];

export function useQuickPicks(flatId?: string | null) {
  const [presets, setPresets] = useState<QuickPickPreset[]>(FALLBACK_QUICK_PICKS);
  const [loading, setLoading] = useState(false);

  const fetchPresets = useCallback(async () => {
    if (!flatId) return;
    try {
      setLoading(true);
      const res = await api.get<{ presets: QuickPickPreset[] }>(`/api/quick-picks?flatId=${flatId}`);
      if (res.presets && res.presets.length > 0) {
        setPresets(res.presets);
      }
    } catch (err) {
      console.warn('Failed to fetch quick picks from server, using fallback', err);
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const addPreset = async (data: {
    label: string;
    title: string;
    category: 'water' | 'garbage' | 'chore' | 'custom';
  }) => {
    if (!flatId) return;
    const res = await api.post<{ preset: QuickPickPreset }>('/api/quick-picks', {
      ...data,
      flatId,
    });
    if (res.preset) {
      setPresets((prev) => [...prev, res.preset]);
    }
    return res.preset;
  };

  const updatePreset = async (
    id: string,
    data: {
      label?: string;
      title?: string;
      category?: 'water' | 'garbage' | 'chore' | 'custom';
      sortOrder?: number;
    }
  ) => {
    const res = await api.patch<{ preset: QuickPickPreset }>(`/api/quick-picks/${id}`, data);
    if (res.preset) {
      setPresets((prev) => prev.map((p) => (p.id === id ? res.preset : p)));
    }
    return res.preset;
  };

  const deletePreset = async (id: string) => {
    await api.delete(`/api/quick-picks/${id}`);
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    presets,
    loading,
    refetch: fetchPresets,
    addPreset,
    updatePreset,
    deletePreset,
  };
}
