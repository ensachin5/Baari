import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AssigneeStack, AssigneeInfo } from './AssigneeStack';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { CheckCircle2, Clock, Users, Repeat, SkipForward, Trash2 } from 'lucide-react-native';
import { useSession } from '../../store/session';

export interface KaamTask {
  id: string;
  flatId: string;
  title: string;
  category: 'water' | 'garbage' | 'chore' | 'custom';
  description?: string | null;
  peopleRequired: number;
  recurrence: 'once' | 'daily' | 'weekly' | 'custom';
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
  onSkipTurn?: (occurrenceId: string, taskTitle: string) => void;
  onDelete?: (taskId: string) => void;
  loading?: boolean;
}

export const KaamCard: React.FC<KaamCardProps> = ({
  task,
  onComplete,
  onSkipTurn,
  onDelete,
  loading = false,
}) => {
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const currentOcc = task.currentOccurrence;

  const isCreator = task.createdBy === currentUser?.id;
  const isAdmin = activeFlat?.role === 'admin';
  const canDelete = isCreator || isAdmin;

  const members = currentOcc?.members || [];
  const myAssignment = members.find((m) => m.userId === currentUser?.id);
  const isMyPartDone = myAssignment?.status === 'completed';
  const isFullyDone = currentOcc?.status === 'done';

  const completedCount = members.filter((m) => m.status === 'completed').length;
  const totalRequired = members.length || task.peopleRequired;

  const assignees: AssigneeInfo[] = members.map((m) => ({
    userId: m.userId,
    userName: m.userName,
    userImage: m.userImage,
    status: m.status,
  }));

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
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: Spacing.md,
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
});
