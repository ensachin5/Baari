import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { Card } from '../ui/Card';
import { CheckCircle2, Flame, HandCoins } from 'lucide-react-native';

interface ProfileStatsSectionProps {
  stats: {
    kaamCompletedThisMonth: number;
    currentStreak: number;
    longestStreak: number;
    settlementsCountThisMonth: number;
    amountSettledThisMonth: number;
  };
}

export const ProfileStatsSection: React.FC<ProfileStatsSectionProps> = React.memo(({ stats }) => {
  return (
    <View style={styles.statsRow}>
      <Card variant="outlined" style={styles.statTile}>
        <View style={styles.statIconBg}>
          <CheckCircle2 size={16} color="#059669" strokeWidth={2.2} />
        </View>
        <Text style={styles.statValue}>{stats.kaamCompletedThisMonth}</Text>
        <Text style={styles.statLabel}>Kaam Done</Text>
        <Text style={styles.statSub}>this month</Text>
      </Card>

      <Card variant="outlined" style={styles.statTile}>
        <View style={[styles.statIconBg, { backgroundColor: '#FFFBEB' }]}>
          <Flame size={16} color="#D97706" fill="#FDE68A" strokeWidth={2} />
        </View>
        <Text style={styles.statValue}>{stats.currentStreak}d</Text>
        <Text style={styles.statLabel}>On-Time Streak</Text>
        <Text style={styles.statSub}>best: {stats.longestStreak}d</Text>
      </Card>

      <Card variant="outlined" style={styles.statTile}>
        <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
          <HandCoins size={16} color="#2563EB" strokeWidth={2.2} />
        </View>
        <Text style={styles.statValue}>₹{stats.amountSettledThisMonth.toFixed(0)}</Text>
        <Text style={styles.statLabel}>Settled</Text>
        <Text style={styles.statSub}>{stats.settlementsCountThisMonth} payments</Text>
      </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statTile: {
    flex: 1,
    padding: Spacing.sm,
    alignItems: 'flex-start',
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.black,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.navy,
    marginTop: 1,
  },
  statSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.grayBlack,
    marginTop: 1,
  },
});
