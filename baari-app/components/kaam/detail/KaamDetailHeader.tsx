import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import { Repeat, Users, ArrowRight } from 'lucide-react-native';
import { KaamTask } from '../KaamCard';

interface KaamDetailHeaderProps {
  currentTask: KaamTask & {
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
  };
}

export const KaamDetailHeader: React.FC<KaamDetailHeaderProps> = React.memo(({ currentTask }) => {
  return (
    <>
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
    </>
  );
});

const styles = StyleSheet.create({
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
    gap: 8,
  },
  rotationGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rotationGroupBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  rotationGroupBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.white,
  },
  rotationGroupContent: {
    flexDirection: 'column',
  },
  rotationGroupOrderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  rotationGroupUsersText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.mutedNavy,
  },
});
