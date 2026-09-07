import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AssigneeStack, AssigneeInfo } from './AssigneeStack';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { CheckCircle2, Clock, Users, Repeat, SkipForward, Trash2, Bell, Check } from 'lucide-react-native';
import { useSession } from '../../store/session';
import { api } from '../../lib/api';

export interface KaamTask {
  id: string;
  flatId: string;
  title: string;
  category: 'water' | 'garbage' | 'chore' | 'custom';
  description?: string | null;
  peopleRequired: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'custom';
  assignmentMode?: 'auto_rotate' | 'all' | 'custom_rotation';
  customRotationPool?: string[] | null;
  customRotationGroupSize?: number | null;
  customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
  createdBy: string;
  creatorName?: string;
  nextAssignee?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
  currentOccurrence?: {
    id: string;
    occurrenceDate: string;
    status: 'pending' | 'in_progress' | 'done' | 'missed';
    members: {
      id: string;
      userId: string;
      status: 'assigned' | 'completed';
      completedAt?: string | null;
      userName: string;
      userImage?: string | null;
    }[];
  } | null;
}

interface KaamCardProps {
  task: KaamTask;
  onComplete: (occurrenceId: string) => void;
  onPress?: (task: KaamTask) => void;
  onSkipTurn?: (occurrenceId: string, taskTitle: string) => void;
  onDelete?: (taskId: string) => void;
  loading?: boolean;
}

