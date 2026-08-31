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

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  flatId,
  dismissible = false,
}) => {
  const [summary, setSummary] = useState<WeeklySummaryItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flatId) return;

    let mounted = true;
    api
      .get<{ weeklySummary: WeeklySummaryItem[] }>(`/api/tasks/weekly-summary?flatId=${flatId}`)
      .then((res) => {
        if (mounted) {
          setSummary(res.weeklySummary || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [flatId]);

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
