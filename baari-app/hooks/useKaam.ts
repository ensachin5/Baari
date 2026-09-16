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
    if (!activeFlat?.id) {
      console.log('[useKaam] fetchTasks skipped: no activeFlat.id');
      return;
    }
    try {
      console.log('[useKaam] GET /api/tasks requesting for flatId:', activeFlat.id);
      const data = await api.get<{ tasks: KaamTask[] }>('/api/tasks', {
        flatId: activeFlat.id,
      });
      console.log('[useKaam] GET /api/tasks response: received', data.tasks?.length || 0, 'tasks');
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('[useKaam] Error fetching Kaam tasks:', error);
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

    const handleTaskDeleted = (data: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
    };

    socket.on('task_completed', handleTaskCompleted);
    socket.on('task_deleted', handleTaskDeleted);

    return () => {
      socket.off('task_completed', handleTaskCompleted);
      socket.off('task_deleted', handleTaskDeleted);
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
    recurrence: 'once' | 'daily' | 'weekly' | 'custom';
    customRecurrenceConfig?:
      | { type: 'specific_days'; days: string[] }
      | { type: 'interval'; everyNDays: number }
      | null;
    assignmentMode?: 'auto_rotate' | 'custom_rotation';
    customRotationPool?: string[] | null;
    customRotationGroupSize?: number;
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
    assigneeIds: string[];
    occurrenceDate?: string;
  }) => {
    if (!activeFlat?.id) {
      console.error('[Create Kaam] Error: Cannot create task because activeFlat.id is missing.');
      throw new Error('No active flat selected');
    }

    const requestPayload = {
      ...payload,
      flatId: activeFlat.id,
    };

    console.log('[Create Kaam] POST /api/tasks Request Payload:\n', JSON.stringify(requestPayload, null, 2));

    try {
      const res = await api.post('/api/tasks', requestPayload);
      console.log('[Create Kaam] POST /api/tasks Response Status: 201 Created');
      console.log('[Create Kaam] POST /api/tasks Response Body:\n', JSON.stringify(res, null, 2));

      console.log('[Create Kaam] Refetching tasks list to update local state...');
      await fetchTasks();
      console.log('[Create Kaam] Task list state updated successfully.');
      return res;
    } catch (error: any) {
      console.error('[Create Kaam] POST /api/tasks Failed with error:', error?.message || error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    const previousTasks = [...tasks];
    // Optimistically remove from state
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await api.delete(`/api/tasks/${taskId}`);
    } catch (error) {
      console.error('Error deleting task, reverting state:', error);
      setTasks(previousTasks);
      throw error;
    }
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
    deleteTask,
    onRefresh,
  };
};
