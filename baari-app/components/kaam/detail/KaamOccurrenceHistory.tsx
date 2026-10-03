import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Avatar } from '../../ui/Avatar';
import { History, Calendar, CheckCircle2, XCircle, Clock, Check } from 'lucide-react-native';

export interface TaskOccurrenceHistory {
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

interface KaamOccurrenceHistoryProps {
  loading: boolean;
  occurrences: TaskOccurrenceHistory[];
  todayStr: string;
  nextCursor?: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  formatDate: (dateStr: string) => string;
  formatTime: (isoString?: string | null) => string;
}

export const KaamOccurrenceHistory: React.FC<KaamOccurrenceHistoryProps> = React.memo(({
  loading,
  occurrences,
  todayStr,
  nextCursor,
  loadingMore,
  onLoadMore,
  formatDate,
  formatTime,
}) => {
  return (
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
            const occDateStr = String(occ.occurrenceDate).substring(0, 10);
            const isFuture = occDateStr > todayStr;

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
                      {isDone ? 'Completed' : isMissed ? 'Missed' : isFuture ? 'Scheduled' : 'Pending'}
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
              onPress={onLoadMore}
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
  );
});

const styles = StyleSheet.create({
  historySection: {
    marginTop: Spacing.sm,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    color: Colors.navy,
  },
  historyLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  emptyHistoryText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
  },
  occurrencesList: {
    gap: Spacing.sm,
  },
  occurrenceCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  occurrenceCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  occurrenceCardMissed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  occHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  occDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occDateText: {
    ...Typography.BodySmallMedium,
    color: Colors.deepNavy,
  },
  occStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  occStatusDone: {
    backgroundColor: '#DCFCE7',
  },
  occStatusMissed: {
    backgroundColor: '#FEE2E2',
  },
  occStatusPending: {
    backgroundColor: Colors.white,
  },
  occStatusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  assigneesList: {
    gap: Spacing.xs,
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
    ...Typography.BodySmallMedium,
    color: Colors.deepNavy,
  },
  assigneeStatus: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  completedCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  loadMoreText: {
    ...Typography.BodySmallMedium,
    color: Colors.navy,
  },
});
