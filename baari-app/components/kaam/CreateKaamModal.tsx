import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Check, Plus, Minus } from 'lucide-react-native';

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
  role: 'admin' | 'member';
}

interface CreateKaamModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    category: 'water' | 'garbage' | 'chore' | 'custom';
    description?: string;
    recurrence: 'once' | 'daily' | 'weekly';
    peopleRequired: number;
    assigneeIds: string[];
  }) => Promise<void>;
  members: FlatMember[];
  loading?: boolean;
}

const CATEGORIES: { label: string; value: 'water' | 'garbage' | 'chore' | 'custom' }[] = [
  { label: '💧 Water Tank', value: 'water' },
  { label: '🗑️ Garbage', value: 'garbage' },
  { label: '🧹 Cleaning Chore', value: 'chore' },
  { label: '✨ Custom', value: 'custom' },
];

const RECURRENCES: { label: string; value: 'once' | 'daily' | 'weekly' }[] = [
  { label: 'Once', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

export const CreateKaamModal: React.FC<CreateKaamModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  loading = false,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'water' | 'garbage' | 'chore' | 'custom'>('chore');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly'>('daily');
  const [description, setDescription] = useState('');
  const [peopleRequired, setPeopleRequired] = useState(1);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (selectedAssignees.length === 0) {
      setError('Please assign at least one person');
      return;
    }

    try {
      setError('');
      await onSubmit({
        title: title.trim(),
        category,
        recurrence,
        description: description.trim() || undefined,
        peopleRequired: Math.max(peopleRequired, selectedAssignees.length),
        assigneeIds: selectedAssignees,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedAssignees([]);
      setPeopleRequired(1);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create Kaam (Task)">
      {/* Title */}
      <Input
        label="Task Title"
        placeholder="e.g., Turn on water pump, Hall cleaning"
        value={title}
        onChangeText={setTitle}
        error={error}
      />

      {/* Category Pills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                activeOpacity={0.8}
                onPress={() => setCategory(cat.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Recurrence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recurrence</Text>
        <View style={styles.chipsRow}>
          {RECURRENCES.map((rec) => {
            const isSelected = recurrence === rec.value;
            return (
              <TouchableOpacity
                key={rec.value}
                activeOpacity={0.8}
                onPress={() => setRecurrence(rec.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {rec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* People Required Stepper */}
      <View style={styles.section}>
        <View style={styles.stepperHeader}>
          <Text style={styles.sectionTitle}>People Required</Text>
          <View style={styles.stepperControl}>
            <TouchableOpacity
              onPress={() => setPeopleRequired(Math.max(1, peopleRequired - 1))}
              style={styles.stepperButton}
            >
              <Minus size={16} color={Colors.navy} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{peopleRequired}</Text>
            <TouchableOpacity
              onPress={() => setPeopleRequired(peopleRequired + 1)}
              style={styles.stepperButton}
            >
              <Plus size={16} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Assign Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assign Flatmates</Text>
        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = selectedAssignees.includes(member.userId);
            return (
              <TouchableOpacity
                key={member.userId}
                activeOpacity={0.8}
                onPress={() => toggleAssignee(member.userId)}
                style={[
                  styles.memberRow,
                  isSelected && styles.memberRowSelected,
                ]}
              >
                <View style={styles.memberInfo}>
                  <Avatar name={member.name} image={member.image} size="sm" />
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Check size={12} color={Colors.white} strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Button
        title="Create Kaam"
        onPress={handleSave}
        loading={loading}
        style={styles.submitButton}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.BodySmallMedium,
    color: Colors.deepNavy,
    marginBottom: Spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.paleSky,
    borderColor: Colors.navy,
  },
  chipText: {
    ...Typography.Caption,
    color: Colors.black,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  stepperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperButton: {
    padding: Spacing.sm,
  },
  stepperValue: {
    ...Typography.BodyMedium,
    paddingHorizontal: Spacing.md,
    fontWeight: '700',
    color: Colors.navy,
  },
  membersList: {
    gap: Spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberRowSelected: {
    backgroundColor: Colors.paleSky,
    borderColor: Colors.navy,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    ...Typography.BodySmallMedium,
    color: Colors.black,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.mutedNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
