import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import {
  Check,
  Plus,
  Minus,
  Utensils,
  Trash2,
  Sparkles,
  Bath,
  Shirt,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  Repeat,
  Calendar,
  SlidersHorizontal,
  Clock,
  Zap,
} from 'lucide-react-native';

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
  role: 'admin' | 'member';
}

export type RecurrenceOption = 'once' | 'daily' | 'weekly' | 'custom';
export type CustomMode = 'specific_days' | 'interval';

export type CustomRecurrenceConfig =
  | { type: 'specific_days'; days: string[] }
  | { type: 'interval'; everyNDays: number };

interface CreateKaamModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    category: 'water' | 'garbage' | 'chore' | 'custom';
    description?: string;
    recurrence: RecurrenceOption;
    customRecurrenceConfig?: CustomRecurrenceConfig | null;
    peopleRequired: number;
    assigneeIds: string[];
    occurrenceDate?: string;
  }) => Promise<void>;
  members: FlatMember[];
  loading?: boolean;
}

const QUICK_PICKS = [
  { id: 'dishes', label: 'Dishes', title: 'Dishes', category: 'chore' as const, icon: Utensils },
  { id: 'trash', label: 'Trash', title: 'Trash', category: 'garbage' as const, icon: Trash2 },
  { id: 'sweeping', label: 'Sweeping', title: 'Sweeping', category: 'chore' as const, icon: Sparkles },
  { id: 'bathroom', label: 'Bathroom', title: 'Bathroom', category: 'chore' as const, icon: Bath },
  { id: 'laundry', label: 'Laundry', title: 'Laundry', category: 'chore' as const, icon: Shirt },
  { id: 'groceries', label: 'Groceries', title: 'Groceries', category: 'custom' as const, icon: ShoppingBag },
];

const WEEKDAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export const CreateKaamModal: React.FC<CreateKaamModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  loading = false,
}) => {
  const [selectedQuickPick, setSelectedQuickPick] = useState<string | null>('dishes');
  const [title, setTitle] = useState('Dishes');
  const [category, setCategory] = useState<'water' | 'garbage' | 'chore' | 'custom'>('chore');

  // Assignee state: isAnyoneMode vs specific members
  const [isAnyoneMode, setIsAnyoneMode] = useState(true);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('daily');
  const [customMode, setCustomMode] = useState<CustomMode>('specific_days');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['mon', 'thu']);
  const [everyNDays, setEveryNDays] = useState(3);

  // Due Date state (0 = today, 1 = tomorrow, 2 = in 2 days, 3 = in 3 days)
  const [dueOffsetDays, setDueOffsetDays] = useState(0);

  const [error, setError] = useState('');

  // 1. Quick Pick Selection
  const handleSelectQuickPick = (item: typeof QUICK_PICKS[0]) => {
    setSelectedQuickPick(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setError('');
  };

  // 2. Custom Title Input Change
  const handleTitleChange = (text: string) => {
    setTitle(text);
    setError('');
    const matched = QUICK_PICKS.find((q) => q.title.toLowerCase() === text.trim().toLowerCase());
    if (matched) {
      setSelectedQuickPick(matched.id);
      setCategory(matched.category);
    } else {
      setSelectedQuickPick(null);
    }
  };

  // 3. Assign To Toggle
  const handleSelectAnyone = () => {
    setIsAnyoneMode(true);
    setSelectedAssignees([]);
    setError('');
  };

  const toggleMemberAssignee = (userId: string) => {
    setIsAnyoneMode(false);
    if (selectedAssignees.includes(userId)) {
      const next = selectedAssignees.filter((id) => id !== userId);
      setSelectedAssignees(next);
      if (next.length === 0) {
        setIsAnyoneMode(true);
      }
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
    setError('');
  };

  // 4. Custom Weekdays Toggle
  const toggleWeekday = (dayKey: string) => {
    if (selectedWeekdays.includes(dayKey)) {
      if (selectedWeekdays.length === 1) {
        setError('Select at least one day of the week');
        return;
      }
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== dayKey));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayKey]);
    }
    setError('');
  };

  // Format Due Date
  const getFormattedDueDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const formatDateDisplay = (offsetDays: number): { label: string; sub: string; isToday: boolean } => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

    if (offsetDays === 0) {
      return { label: 'Today', sub: `${dateStr} — due soon`, isToday: true };
    }
    if (offsetDays === 1) {
      return { label: 'Tomorrow', sub: dateStr, isToday: false };
    }
    return { label: `In ${offsetDays} Days`, sub: dateStr, isToday: false };
  };

  // Submit Handler
  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter or select a Kaam title');
      return;
    }

    let finalAssignees: string[] = [];
    if (isAnyoneMode) {
      finalAssignees = members.map((m) => m.userId);
      if (finalAssignees.length === 0) {
        setError('No flat members found to assign');
        return;
      }
    } else {
      if (selectedAssignees.length === 0) {
        setError('Please select at least one flat member or choose Anyone');
        return;
      }
      finalAssignees = selectedAssignees;
    }

    let customConfig: CustomRecurrenceConfig | null = null;
    if (recurrence === 'custom') {
      if (customMode === 'specific_days') {
        if (selectedWeekdays.length === 0) {
          setError('Please select at least one day of the week');
          return;
        }
        customConfig = { type: 'specific_days', days: selectedWeekdays };
      } else {
        customConfig = { type: 'interval', everyNDays: Math.max(1, everyNDays) };
      }
    }

    try {
      setError('');
      await onSubmit({
        title: trimmedTitle,
        category,
        recurrence,
        customRecurrenceConfig: customConfig,
        peopleRequired: isAnyoneMode ? 1 : finalAssignees.length,
        assigneeIds: finalAssignees,
        occurrenceDate: getFormattedDueDate(dueOffsetDays),
      });

      // Reset
      setSelectedQuickPick('dishes');
      setTitle('Dishes');
      setCategory('chore');
      setIsAnyoneMode(true);
      setSelectedAssignees([]);
      setRecurrence('daily');
      setCustomMode('specific_days');
      setSelectedWeekdays(['mon', 'thu']);
      setEveryNDays(3);
      setDueOffsetDays(0);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Kaam');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create Kaam">
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* 1. QUICK PICK */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Zap size={14} color={Colors.navy} />
          <Text style={styles.sectionTitle}>QUICK PICK</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPickScroll}
        >
          {QUICK_PICKS.map((item) => {
            const isSelected = selectedQuickPick === item.id;
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleSelectQuickPick(item)}
                style={[
                  styles.quickPickChip,
                  isSelected && styles.quickPickChipActive,
                ]}
              >
                <IconComp
                  size={15}
                  color={isSelected ? Colors.white : Colors.navy}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.quickPickChipText,
                    isSelected && styles.quickPickChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. CUSTOM TITLE INPUT */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KAAM TITLE</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Mop balcony, Clean ceiling fan..."
            placeholderTextColor={Colors.mutedNavy}
            value={title}
            onChangeText={handleTitleChange}
          />
        </View>
      </View>

      {/* 3. ASSIGN TO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ASSIGN TO</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.assigneesScroll}
        >
          {/* Anyone (Auto-Rotate Fair Turn) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSelectAnyone}
            style={[styles.assigneeItem, isAnyoneMode && styles.assigneeItemActive]}
          >
            <View
              style={[
                styles.anyoneAvatarWrap,
                isAnyoneMode && styles.anyoneAvatarWrapActive,
              ]}
            >
              <RotateCcw
                size={18}
                color={isAnyoneMode ? Colors.white : Colors.navy}
                strokeWidth={2.4}
              />
            </View>
            <Text
              style={[
                styles.assigneeName,
                isAnyoneMode && styles.assigneeNameActive,
              ]}
              numberOfLines={1}
            >
              Anyone
            </Text>
            <Text style={styles.assigneeSub}>Auto-rotate</Text>
          </TouchableOpacity>

          {/* Individual Members */}
          {members.map((m) => {
            const isSelected = !isAnyoneMode && selectedAssignees.includes(m.userId);
            const firstName = m.name ? m.name.split(' ')[0] : 'Member';
            return (
              <TouchableOpacity
                key={m.userId}
                activeOpacity={0.7}
                onPress={() => toggleMemberAssignee(m.userId)}
                style={[styles.assigneeItem, isSelected && styles.assigneeItemActive]}
              >
                <View style={styles.avatarWrap}>
                  <Avatar name={m.name} image={m.image} size="md" />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={10} color={Colors.white} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.assigneeName,
                    isSelected && styles.assigneeNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {firstName}
                </Text>
                <Text style={styles.assigneeSub}>{m.role}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. HOW OFTEN? (RECURRENCE + CUSTOM SUB-PICKER) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HOW OFTEN?</Text>
        <View style={styles.recurrenceGrid}>
          {/* Once */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRecurrence('once')}
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
            <Text style={styles.recurrenceSub}>One time only</Text>
          </TouchableOpacity>

          {/* Daily */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRecurrence('daily')}
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
            onPress={() => setRecurrence('weekly')}
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
            onPress={() => setRecurrence('custom')}
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
            {/* Custom Mode Segmented Control */}
            <View style={styles.customModeSelector}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCustomMode('specific_days')}
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
                onPress={() => setCustomMode('interval')}
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
                  {WEEKDAYS.map((day) => {
                    const isDaySelected = selectedWeekdays.includes(day.key);
                    return (
                      <TouchableOpacity
                        key={day.key}
                        activeOpacity={0.7}
                        onPress={() => toggleWeekday(day.key)}
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
                      onPress={() => setEveryNDays(Math.max(1, everyNDays - 1))}
                      style={styles.stepperBtn}
                    >
                      <Minus size={14} color={Colors.navy} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValueText}>Every {everyNDays} days</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setEveryNDays(Math.min(90, everyNDays + 1))}
                      style={styles.stepperBtn}
                    >
                      <Plus size={14} color={Colors.navy} />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Interval Presets */}
                <View style={styles.intervalPresetsRow}>
                  {[2, 3, 4, 5, 7].map((num) => (
                    <TouchableOpacity
                      key={num}
                      activeOpacity={0.7}
                      onPress={() => setEveryNDays(num)}
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

      {/* 5. DUE DATE */}
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
                onPress={() => setDueOffsetDays(offset)}
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

      {/* SUBMISSION BUTTON */}
      <Button
        title="Add Kaam"
        onPress={handleSave}
        loading={loading}
        icon={<Plus size={18} color={Colors.white} strokeWidth={2.4} />}
        style={styles.submitButton}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.Caption,
    color: '#DC2626',
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
    marginBottom: 4,
  },
  // Quick pick chips
  quickPickScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  quickPickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPickChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  quickPickChipText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
  },
  quickPickChipTextActive: {
    color: Colors.white,
  },
  // Custom title input
  inputWrapper: {
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  textInput: {
    ...Typography.Body,
    color: Colors.black,
    padding: 0,
  },
  // Assignees
  assigneesScroll: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  assigneeItem: {
    alignItems: 'center',
    width: 68,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  assigneeItemActive: {
    backgroundColor: '#F0F9FF',
  },
  anyoneAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.paleSky,
    borderWidth: 2,
    borderColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyoneAvatarWrapActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.deepNavy,
  },
  avatarWrap: {
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  assigneeName: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
    marginTop: 4,
  },
  assigneeNameActive: {
    color: Colors.navy,
  },
  assigneeSub: {
    ...Typography.Caption,
    fontSize: 9,
    color: Colors.mutedNavy,
  },
  // Recurrence
  recurrenceGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
  },
  recurrenceCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  recurrenceCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.navy,
    borderWidth: 1.5,
  },
  recurrenceTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
    marginTop: 4,
  },
  recurrenceTitleActive: {
    color: Colors.navy,
  },
  recurrenceSub: {
    ...Typography.Caption,
    fontSize: 9,
    color: Colors.grayBlack,
    textAlign: 'center',
    marginTop: 1,
  },
  // Custom sub-picker
  customSubPickerContainer: {
    marginTop: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customModeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.sm,
    padding: 3,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customModeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  customModeTabActive: {
    backgroundColor: Colors.navy,
  },
  customModeTabText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.mutedNavy,
  },
  customModeTabTextActive: {
    color: Colors.white,
  },
  weekdaysWrapper: {
    gap: Spacing.xs,
  },
  customSubHelper: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginBottom: 4,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  weekdayChipTextActive: {
    color: Colors.white,
  },
  customSummaryText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    marginTop: 6,
  },
  // Interval
  intervalWrapper: {
    gap: Spacing.sm,
  },
  intervalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  stepperBtn: {
    padding: 8,
    backgroundColor: Colors.offWhite,
  },
  stepperValueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.navy,
    paddingHorizontal: Spacing.md,
  },
  intervalPresetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  intervalPresetPill: {
    paddingVertical: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intervalPresetPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  intervalPresetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  intervalPresetTextActive: {
    color: Colors.white,
  },
  // Due date grid
  dueDateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  dueDateCard: {
    width: '48.5%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dueDateCardTodaySelected: {
    backgroundColor: Colors.deepNavy,
    borderColor: Colors.deepNavy,
    borderWidth: 1.5,
  },
  dueDateCardFutureSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.navy,
    borderWidth: 1.5,
  },
  dueDateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueDateLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  dueDateLabelTodaySelected: {
    color: Colors.white,
  },
  dueDateLabelFutureSelected: {
    color: Colors.navy,
  },
  dueSoonBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  dueSoonBadgeText: {
    ...Typography.Caption,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
  },
  dueDateSub: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
    marginTop: 2,
  },
  dueDateSubTodaySelected: {
    color: '#BAE6FD',
  },
  dueDateSubFutureSelected: {
    color: Colors.mutedNavy,
  },
  submitButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
