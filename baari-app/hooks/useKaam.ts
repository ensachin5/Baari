import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useSession } from '../store/session';
import { getSocket } from '../lib/socket';
import { KaamTask } from '../components/kaam/KaamCard';

export const useKaam = () => {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);
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
    if (!currentUser?.id) return;

    // Save previous snapshot for rollback
    const previousTasks = [...tasks];

    // Optimistically update local task state immediately
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.currentOccurrence?.id === occurrenceId) {
          const updatedMembers = t.currentOccurrence.members.map((m) =>
            m.userId === currentUser.id ? { ...m, status: 'completed' as const } : m
          );
          const allDone = updatedMembers.every((m) => m.status === 'completed');
          return {
            ...t,
            currentOccurrence: {
              ...t.currentOccurrence,
              status: allDone ? 'done' : 'in_progress',
              members: updatedMembers,
            },
          };
        }
        return t;
      })
    );

    try {
      setCompletingId(occurrenceId);
      await api.patch(`/api/tasks/occurrences/${occurrenceId}/complete`);
      // Sync with server state
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task, reverting state:', error);
      // Revert optimistic update on failure
      setTasks(previousTasks);
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
