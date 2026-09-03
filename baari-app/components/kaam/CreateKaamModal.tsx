import React, { useState, useEffect } from 'react';
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
import { useQuickPicks, QuickPickPreset } from '../../hooks/useQuickPicks';
import { EditQuickPicksModal, renderQuickPickIcon } from './EditQuickPicksModal';
import {
  Check,
  Plus,
  Minus,
  RotateCcw,
  User,
  Users,
  CheckCircle2,
  Repeat,
  Calendar,
  SlidersHorizontal,
  Clock,
  Zap,
  Settings2,
  Info,
} from 'lucide-react-native';

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
  role: 'admin' | 'member';
}

export type RecurrenceOption = 'once' | 'daily' | 'weekly' | 'custom';
export type CustomMode = 'specific_days' | 'interval';
export type AssignmentMode = 'auto_rotate' | 'one_person' | 'multiple_people';

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
  flatId?: string | null;
  loading?: boolean;
}

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
  flatId,
  loading = false,
}) => {
  const { presets, addPreset, deletePreset, refetch: refetchPresets } = useQuickPicks(flatId);

  // Quick Pick & Title state
  const [selectedQuickPickId, setSelectedQuickPickId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'water' | 'garbage' | 'chore' | 'custom'>('water');
  const [isEditPresetsOpen, setIsEditPresetsOpen] = useState(false);

  // 3 Distinct Assignment Modes: 'auto_rotate' | 'one_person' | 'multiple_people'
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('auto_rotate');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('daily');
  const [customMode, setCustomMode] = useState<CustomMode>('specific_days');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['mon', 'thu']);
  const [everyNDays, setEveryNDays] = useState(3);

  // Due Date state (0 = today, 1 = tomorrow, 2 = in 2 days, 3 = in 3 days)
  const [dueOffsetDays, setDueOffsetDays] = useState(0);

  const [error, setError] = useState('');

  // Pre-fill first preset ("Water") by default when opened
  useEffect(() => {
    if (visible && presets.length > 0 && !title) {
      const firstPreset = presets[0];
      setSelectedQuickPickId(firstPreset.id);
      setTitle(firstPreset.title);
      setCategory(firstPreset.category);
    }
  }, [visible, presets]);

  // 1. Quick Pick Selection
  const handleSelectQuickPick = (item: QuickPickPreset) => {
    setSelectedQuickPickId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setError('');
  };

  // 2. Custom Title Input Change
  const handleTitleChange = (text: string) => {
    setTitle(text);
    setError('');
    const matched = presets.find((q) => q.title.toLowerCase() === text.trim().toLowerCase());
    if (matched) {
      setSelectedQuickPickId(matched.id);
      setCategory(matched.category);
    } else {
      setSelectedQuickPickId(null);
    }
  };

  // 3. Assignment Mode Change
  const handleSwitchAssignmentMode = (mode: AssignmentMode) => {
    setAssignmentMode(mode);
    setError('');
    if (mode === 'auto_rotate') {
      setSelectedAssignees([]);
    } else if (mode === 'one_person') {
      // Pick first member if none selected or if multiple selected
      if (selectedAssignees.length === 0 && members.length > 0) {
        setSelectedAssignees([members[0].userId]);
      } else if (selectedAssignees.length > 1) {
        setSelectedAssignees([selectedAssignees[0]]);
      }
    } else if (mode === 'multiple_people') {
      // Pick at least 2 members if available
      if (selectedAssignees.length < 2 && members.length >= 2) {
        setSelectedAssignees([members[0].userId, members[1].userId]);
      }
    }
  };

  const handleMemberSelect = (userId: string) => {
    setError('');
    if (assignmentMode === 'one_person') {
      setSelectedAssignees([userId]);
    } else if (assignmentMode === 'multiple_people') {
      if (selectedAssignees.includes(userId)) {
        if (selectedAssignees.length <= 1) {
          setError('Multiple people mode requires at least 2 assignees');
          return;
        }
        setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
      } else {
        setSelectedAssignees([...selectedAssignees, userId]);
      }
    }
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
    let peopleReq = 1;

    if (assignmentMode === 'auto_rotate') {
      finalAssignees = members.map((m) => m.userId);
      if (finalAssignees.length === 0) {
        setError('No flat members found in this flat');
        return;
      }
      peopleReq = 1;
    } else if (assignmentMode === 'one_person') {
      if (selectedAssignees.length !== 1) {
        setError('Please select exactly 1 flatmate for this Kaam');
        return;
      }
      finalAssignees = selectedAssignees;
      peopleReq = 1;
    } else if (assignmentMode === 'multiple_people') {
      if (selectedAssignees.length < 2) {
        setError('Please select at least 2 flatmates for multi-person Kaam');
        return;
      }
      finalAssignees = selectedAssignees;
      peopleReq = selectedAssignees.length;
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
        peopleRequired: peopleReq,
        assigneeIds: finalAssignees,
        occurrenceDate: getFormattedDueDate(dueOffsetDays),
      });

      // Reset modal state
      if (presets.length > 0) {
        setSelectedQuickPickId(presets[0].id);
        setTitle(presets[0].title);
        setCategory(presets[0].category);
      }
      setAssignmentMode('auto_rotate');
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
    <>
      <Modal visible={visible} onClose={onClose} title="Create Kaam">
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. QUICK PICK (WITH WATER FIRST & EDIT AFFORDANCE) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Zap size={14} color={Colors.navy} />
              <Text style={styles.sectionTitle}>QUICK PICK</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsEditPresetsOpen(true)}
              style={styles.editPresetsAffordance}
            >
              <Settings2 size={12} color={Colors.navy} />
              <Text style={styles.editPresetsText}>Edit Presets</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPickScroll}
          >
            {presets.map((item) => {
              const isSelected = selectedQuickPickId === item.id;
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
                  {renderQuickPickIcon(
                    item,
                    15,
                    isSelected ? Colors.white : Colors.navy
                  )}
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

        {/* 3. ASSIGN TO (3 DISTINCT MODES) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ASSIGN TO</Text>

          {/* Mode Switcher Segmented Control */}
          <View style={styles.assignmentModeTabs}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSwitchAssignmentMode('auto_rotate')}
              style={[
                styles.assignmentModeTab,
                assignmentMode === 'auto_rotate' && styles.assignmentModeTabActive,
              ]}
            >
              <RotateCcw
                size={13}
                color={assignmentMode === 'auto_rotate' ? Colors.white : Colors.mutedNavy}
              />
              <Text
                style={[
                  styles.assignmentModeTabText,
                  assignmentMode === 'auto_rotate' && styles.assignmentModeTabTextActive,
                ]}
              >
                Auto-rotate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSwitchAssignmentMode('one_person')}
              style={[
                styles.assignmentModeTab,
                assignmentMode === 'one_person' && styles.assignmentModeTabActive,
              ]}
            >
              <User
                size={13}
                color={assignmentMode === 'one_person' ? Colors.white : Colors.mutedNavy}
              />
              <Text
                style={[
                  styles.assignmentModeTabText,
                  assignmentMode === 'one_person' && styles.assignmentModeTabTextActive,
                ]}
              >
                One person
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSwitchAssignmentMode('multiple_people')}
              style={[
                styles.assignmentModeTab,
                assignmentMode === 'multiple_people' && styles.assignmentModeTabActive,
              ]}
            >
              <Users
                size={13}
                color={assignmentMode === 'multiple_people' ? Colors.white : Colors.mutedNavy}
              />
              <Text
                style={[
                  styles.assignmentModeTabText,
                  assignmentMode === 'multiple_people' && styles.assignmentModeTabTextActive,
                ]}
              >
                Multiple people
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode A: Auto-rotate Explanation Card */}
          {assignmentMode === 'auto_rotate' && (
            <View style={styles.autoRotateCard}>
              <View style={styles.autoRotateIconWrap}>
                <RotateCcw size={18} color={Colors.navy} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.autoRotateTitle}>Fair Round-Robin Rotation</Text>
                <Text style={styles.autoRotateDesc}>
                  Turns rotate automatically across all flatmates in equal order each time it's completed.
                </Text>
              </View>
            </View>
          )}

          {/* Mode B: One Person (Single Select Avatars) */}
          {assignmentMode === 'one_person' && (
            <View>
              <Text style={styles.modeHelperText}>
                Tap 1 flatmate to assign (no rotation):
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.assigneesScroll}
              >
                {members.map((m) => {
                  const isSelected = selectedAssignees.includes(m.userId);
                  const firstName = m.name ? m.name.split(' ')[0] : 'Member';
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      activeOpacity={0.7}
                      onPress={() => handleMemberSelect(m.userId)}
                      style={[
                        styles.assigneeItem,
                        isSelected && styles.assigneeItemActive,
                      ]}
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
          )}

          {/* Mode C: Multiple People (Multi-Select Avatars) */}
          {assignmentMode === 'multiple_people' && (
            <View>
              <View style={styles.multiPeopleHeader}>
                <Text style={styles.modeHelperText}>
                  Select 2 or more flatmates ({selectedAssignees.length} selected):
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.assigneesScroll}
              >
                {members.map((m) => {
                  const isSelected = selectedAssignees.includes(m.userId);
                  const firstName = m.name ? m.name.split(' ')[0] : 'Member';
                  return (
                    <TouchableOpacity
                      key={m.userId}
                      activeOpacity={0.7}
                      onPress={() => handleMemberSelect(m.userId)}
                      style={[
                        styles.assigneeItem,
                        isSelected && styles.assigneeItemActive,
                      ]}
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
          )}
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
              <Text style={styles.recurrenceSub}>One time</Text>
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

      {/* Edit Quick Picks Modal */}
      <EditQuickPicksModal
        visible={isEditPresetsOpen}
        onClose={() => {
          setIsEditPresetsOpen(false);
          refetchPresets();
        }}
        presets={presets}
        onAdd={addPreset}
        onDelete={deletePreset}
      />
    </>
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
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
  },
  editPresetsAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.paleSky,
  },
  editPresetsText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.navy,
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
    marginTop: 4,
  },
  textInput: {
    ...Typography.Body,
    color: Colors.black,
    padding: 0,
  },
  // 3-Mode Assignment
  assignmentModeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  assignmentModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
  },
  assignmentModeTabActive: {
    backgroundColor: Colors.navy,
  },
  assignmentModeTabText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  assignmentModeTabTextActive: {
    color: Colors.white,
  },
  autoRotateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  autoRotateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoRotateTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  autoRotateDesc: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  modeHelperText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginBottom: 4,
  },
  multiPeopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assigneesScroll: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  assigneeItem: {
    alignItems: 'center',
    width: 66,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  assigneeItemActive: {
    backgroundColor: '#F0F9FF',
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
