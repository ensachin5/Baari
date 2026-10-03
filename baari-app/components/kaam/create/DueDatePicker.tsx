import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Clock } from 'lucide-react-native';

interface DueDatePickerProps {
  dueOffsetDays: number;
  onSelectDueOffsetDays: (offset: number) => void;
  formatDateDisplay: (offsetDays: number) => { label: string; sub: string; isToday: boolean };
}

export const DueDatePicker: React.FC<DueDatePickerProps> = React.memo(({
  dueOffsetDays,
  onSelectDueOffsetDays,
  formatDateDisplay,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Clock size={14} color={Colors.navy} />
        <Text style={styles.sectionTitle}>FIRST OCCURRENCE DUE DATE</Text>
      </View>

      <View style={styles.dueDateGrid}>
        {[0, 1, 2, 3].map((offset) => {
          const info = formatDateDisplay(offset);
          const isSelected = dueOffsetDays === offset;
          const isDueToday = info.isToday;

          return (
            <TouchableOpacity
              key={offset}
              activeOpacity={0.8}
              onPress={() => onSelectDueOffsetDays(offset)}
              style={[
                styles.dueDateCard,
                isSelected && (isDueToday ? styles.dueDateCardTodaySelected : styles.dueDateCardFutureSelected),
              ]}
            >
              <View style={styles.dueDateHeaderRow}>
                <Text
                  style={[
                    styles.dueDateLabel,
                    isSelected && (isDueToday ? styles.dueDateLabelTodaySelected : styles.dueDateLabelFutureSelected),
                  ]}
                >
                  {info.label}
                </Text>
                {isDueToday && isSelected && (
                  <View style={styles.dueSoonBadge}>
                    <Text style={styles.dueSoonBadgeText}>Due soon</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.dueDateSub,
                  isSelected && (isDueToday ? styles.dueDateSubTodaySelected : styles.dueDateSubFutureSelected),
                ]}
              >
                {info.sub}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
  },
  dueDateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  dueDateCard: {
    width: '48.5%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dueDateCardTodaySelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  dueDateCardFutureSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.navy,
  },
  dueDateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dueDateLabel: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
  },
  dueDateLabelTodaySelected: {
    color: '#92400E',
  },
  dueDateLabelFutureSelected: {
    color: Colors.navy,
  },
  dueSoonBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
  dueSoonBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  dueDateSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  dueDateSubTodaySelected: {
    color: '#B45309',
  },
  dueDateSubFutureSelected: {
    color: Colors.navy,
  },
});
