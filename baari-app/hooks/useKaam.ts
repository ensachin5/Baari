import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useSession } from '../store/session';
import { getSocket } from '../lib/socket';
import { KaamTask } from '../components/kaam/KaamCard';

export const useKaam = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const [tasks, setTasks] = useState<KaamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!activeFlat?.id) return;
    try {
      const data = await api.get<{ tasks: KaamTask[] }>('/api/tasks', {
        flatId: activeFlat.id,
      });
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching Kaam tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFlat?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Socket.io Realtime Listener
  useEffect(() => {
    const socket = getSocket();

    const handleTaskCompleted = (data: {
      occurrenceId: string;
      userId: string;
      isFullyDone: boolean;
    }) => {
      // Optimistically update local task state
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          if (t.currentOccurrence?.id === data.occurrenceId) {
            const updatedMembers = t.currentOccurrence.members.map((m) =>
              m.userId === data.userId ? { ...m, status: 'completed' as const } : m
            );
            return {
              ...t,
              currentOccurrence: {
                ...t.currentOccurrence,
                status: data.isFullyDone ? 'done' : 'in_progress',
                members: updatedMembers,
              },
            };
          }
          return t;
        })
      );
    };

    socket.on('task_completed', handleTaskCompleted);

    return () => {
      socket.off('task_completed', handleTaskCompleted);
    };
  }, []);

  const completeTask = async (occurrenceId: string) => {
    try {
      setCompletingId(occurrenceId);
      await api.patch(`/api/tasks/occurrences/${occurrenceId}/complete`);
      // Refetch to sync state
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    } finally {
      setCompletingId(null);
    }
  };

  const createTask = async (payload: {
    title: string;
    category: 'water' | 'garbage' | 'chore' | 'custom';
    description?: string;
    peopleRequired: number;
    recurrence: 'once' | 'daily' | 'weekly';
    assigneeIds: string[];
  }) => {
    if (!activeFlat?.id) return;
    await api.post('/api/tasks', {
      ...payload,
      flatId: activeFlat.id,
    });
    await fetchTasks();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  return {
    tasks,
    loading,
    refreshing,
    completingId,
    completeTask,
    createTask,
    onRefresh,
  };
};
