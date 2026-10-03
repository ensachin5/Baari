import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Modal } from '../ui/Modal';
import { Colors, Spacing } from '../../lib/theme';
import { api } from '../../lib/api';
import { KaamTask } from './KaamCard';
import { KaamDetailHeader } from './detail/KaamDetailHeader';
import { KaamOccurrenceHistory, TaskOccurrenceHistory } from './detail/KaamOccurrenceHistory';

interface TaskHistoryResponse {
  task: KaamTask & {
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }>;
    creatorName?: string;
  };
  occurrences: TaskOccurrenceHistory[];
  nextCursor?: string | null;
}

interface KaamDetailModalProps {
  visible: boolean;
  taskId: string | null;
  initialTask?: KaamTask | null;
  onClose: () => void;
  onComplete?: (occurrenceId: string) => void;
}

export const KaamDetailModal: React.FC<KaamDetailModalProps> = ({
  visible,
  taskId,
  initialTask,
  onClose,
}) => {
  const getTodayString = useCallback(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayStr = getTodayString();
  const [taskData, setTaskData] = useState<TaskHistoryResponse['task'] | null>(
    (initialTask as any) || null
  );
  const [occurrences, setOccurrences] = useState<TaskOccurrenceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const activeTaskId = taskId || initialTask?.id;

  const fetchHistory = useCallback(async () => {
    if (!activeTaskId) return;
    try {
      setLoading(true);
      const res = await api.get<TaskHistoryResponse>(
        `/api/tasks/${activeTaskId}/history?limit=20`
      );
      if (res?.task) {
        setTaskData(res.task);
      }
      setOccurrences(res?.occurrences || []);
      setNextCursor(res?.nextCursor || null);
    } catch (error) {
      console.error('[KaamDetailModal] Error fetching task history:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTaskId]);

  useEffect(() => {
    if (visible && activeTaskId) {
      if (initialTask) {
        setTaskData(initialTask as any);
      }
      fetchHistory();
    } else {
      setOccurrences([]);
      setNextCursor(null);
    }
  }, [visible, activeTaskId, initialTask, fetchHistory]);

  const loadMoreHistory = useCallback(async () => {
    if (!activeTaskId || !nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await api.get<TaskHistoryResponse>(
        `/api/tasks/${activeTaskId}/history?limit=20&cursor=${nextCursor}`
      );
      setOccurrences((prev) => [...prev, ...(res?.occurrences || [])]);
      setNextCursor(res?.nextCursor || null);
    } catch (error) {
      console.error('[KaamDetailModal] Error loading more task history:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTaskId, nextCursor, loadingMore]);

  const formatDate = useCallback((dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

      if (date.getTime() === todayUTC.getTime()) return 'Today';
      if (date.getTime() === yesterdayUTC.getTime()) return 'Yesterday';

      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  const formatTime = useCallback((isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, []);

  const currentTask = taskData || initialTask;

  if (!currentTask && loading) {
    return (
      <Modal visible={visible} onClose={onClose} title="Kaam Details">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.navy} />
        </View>
      </Modal>
    );
  }

  if (!currentTask) return null;

  return (
    <Modal visible={visible} onClose={onClose} title="Kaam Details">
      <View style={styles.scrollContent}>
        {/* Header & Rotation Details */}
        <KaamDetailHeader currentTask={currentTask} />

        {/* Occurrence History List */}
        <KaamOccurrenceHistory
          loading={loading}
          occurrences={occurrences}
          todayStr={todayStr}
          nextCursor={nextCursor}
          loadingMore={loadingMore}
          onLoadMore={loadMoreHistory}
          formatDate={formatDate}
          formatTime={formatTime}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
});
