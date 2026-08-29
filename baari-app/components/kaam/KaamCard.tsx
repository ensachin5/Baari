import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AssigneeStack, AssigneeInfo } from './AssigneeStack';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { CheckCircle2, Clock, Users, Repeat } from 'lucide-react-native';
import { useSession } from '../../store/session';

export interface KaamTask {
  id: string;
  flatId: string;
  title: string;
  category: 'water' | 'garbage' | 'chore' | 'custom';
  description?: string | null;
  peopleRequired: number;
  recurrence: 'once' | 'daily' | 'weekly';
  createdBy: string;
  creatorName?: string;
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
  loading?: boolean;
}

export const KaamCard: React.FC<KaamCardProps> = ({
  task,
  onComplete,
  loading = false,
}) => {
  const currentUser = useSession((state) => state.user);
  const currentOcc = task.currentOccurrence;

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

  return (
    <Card style={styles.cardContainer} variant={isFullyDone ? 'muted' : 'outlined'}>
      {/* Top row: Category & Recurrence */}
      <View style={styles.headerRow}>
        <View style={styles.badgeGroup}>
          <Badge label={task.category} category={task.category} />
          {task.recurrence !== 'once' && (
            <View style={styles.recurrenceBadge}>
              <Repeat size={10} color={Colors.mutedNavy} />
              <Text style={styles.recurrenceText}>{task.recurrence}</Text>
            </View>
          )}
        </View>

        {isFullyDone ? (
          <Badge label="Done" status="done" />
        ) : (
          <Badge
            label={currentOcc?.status === 'in_progress' ? 'In Progress' : 'Pending'}
            status={currentOcc?.status === 'in_progress' ? 'in_progress' : 'pending'}
          />
        )}
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

      {/* Footer: Assignees & Action Button */}
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

        {/* Action Button */}
        {currentOcc && myAssignment && !isFullyDone && (
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
    color: Colors.mutedNavy,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  description: {
    marginBottom: Spacing.xs,
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
    color: Colors.mutedNavy,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  actionButtonPending: {
    backgroundColor: Colors.navy,
  },
  actionButtonDone: {
    backgroundColor: Colors.paleSky,
    borderWidth: 1,
    borderColor: Colors.navy,
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
