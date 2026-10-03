import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { CheckCircle2, Repeat, Calendar, SlidersHorizontal, Plus, Minus } from 'lucide-react-native';

export type RecurrenceOption = 'once' | 'daily' | 'weekly' | 'custom';
export type CustomMode = 'specific_days' | 'interval';

interface RecurrencePickerProps {
  recurrence: RecurrenceOption;
  onSelectRecurrence: (recurrence: RecurrenceOption) => void;
  customMode: CustomMode;
  onSelectCustomMode: (mode: CustomMode) => void;
  selectedWeekdays: string[];
  onToggleWeekday: (dayKey: string) => void;
  everyNDays: number;
  onChangeEveryNDays: (n: number) => void;
  weekdays: Array<{ key: string; label: string }>;
}

export const RecurrencePicker: React.FC<RecurrencePickerProps> = React.memo(({
  recurrence,
  onSelectRecurrence,
  customMode,
  onSelectCustomMode,
  selectedWeekdays,
  onToggleWeekday,
  everyNDays,
  onChangeEveryNDays,
  weekdays,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>HOW OFTEN?</Text>
      <View style={styles.recurrenceGrid}>
        {/* Once */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectRecurrence('once')}
          style={[
            styles.recurrenceCard,
            recurrence === 'once' && styles.recurrenceCardActive,
          ]}
        >
          <CheckCircle2
            size={18}
            color={recurrence === 'once' ? Colors.navy : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.recurrenceTitle,
              recurrence === 'once' && styles.recurrenceTitleActive,
            ]}
          >
            Once
          </Text>
          <Text style={styles.recurrenceSub}>One time</Text>
        </TouchableOpacity>

        {/* Daily */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectRecurrence('daily')}
          style={[
            styles.recurrenceCard,
            recurrence === 'daily' && styles.recurrenceCardActive,
          ]}
        >
          <Repeat
            size={18}
            color={recurrence === 'daily' ? Colors.navy : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.recurrenceTitle,
              recurrence === 'daily' && styles.recurrenceTitleActive,
            ]}
          >
            Daily
          </Text>
          <Text style={styles.recurrenceSub}>Every day</Text>
        </TouchableOpacity>

        {/* Weekly */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectRecurrence('weekly')}
          style={[
            styles.recurrenceCard,
            recurrence === 'weekly' && styles.recurrenceCardActive,
          ]}
        >
          <Calendar
            size={18}
            color={recurrence === 'weekly' ? Colors.navy : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.recurrenceTitle,
              recurrence === 'weekly' && styles.recurrenceTitleActive,
            ]}
          >
            Weekly
          </Text>
          <Text style={styles.recurrenceSub}>Every week</Text>
        </TouchableOpacity>

        {/* Custom */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectRecurrence('custom')}
          style={[
            styles.recurrenceCard,
            recurrence === 'custom' && styles.recurrenceCardActive,
          ]}
        >
          <SlidersHorizontal
            size={18}
            color={recurrence === 'custom' ? Colors.navy : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.recurrenceTitle,
              recurrence === 'custom' && styles.recurrenceTitleActive,
            ]}
          >
            Custom
          </Text>
          <Text style={styles.recurrenceSub}>Custom days</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Recurrence Sub-Picker */}
      {recurrence === 'custom' && (
        <View style={styles.customSubPickerContainer}>
          <View style={styles.customModeSelector}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSelectCustomMode('specific_days')}
              style={[
                styles.customModeTab,
                customMode === 'specific_days' && styles.customModeTabActive,
              ]}
            >
              <Text
                style={[
                  styles.customModeTabText,
                  customMode === 'specific_days' && styles.customModeTabTextActive,
                ]}
              >
                Specific Weekdays
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSelectCustomMode('interval')}
              style={[
                styles.customModeTab,
                customMode === 'interval' && styles.customModeTabActive,
              ]}
            >
              <Text
                style={[
                  styles.customModeTabText,
                  customMode === 'interval' && styles.customModeTabTextActive,
                ]}
              >
                Every N Days
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode A: Specific Weekdays */}
          {customMode === 'specific_days' && (
            <View style={styles.weekdaysWrapper}>
              <Text style={styles.customSubHelper}>
                Select days to repeat on (e.g. Mon, Thu):
              </Text>
              <View style={styles.weekdaysRow}>
                {weekdays.map((day) => {
                  const isDaySelected = selectedWeekdays.includes(day.key);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      activeOpacity={0.7}
                      onPress={() => onToggleWeekday(day.key)}
                      style={[
                        styles.weekdayChip,
                        isDaySelected && styles.weekdayChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekdayChipText,
                          isDaySelected && styles.weekdayChipTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.customSummaryText}>
                Repeats every:{' '}
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: Colors.deepNavy }}>
                  {selectedWeekdays.map((d) => d.toUpperCase()).join(', ')}
                </Text>
              </Text>
            </View>
          )}

          {/* Mode B: Every N Days */}
          {customMode === 'interval' && (
            <View style={styles.intervalWrapper}>
              <View style={styles.intervalHeader}>
                <Text style={styles.customSubHelper}>Repeat interval:</Text>
                <View style={styles.stepperControl}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onChangeEveryNDays(Math.max(1, everyNDays - 1))}
                    style={styles.stepperBtn}
                  >
                    <Minus size={14} color={Colors.navy} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValueText}>Every {everyNDays} days</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onChangeEveryNDays(Math.min(90, everyNDays + 1))}
                    style={styles.stepperBtn}
                  >
                    <Plus size={14} color={Colors.navy} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.intervalPresetsRow}>
                {[2, 3, 4, 5, 7].map((num) => (
                  <TouchableOpacity
                    key={num}
                    activeOpacity={0.7}
                    onPress={() => onChangeEveryNDays(num)}
                    style={[
                      styles.intervalPresetPill,
                      everyNDays === num && styles.intervalPresetPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.intervalPresetText,
                        everyNDays === num && styles.intervalPresetTextActive,
                      ]}
                    >
                      {num}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
    marginBottom: 4,
  },
  recurrenceGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
  },
  recurrenceCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recurrenceCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.navy,
  },
  recurrenceTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
    marginTop: 4,
  },
  recurrenceTitleActive: {
    color: Colors.navy,
  },
  recurrenceSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  customSubPickerContainer: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customModeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  customModeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  customModeTabActive: {
    backgroundColor: Colors.navy,
  },
  customModeTabText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  customModeTabTextActive: {
    color: Colors.white,
  },
  weekdaysWrapper: {
    gap: 6,
  },
  customSubHelper: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekdayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekdayChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  weekdayChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  weekdayChipTextActive: {
    color: Colors.white,
  },
  customSummaryText: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  intervalWrapper: {
    gap: Spacing.xs,
  },
  intervalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperValueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  intervalPresetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  intervalPresetPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intervalPresetPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  intervalPresetText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  intervalPresetTextActive: {
    color: Colors.white,
  },
});
