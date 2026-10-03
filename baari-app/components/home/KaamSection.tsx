import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { AnnouncementBanner } from '../announcement/AnnouncementBanner';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Card } from '../ui/Card';
import { CardSkeleton } from '../ui/Skeleton';
import { KaamCard, KaamTask } from '../kaam/KaamCard';
import { ClipboardCheck, Plus } from 'lucide-react-native';

interface KaamSectionProps {
  flatId?: string | null;
  filter: 'today' | 'upcoming' | 'recurring';
  onFilterChange: (val: 'today' | 'upcoming' | 'recurring') => void;
  todayTasksCount: number;
  todayCompletedCount: number;
  kaamLoading: boolean;
  kaamRefreshing: boolean;
  onKaamRefresh: () => void;
  tasks: KaamTask[];
  filteredTasks: KaamTask[];
  completingId?: string | null;
  onSelectTask: (task: KaamTask) => void;
  onCompleteTask: (occId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSkipTurn: (occId: string, taskTitle: string) => void;
  onOpenCreateModal: () => void;
}

export const KaamSection: React.FC<KaamSectionProps> = React.memo(({
  flatId,
  filter,
  onFilterChange,
  todayTasksCount,
  todayCompletedCount,
  kaamLoading,
  kaamRefreshing,
  onKaamRefresh,
  tasks,
  filteredTasks,
  completingId,
  onSelectTask,
  onCompleteTask,
  onDeleteTask,
  onSkipTurn,
  onOpenCreateModal,
}) => {
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.kaamScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={kaamRefreshing}
            onRefresh={onKaamRefresh}
            tintColor={Colors.navy}
          />
        }
      >
        {/* Pinned Announcements Banner */}
        <AnnouncementBanner flatId={flatId} />

        {/* Filter Tabs */}
        <SegmentedControl
          options={[
            { label: 'Today', value: 'today' },
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Recurring', value: 'recurring' },
          ]}
          selected={filter}
          onSelect={(val) => onFilterChange(val as any)}
          style={styles.filterControl}
        />

        {/* Today's Summary Card */}
        {filter === 'today' && (
          <Card style={styles.summaryCard} variant="muted">
            <View style={styles.summaryRow}>
              <View>
                <Text style={Typography.H2}>Today's Kaam</Text>
                <Text style={[Typography.BodySmall, styles.summarySubtitle]}>
                  {todayCompletedCount} of {todayTasksCount} tasks completed
                </Text>
              </View>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {todayTasksCount > 0
                    ? `${Math.round((todayCompletedCount / todayTasksCount) * 100)}%`
                    : '100%'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Kaam Cards */}
        {kaamLoading && tasks.length === 0 ? (
          <CardSkeleton count={3} />
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <KaamCard
              key={task.id}
              task={task}
              onPress={onSelectTask}
              onComplete={onCompleteTask}
              onDelete={onDeleteTask}
              onSkipTurn={onSkipTurn}
              loading={completingId === task.currentOccurrence?.id}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <ClipboardCheck size={40} color={Colors.sky} strokeWidth={1.8} />
            <Text style={[Typography.H2, styles.emptyTitle]}>
              No Kaam due in this view!
            </Text>
            <Text style={[Typography.BodySmall, styles.emptyText]}>
              Tap the + button below to create a new shared household task.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for Create Task */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpenCreateModal}
        style={styles.fab}
      >
        <Plus size={24} color={Colors.white} />
        <Text style={styles.fabText}>Create Kaam</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  kaamScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 100,
  },
  filterControl: {
    marginVertical: Spacing.md,
  },
  summaryCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.paleSky,
    borderColor: 'transparent',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summarySubtitle: {
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  summaryBadge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  summaryBadgeText: {
    ...Typography.BodySmallMedium,
    color: Colors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    color: Colors.grayBlack,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.navy,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: {
    ...Typography.BodyMedium,
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
