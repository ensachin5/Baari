import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { CheckSquare, X } from 'lucide-react-native';

interface WeeklySummaryItem {
  userId: string;
  userName: string;
  userImage: string | null;
  totalCompleted: number;
  breakdown: { taskTitle: string; count: number }[];
}

interface WeeklySummaryCardProps {
  flatId?: string;
  dismissible?: boolean;
}

// Global in-memory cache for instant 0ms access
let globalWeeklySummary: WeeklySummaryItem[] = [];
let globalWeeklySummaryFlatId: string | null = null;
let globalWeeklySummaryFetchedAt = 0;

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  flatId,
  dismissible = false,
}) => {
  const hasCache =
    globalWeeklySummaryFlatId === flatId &&
    globalWeeklySummary.length > 0;

  const [summary, setSummary] = useState<WeeklySummaryItem[]>(hasCache ? globalWeeklySummary : []);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(!hasCache);

  useEffect(() => {
    if (!flatId) return;

    const isStale = Date.now() - globalWeeklySummaryFetchedAt > 30000;
    const isDifferentFlat = globalWeeklySummaryFlatId !== flatId;

    if (!isDifferentFlat && !isStale && hasCache) {
      return;
    }

    let mounted = true;
    api
      .get<{ weeklySummary: WeeklySummaryItem[] }>(`/api/tasks/weekly-summary?flatId=${flatId}`)
      .then((res) => {
        if (mounted) {
          const items = res.weeklySummary || [];
          globalWeeklySummary = items;
          globalWeeklySummaryFlatId = flatId;
          globalWeeklySummaryFetchedAt = Date.now();
          setSummary(items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [flatId, hasCache]);

  if (isDismissed || loading || summary.length === 0) {
    return null;
  }

  return (
    <Card variant="outlined" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <CheckSquare size={16} color={Colors.navy} />
          <Text style={[Typography.BodySmallMedium, styles.title]}>This Week's Kaam</Text>
        </View>
        {dismissible && (
          <TouchableOpacity onPress={() => setIsDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={Colors.grayBlack} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {summary.map((userSum) => {
          const breakdownText = userSum.breakdown
            .map((b) => `${b.taskTitle} ×${b.count}`)
            .join(', ');

          return (
            <View key={userSum.userId} style={styles.userRow}>
              <Text style={styles.userName}>{userSum.userName}:</Text>
              <Text style={styles.breakdownText}>{breakdownText}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  list: {
    gap: 4,
  },
  userRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  userName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.deepNavy,
    marginRight: 6,
  },
  breakdownText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.mutedNavy,
  },
});