export const KaamCard: React.FC<KaamCardProps> = ({
  task,
  onComplete,
  onPress,
  onSkipTurn,
  onDelete,
  loading = false,
}) => {
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const currentOcc = task.currentOccurrence;

  const [reminding, setReminding] = useState(false);
  const [remindFeedback, setRemindFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isCreator = task.createdBy === currentUser?.id;
  const isAdmin = activeFlat?.role === 'admin';
  const canDelete = isCreator || isAdmin;

  const members = currentOcc?.members || [];
  const myAssignment = members.find((m) => m.userId === currentUser?.id);
  const isMyPartDone = myAssignment?.status === 'completed';
  const isFullyDone = currentOcc?.status === 'done';

  const pendingMembers = members.filter((m) => m.status === 'assigned');
  const isCurrentUserPending = pendingMembers.some((m) => m.userId === currentUser?.id);
  const canRemind =
    !isFullyDone &&
    Boolean(currentOcc && (currentOcc.status === 'pending' || currentOcc.status === 'in_progress')) &&
    !isCurrentUserPending &&
    pendingMembers.length > 0;

  const completedCount = members.filter((m) => m.status === 'completed').length;
  const totalRequired = members.length || task.peopleRequired;

  const assignees: AssigneeInfo[] = members.map((m) => ({
    userId: m.userId,
    userName: m.userName,
    userImage: m.userImage,
    status: m.status,
  }));

  const handleRemindPress = async () => {
    if (reminding || !currentOcc) return;

    try {
      setReminding(true);
      setRemindFeedback(null);
      const res = await api.post<{
        message: string;
        remindedCount: number;
        remindedUsers: Array<{ id: string; name: string }>;
      }>(`/api/tasks/occurrences/${currentOcc.id}/remind`);

      const names = res.remindedUsers?.map((u) => u.name.split(' ')[0]).join(', ') || 'flatmate';
      const successMsg = `Reminder sent to ${names}`;
      setRemindFeedback({ type: 'success', message: successMsg });
      setTimeout(() => setRemindFeedback(null), 3500);
    } catch (err: any) {
      const isRateLimited =
        err?.status === 429 ||
        err?.message?.toLowerCase().includes('recently') ||
        err?.message?.toLowerCase().includes('wait');
      const errorMsg = isRateLimited ? 'Already reminded recently' : err?.message || 'Failed to send reminder';
      setRemindFeedback({ type: 'error', message: errorMsg });
      setTimeout(() => setRemindFeedback(null), 4000);
    } finally {
      setReminding(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Kaam',
      `Delete "${task.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(task.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => {
        console.log('[KaamCard] Tapped card:', task.id, task.title);
        onPress?.(task);
      }}
      style={styles.touchableCard}
    >
      <Card style={styles.cardContainer} variant={isFullyDone ? 'muted' : 'outlined'}>
      {/* Top row: Category & Recurrence & Next in Rotation & Status + Delete */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <Badge label={task.category} category={task.category} />
          {task.recurrence !== 'once' && (
            <View style={styles.recurrenceBadge}>
              <Repeat size={10} color={Colors.mutedNavy} />
              <Text style={styles.recurrenceText}>{task.recurrence}</Text>
            </View>
          )}
          {task.recurrence !== 'once' && task.nextAssignee && (
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>
                Next: {task.nextAssignee.name.split(' ')[0]}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerRightGroup}>
          {canRemind && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRemindPress}
              disabled={reminding}
              style={[
                styles.remindButton,
                remindFeedback?.type === 'success' && styles.remindButtonSuccess,
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {reminding ? (
                <ActivityIndicator size={10} color={Colors.deepNavy} />
              ) : remindFeedback?.type === 'success' ? (
                <Check size={10} color={Colors.deepNavy} strokeWidth={2.5} />
              ) : (
                <Bell size={10} color={Colors.deepNavy} strokeWidth={2.2} />
              )}
              <Text style={styles.remindButtonText}>
                {reminding ? '...' : remindFeedback?.type === 'success' ? 'Sent' : 'Remind'}
              </Text>
            </TouchableOpacity>
          )}

          {isFullyDone ? (
            <Badge label="Done" status="done" />
          ) : (
            <Badge
              label={currentOcc?.status === 'in_progress' ? 'In Progress' : 'Pending'}
              status={currentOcc?.status === 'in_progress' ? 'in_progress' : 'pending'}
            />
          )}
          {canDelete && onDelete && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeletePress}
              style={styles.deleteBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={13} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Inline Reminder Feedback Message */}
      {remindFeedback && (
        <View
          style={[
            styles.remindFeedbackPill,
            remindFeedback.type === 'error' ? styles.remindFeedbackError : styles.remindFeedbackSuccess,
          ]}
        >
          <Bell size={10} color={remindFeedback.type === 'error' ? Colors.mutedNavy : Colors.deepNavy} />
          <Text
            style={[
              styles.remindFeedbackText,
              remindFeedback.type === 'error' ? styles.remindFeedbackTextError : styles.remindFeedbackTextSuccess,
            ]}
          >
            {remindFeedback.message}
          </Text>
        </View>
      )}

      {/* Task Title & Description */}
      <Text
        style={[
          Typography.H2,
          styles.title,
          isFullyDone && { color: Colors.grayBlack, textDecorationLine: 'line-through' },
        ]}
      >
        {task.title}
      </Text>

      {task.description ? (
        <Text style={[Typography.BodySmall, styles.description]} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer Info: Assignees & Action */}
      <View style={styles.footerRow}>
        <View style={styles.assigneeContainer}>
          <AssigneeStack assignees={assignees} />
          {totalRequired > 1 && (
            <View style={styles.progressTextContainer}>
              <Users size={12} color={Colors.mutedNavy} />
              <Text style={styles.progressText}>
                {completedCount}/{totalRequired} done
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {currentOcc && myAssignment && !isFullyDone && (
          <View style={styles.actionButtonsRow}>
            {onSkipTurn && !isMyPartDone && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onSkipTurn(currentOcc.id, task.title)}
                style={styles.skipButton}
              >
                <SkipForward size={12} color={Colors.mutedNavy} strokeWidth={2.2} />
                <Text style={styles.skipButtonText}>Skip turn</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isMyPartDone || loading}
              onPress={() => onComplete(currentOcc.id)}
              style={[
                styles.actionButton,
                isMyPartDone ? styles.actionButtonDone : styles.actionButtonPending,
              ]}
            >
              <CheckCircle2
                size={16}
                color={isMyPartDone ? Colors.deepNavy : Colors.white}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  isMyPartDone ? styles.actionButtonTextDone : styles.actionButtonTextPending,
                ]}
              >
                {isMyPartDone ? 'Your part done' : 'Mark Done'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  </TouchableOpacity>
);
};

const styles = StyleSheet.create({
  touchableCard: {
    marginBottom: Spacing.md,
  },
  cardContainer: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtn: {
    padding: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.offWhite,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recurrenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  recurrenceText: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.mutedNavy,
    textTransform: 'capitalize',
  },
  nextBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  nextBadgeText: {
    ...Typography.Caption,
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.grayBlack,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipButtonText: {
    ...Typography.Caption,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.mutedNavy,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  actionButtonPending: {
    backgroundColor: Colors.navy,
  },
  actionButtonDone: {
    backgroundColor: Colors.paleSky,
  },
  actionButtonText: {
    ...Typography.Caption,
    fontWeight: '600',
  },
  actionButtonTextPending: {
    color: Colors.white,
  },
  actionButtonTextDone: {
    color: Colors.deepNavy,
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.paleSky,
    borderWidth: 1,
    borderColor: Colors.sky,
    gap: 3,
  },
  remindButtonSuccess: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.deepSky,
  },
  remindButtonText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.deepNavy,
  },
  remindFeedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
    gap: 5,
    alignSelf: 'flex-start',
  },
  remindFeedbackSuccess: {
    backgroundColor: Colors.paleSky,
    borderColor: Colors.sky,
  },
  remindFeedbackError: {
    backgroundColor: Colors.offWhite,
    borderColor: Colors.border,
  },
  remindFeedbackText: {
    ...Typography.Caption,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  remindFeedbackTextSuccess: {
    color: Colors.deepNavy,
    fontFamily: 'Inter_600SemiBold',
  },
  remindFeedbackTextError: {
    color: Colors.mutedNavy,
    fontFamily: 'Inter_600SemiBold',
  },
});
