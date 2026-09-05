import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import {
  Repeat,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  History,
  Check,
} from 'lucide-react-native';
import { KaamTask } from './KaamCard';

interface TaskOccurrenceHistory {
  id: string;
  occurrenceDate: string;
  status: 'pending' | 'done' | 'missed';
  createdAt: string;
  assignees: {
    id: string;
    userId: string;
    userName: string;
    userImage?: string | null;
    status: 'assigned' | 'completed';
    completedAt?: string | null;
  }[];
}

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
  onComplete,
}) => {
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
      console.log('[KaamDetailModal] Fetching history for task:', activeTaskId);
      setLoading(true);
      const res = await api.get<TaskHistoryResponse>(
        `/api/tasks/${activeTaskId}/history?limit=20`
      );
      console.log('[KaamDetailModal] History fetched successfully:', res?.occurrences?.length, 'occurrences');
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
    console.log('[KaamDetailModal] visible:', visible, 'activeTaskId:', activeTaskId);
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

  const loadMoreHistory = async () => {
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
  };

  const formatDate = (dateStr: string) => {
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
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

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
        {/* Header Badges */}
        <View style={styles.badgeRow}>
          <Badge label={currentTask.category} category={currentTask.category} />
          {currentTask.recurrence !== 'once' && (
            <View style={styles.recurrenceBadge}>
              <Repeat size={11} color={Colors.mutedNavy} />
              <Text style={styles.recurrenceText}>{currentTask.recurrence}</Text>
            </View>
          )}
          {currentTask.currentOccurrence && (
            <Badge
              label={
                currentTask.currentOccurrence.status === 'done'
                  ? 'Done'
                  : currentTask.currentOccurrence.status === 'in_progress'
                  ? 'In Progress'
                  : 'Pending'
              }
              status={
                currentTask.currentOccurrence.status === 'done'
                  ? 'done'
                  : currentTask.currentOccurrence.status === 'in_progress'
                  ? 'in_progress'
                  : 'pending'
              }
            />
          )}
        </View>

        {/* Task Title & Description */}
        <Text style={[Typography.H1, styles.title]}>{currentTask.title}</Text>
        {currentTask.description ? (
          <Text style={[Typography.Body, styles.description]}>
            {currentTask.description}
          </Text>
        ) : null}

        {/* Next in Rotation Box */}
        {currentTask.recurrence !== 'once' && currentTask.nextAssignee && (
          <View style={styles.nextAssigneeCard}>
            <View style={styles.nextAssigneeHeader}>
              <Users size={14} color={Colors.deepNavy} />
              <Text style={styles.nextAssigneeLabel}>Next Turn in Rotation</Text>
            </View>
            <View style={styles.nextAssigneeRow}>
              <Avatar
                name={currentTask.nextAssignee.name}
                image={currentTask.nextAssignee.image}
                size="sm"
              />
              <Text style={styles.nextAssigneeName}>{currentTask.nextAssignee.name}</Text>
            </View>
          </View>
        )}

        {/* Custom Rotation Order Sequence (if custom_rotation) */}
        {currentTask.assignmentMode === 'custom_rotation' &&
          currentTask.customRotationGroups &&
          currentTask.customRotationGroups.length > 0 && (
            <View style={styles.rotationSeqCard}>
              <View style={styles.rotationSeqHeader}>
                <Repeat size={14} color={Colors.navy} />
                <Text style={styles.rotationSeqTitle}>Custom Rotation Turn Order</Text>
              </View>
              <Text style={styles.rotationSeqSubtext}>
                Groups rotate in the sequence shown below:
              </Text>
              <View style={styles.rotationGroupsList}>
                {currentTask.customRotationGroups.map((group, idx) => (
                  <View key={idx} style={styles.rotationGroupItem}>
                    <View style={styles.rotationGroupBadge}>
                      <Text style={styles.rotationGroupBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.rotationGroupContent}>
                      <Text style={styles.rotationGroupOrderText}>
                        Turn {group.groupOrder || idx + 1}
                      </Text>
                      <Text style={styles.rotationGroupUsersText}>
                        {group.userIds.length} {group.userIds.length === 1 ? 'person' : 'people'} assigned
                      </Text>
                    </View>
                    {idx < (currentTask.customRotationGroups?.length || 0) - 1 && (
                      <ArrowRight size={14} color={Colors.mutedNavy} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Occurrence History Section */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <History size={16} color={Colors.navy} strokeWidth={2.2} />
            <Text style={[Typography.H2, styles.historyTitle]}>
              Occurrence History
            </Text>
          </View>

          {loading && occurrences.length === 0 ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator size="small" color={Colors.navy} />
            </View>
          ) : occurrences.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Calendar size={28} color={Colors.sky} />
              <Text style={styles.emptyHistoryText}>No past occurrences recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.occurrencesList}>
              {occurrences.map((occ) => {
                const isDone = occ.status === 'done';
                const isMissed = occ.status === 'missed';

                return (
                  <View
                    key={occ.id}
                    style={[
                      styles.occurrenceCard,
                      isDone && styles.occurrenceCardDone,
                      isMissed && styles.occurrenceCardMissed,
                    ]}
                  >
                    {/* Occ Date & Status */}
                    <View style={styles.occHeaderRow}>
                      <View style={styles.occDateGroup}>
                        <Calendar size={13} color={Colors.mutedNavy} />
                        <Text style={styles.occDateText}>{formatDate(occ.occurrenceDate)}</Text>
                      </View>
                      <View
                        style={[
                          styles.occStatusPill,
                          isDone
                            ? styles.occStatusDone
                            : isMissed
                            ? styles.occStatusMissed
                            : styles.occStatusPending,
                        ]}
                      >
                        {isDone ? (
                          <CheckCircle2 size={11} color="#15803D" strokeWidth={2.5} />
                        ) : isMissed ? (
                          <XCircle size={11} color="#DC2626" strokeWidth={2.5} />
                        ) : (
                          <Clock size={11} color={Colors.mutedNavy} strokeWidth={2.5} />
                        )}
                        <Text
                          style={[
                            styles.occStatusPillText,
                            isDone
                              ? { color: '#15803D' }
                              : isMissed
                              ? { color: '#DC2626' }
                              : { color: Colors.mutedNavy },
                          ]}
                        >
                          {isDone ? 'Completed' : isMissed ? 'Missed' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Assignees list */}
                    <View style={styles.assigneesList}>
                      {occ.assignees.map((assignee) => {
                        const isMemberCompleted = assignee.status === 'completed';
                        return (
                          <View key={assignee.id || assignee.userId} style={styles.assigneeRow}>
                            <Avatar
                              name={assignee.userName}
                              image={assignee.userImage}
                              size="xs"
                            />
                            <View style={styles.assigneeInfo}>
                              <Text style={styles.assigneeName}>{assignee.userName}</Text>
                              <Text style={styles.assigneeStatus}>
                                {isMemberCompleted
                                  ? `Completed${
                                      assignee.completedAt ? ` at ${formatTime(assignee.completedAt)}` : ''
                                    }`
                                  : isMissed
                                  ? 'Missed task'
                                  : 'Assigned'}
                              </Text>
                            </View>
                            {isMemberCompleted && (
                              <View style={styles.completedCheckCircle}>
                                <Check size={10} color={Colors.white} strokeWidth={3} />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Load More Button */}
              {nextCursor && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={loadingMore}
                  onPress={loadMoreHistory}
                  style={styles.loadMoreBtn}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={Colors.navy} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load older occurrences</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  recurrenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  recurrenceText: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
    textTransform: 'capitalize',
  },
  title: {
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.grayBlack,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  nextAssigneeCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  nextAssigneeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  nextAssigneeLabel: {
    ...Typography.Caption,
    color: '#15803D',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextAssigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nextAssigneeName: {
    ...Typography.BodyMedium,
    color: Colors.navy,
    fontWeight: '600',
  },

  rotationSeqCard: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  rotationSeqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rotationSeqTitle: {
    ...Typography.BodyMedium,
    fontWeight: '700',
    color: Colors.navy,
  },
  rotationSeqSubtext: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginBottom: Spacing.sm,
  },
  rotationGroupsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  rotationGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  rotationGroupBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotationGroupBadgeText: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.white,
    fontWeight: '700',
  },
  rotationGroupContent: {},
  rotationGroupOrderText: {
    ...Typography.Caption,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  rotationGroupUsersText: {
    ...Typography.Caption,
    fontSize: 9,
    color: Colors.grayBlack,
  },

  historySection: {
    marginTop: Spacing.sm,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    color: Colors.navy,
  },
  historyLoading: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyHistoryText: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
  },
  occurrencesList: {
    gap: Spacing.sm,
  },
  occurrenceCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  occurrenceCardDone: {
    borderColor: '#DCFCE7',
    backgroundColor: '#F0FDF4',
  },
  occurrenceCardMissed: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  occHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: Spacing.xs,
  },
  occDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  occDateText: {
    ...Typography.BodySmall,
    fontWeight: '700',
    color: Colors.navy,
  },
  occStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  occStatusDone: {
    backgroundColor: '#DCFCE7',
  },
  occStatusMissed: {
    backgroundColor: '#FEE2E2',
  },
  occStatusPending: {
    backgroundColor: Colors.offWhite,
  },
  occStatusPillText: {
    ...Typography.Caption,
    fontSize: 10,
    fontWeight: '700',
  },
  assigneesList: {
    marginTop: Spacing.xs,
    gap: 6,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  assigneeInfo: {
    flex: 1,
  },
  assigneeName: {
    ...Typography.Caption,
    fontWeight: '700',
    color: Colors.navy,
  },
  assigneeStatus: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
  },
  completedCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  loadMoreText: {
    ...Typography.Caption,
    color: Colors.navy,
    fontWeight: '600',
  },
});
