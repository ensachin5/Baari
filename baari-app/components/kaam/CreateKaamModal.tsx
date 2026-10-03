import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useQuickPicks, QuickPickPreset } from '../../hooks/useQuickPicks';
import { EditQuickPicksModal } from './EditQuickPicksModal';
import { Plus } from 'lucide-react-native';

import { QuickPickRow } from './create/QuickPickRow';
import { AssignToSelector, FlatMember, AssignmentMode } from './create/AssignToSelector';
import { RecurrencePicker, RecurrenceOption, CustomMode } from './create/RecurrencePicker';
import { RotationGroupBuilder } from './create/RotationGroupBuilder';
import { DueDatePicker } from './create/DueDatePicker';
import { ConfirmationSummary } from './create/ConfirmationSummary';

export type { FlatMember, RecurrenceOption, CustomMode, AssignmentMode };

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
    assignmentMode?: 'auto_rotate' | 'custom_rotation';
    customRotationPool?: string[] | null;
    customRotationGroupSize?: number;
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
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

  // Assignment & Rotation state
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('auto_rotate');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState<number>(1);
  const [customGroups, setCustomGroups] = useState<Array<{ id: string; userIds: string[] }>>([]);

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceOption>('daily');
  const [customMode, setCustomMode] = useState<CustomMode>('specific_days');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(['mon', 'thu']);
  const [everyNDays, setEveryNDays] = useState(3);

  // Due Date state
  const [dueOffsetDays, setDueOffsetDays] = useState(0);

  // Status state
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormState = useCallback(() => {
    setSelectedQuickPickId(null);
    setTitle('');
    setCategory('water');
    setAssignmentMode('auto_rotate');
    setSelectedAssignees(members.length > 0 ? [members[0].userId] : []);
    setGroupSize(1);
    setCustomGroups([]);
    setRecurrence('daily');
    setCustomMode('specific_days');
    setSelectedWeekdays(['mon', 'thu']);
    setEveryNDays(3);
    setDueOffsetDays(0);
    setError('');
  }, [members]);

  useEffect(() => {
    if (visible) {
      resetFormState();
    }
  }, [visible, resetFormState]);

  const createInitialGroups = useCallback((assignees: string[], size: number) => {
    if (assignees.length === 0) {
      return [];
    }
    const effectiveSize = Math.max(1, size);
    const groups: Array<{ id: string; userIds: string[] }> = [];

    for (let i = 0; i < assignees.length; i += effectiveSize) {
      const chunk = assignees.slice(i, i + effectiveSize);
      groups.push({
        id: `grp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        userIds: chunk,
      });
    }

    return groups;
  }, []);

  const assignedUserIds = useMemo(() => {
    const set = new Set<string>();
    customGroups.forEach((g) => g.userIds.forEach((id) => set.add(id)));
    return set;
  }, [customGroups]);

  const unassignedUserIds = useMemo(() => {
    return selectedAssignees.filter((id) => !assignedUserIds.has(id));
  }, [selectedAssignees, assignedUserIds]);

  const handleSwitchAssignmentMode = useCallback((mode: AssignmentMode) => {
    setAssignmentMode(mode);
    if (mode === 'custom_rotation' && selectedAssignees.length === 0) {
      if (members.length > 0) {
        const initial = [members[0].userId];
        setSelectedAssignees(initial);
        setCustomGroups(createInitialGroups(initial, 1));
      }
    }
  }, [members, selectedAssignees.length, createInitialGroups]);

  const handleMemberSelect = useCallback((userId: string) => {
    setSelectedAssignees((prev) => {
      const isSelected = prev.includes(userId);
      let nextAssignees: string[];
      if (isSelected) {
        nextAssignees = prev.filter((id) => id !== userId);
      } else {
        nextAssignees = [...prev, userId];
      }

      setCustomGroups((prevGroups) => {
        if (isSelected) {
          return prevGroups
            .map((g) => ({
              ...g,
              userIds: g.userIds.filter((id) => id !== userId),
            }))
            .filter((g) => g.userIds.length > 0);
        } else {
          const updated = [...prevGroups];
          const targetGroup = updated.find((g) => g.userIds.length < groupSize);
          if (targetGroup) {
            targetGroup.userIds.push(userId);
          } else {
            updated.push({
              id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userIds: [userId],
            });
          }
          return updated;
        }
      });

      return nextAssignees;
    });
  }, [groupSize]);

  const handleGroupSizeChange = useCallback((newSize: number) => {
    setGroupSize(newSize);
    setCustomGroups((prevGroups) => {
      const allUserIds = prevGroups.flatMap((g) => g.userIds);
      return createInitialGroups(allUserIds.length > 0 ? allUserIds : selectedAssignees, newSize);
    });
  }, [selectedAssignees, createInitialGroups]);

  const handleRemoveMemberFromGroup = useCallback((groupId: string, userId: string) => {
    setCustomGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, userIds: g.userIds.filter((id) => id !== userId) } : g))
    );
  }, []);

  const handleAddMemberToGroup = useCallback((groupId: string, userId: string) => {
    setCustomGroups((prev) =>
      prev.map((g) => (g.id === groupId && !g.userIds.includes(userId) ? { ...g, userIds: [...g.userIds, userId] } : g))
    );
  }, []);

  const handleCreateSoloGroup = useCallback((userId: string) => {
    setCustomGroups((prev) => [
      ...prev,
      { id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, userIds: [userId] },
    ]);
  }, []);

  const handleAddNewEmptyGroup = useCallback(() => {
    setCustomGroups((prev) => [
      ...prev,
      { id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, userIds: [] },
    ]);
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setCustomGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const handleMoveGroup = useCallback((index: number, direction: 'up' | 'down') => {
    setCustomGroups((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }, []);

  const handleAutoDistribute = useCallback(() => {
    setCustomGroups(createInitialGroups(selectedAssignees, groupSize));
  }, [createInitialGroups, selectedAssignees, groupSize]);

  const handleSelectQuickPick = useCallback((item: QuickPickPreset) => {
    setSelectedQuickPickId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setError('');
  }, []);

  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    const matched = presets.find((q) => q.title.toLowerCase() === text.trim().toLowerCase());
    if (matched) {
      setSelectedQuickPickId(matched.id);
      setCategory(matched.category);
    } else {
      setSelectedQuickPickId(null);
    }
  }, [presets]);

  const toggleWeekday = useCallback((dayKey: string) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(dayKey)) {
        if (prev.length === 1) {
          setError('Select at least one day of the week');
          return prev;
        }
        return prev.filter((d) => d !== dayKey);
      } else {
        return [...prev, dayKey];
      }
    });
    setError('');
  }, []);

  const getFormattedDueDate = useCallback((offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }, []);

  const formatDateDisplay = useCallback((offsetDays: number): { label: string; sub: string; isToday: boolean } => {
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
  }, []);

  const handleSave = async () => {
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter or select a Kaam title');
      return;
    }

    let finalAssignees: string[] = [];
    let peopleReq = 1;
    let finalGroups: Array<{ groupOrder: number; userIds: string[] }> | null = null;
    let finalGroupSize = 1;

    if (assignmentMode === 'auto_rotate') {
      finalAssignees = members.map((m) => m.userId);
      if (finalAssignees.length === 0) {
        setError('No flat members found in this flat');
        return;
      }
      peopleReq = 1;
    } else if (assignmentMode === 'custom_rotation') {
      if (selectedAssignees.length === 0) {
        setError('Please select at least 1 flatmate for custom rotation');
        return;
      }

      if (unassignedUserIds.length > 0) {
        setError(`Please place all ${selectedAssignees.length} selected flatmates into groups.`);
        return;
      }

      const validGroups = customGroups.filter((g) => g.userIds.length > 0);
      if (validGroups.length === 0) {
        setError('Please form at least 1 rotation group with members.');
        return;
      }

      finalGroups = validGroups.map((g, idx) => ({
        groupOrder: idx + 1,
        userIds: g.userIds,
      }));

      finalGroupSize = selectedAssignees.length === 1 ? 1 : Math.min(groupSize, selectedAssignees.length);
      finalAssignees = finalGroups[0].userIds;
      peopleReq = finalAssignees.length;
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
      setIsSubmitting(true);
      await onSubmit({
        title: trimmedTitle,
        category,
        recurrence,
        customRecurrenceConfig: customConfig,
        assignmentMode,
        customRotationPool: assignmentMode === 'custom_rotation' ? selectedAssignees : null,
        customRotationGroupSize: finalGroupSize,
        customRotationGroups: finalGroups,
        peopleRequired: peopleReq,
        assigneeIds: finalAssignees,
        occurrenceDate: getFormattedDueDate(dueOffsetDays),
      });

      resetFormState();
      onClose();
    } catch (err: any) {
      console.error('[Create Kaam Modal] Submit Error:', err);
      setError(err?.message || 'Failed to create Kaam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGroupTypeLabel = useCallback((count: number) => {
    if (count === 1) return 'Solo';
    if (count === 2) return 'Pair';
    if (count === 3) return 'Trio';
    return `${count} people`;
  }, []);

  const getOrdinal = useCallback((n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }, []);

  const isSingleGroup =
    selectedAssignees.length === 1 ||
    (groupSize === selectedAssignees.length && customGroups.length <= 1);

  return (
    <>
      <Modal visible={visible} onClose={onClose} title="Create Kaam">
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. QUICK PICK */}
        <QuickPickRow
          presets={presets}
          selectedQuickPickId={selectedQuickPickId}
          onSelectQuickPick={handleSelectQuickPick}
          onOpenEditPresets={() => setIsEditPresetsOpen(true)}
        />

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
        <AssignToSelector
          assignmentMode={assignmentMode}
          onSwitchAssignmentMode={handleSwitchAssignmentMode}
          members={members}
          selectedAssignees={selectedAssignees}
          onMemberSelect={handleMemberSelect}
          groupSize={groupSize}
          onGroupSizeChange={handleGroupSizeChange}
          isSingleGroup={isSingleGroup}
        >
          <RotationGroupBuilder
            customGroups={customGroups}
            members={members}
            unassignedUserIds={unassignedUserIds}
            onDeleteGroup={handleDeleteGroup}
            onRemoveMemberFromGroup={handleRemoveMemberFromGroup}
            onAddMemberToGroup={handleAddMemberToGroup}
            onAddNewEmptyGroup={handleAddNewEmptyGroup}
            onAutoDistribute={handleAutoDistribute}
            onCreateSoloGroup={handleCreateSoloGroup}
            onMoveGroup={handleMoveGroup}
            getGroupTypeLabel={getGroupTypeLabel}
            getOrdinal={getOrdinal}
          />
        </AssignToSelector>

        {/* 4. HOW OFTEN? */}
        <RecurrencePicker
          recurrence={recurrence}
          onSelectRecurrence={setRecurrence}
          customMode={customMode}
          onSelectCustomMode={setCustomMode}
          selectedWeekdays={selectedWeekdays}
          onToggleWeekday={toggleWeekday}
          everyNDays={everyNDays}
          onChangeEveryNDays={setEveryNDays}
          weekdays={WEEKDAYS}
        />

        {/* 5. DUE DATE */}
        <DueDatePicker
          dueOffsetDays={dueOffsetDays}
          onSelectDueOffsetDays={setDueOffsetDays}
          formatDateDisplay={formatDateDisplay}
        />

        {/* SUMMARY & SUBMISSION */}
        <ConfirmationSummary
          title={title}
          category={category}
          assignmentMode={assignmentMode}
          assigneesCount={selectedAssignees.length}
          recurrence={recurrence}
          dueDateLabel={formatDateDisplay(dueOffsetDays).label}
        />

        <Button
          title="Add Kaam"
          onPress={handleSave}
          loading={loading || isSubmitting}
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
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
    marginBottom: 4,
  },
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
  submitButton: {
    marginTop: Spacing.xs,
  },
});
