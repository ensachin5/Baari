import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Info } from 'lucide-react-native';

interface ConfirmationSummaryProps {
  title: string;
  category: string;
  assignmentMode: string;
  assigneesCount: number;
  recurrence: string;
  dueDateLabel: string;
}

export const ConfirmationSummary: React.FC<ConfirmationSummaryProps> = React.memo(({
  title,
  category,
  assignmentMode,
  assigneesCount,
  recurrence,
  dueDateLabel,
}) => {
  if (!title.trim()) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Info size={14} color={Colors.navy} />
        <Text style={styles.title}>KAAM SUMMARY</Text>
      </View>

      <Text style={styles.summaryText}>
        <Text style={styles.boldText}>{title}</Text> ({category}) •{' '}
        {assignmentMode === 'auto_rotate' ? 'Auto-rotate across all' : `Custom rotation (${assigneesCount} member${assigneesCount > 1 ? 's' : ''})`}{' '}
        • Recurrence: <Text style={styles.boldText}>{recurrence}</Text> • First due:{' '}
        <Text style={styles.boldText}>{dueDateLabel}</Text>
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  title: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
    fontSize: 10,
  },
  summaryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.mutedNavy,
    lineHeight: 16,
  },
  boldText: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
  },
});
