import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Check } from 'lucide-react-native';

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
}

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    splitType: 'equal' | 'exact';
    splits: { userId: string; amountOwed: number }[];
  }) => Promise<void>;
  members: FlatMember[];
  loading?: boolean;
}

const CATEGORIES = ['Groceries', 'Utilities', 'Wi-Fi', 'Food', 'General'];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  loading = false,
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.userId)
  );
  const [error, setError] = useState('');

  // Update initial selected members when members prop changes
  React.useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map((m) => m.userId));
    }
  }, [members]);

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      if (selectedMembers.length === 1) return; // Keep at least one
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!title.trim()) {
      setError('Please enter what this expense was for');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least one person to split with');
      return;
    }

    try {
      setError('');
      const perPerson = Math.round((amount / selectedMembers.length) * 100) / 100;
      const splits = selectedMembers.map((userId) => ({
        userId,
        amountOwed: perPerson,
      }));

      await onSubmit({
        title: title.trim(),
        amount,
        category,
        splitType: 'equal',
        splits,
      });

      // Reset
      setTitle('');
      setAmountStr('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Expense">
      {/* Amount Input */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <Input
          placeholder="0.00"
          value={amountStr}
          onChangeText={setAmountStr}
          keyboardType="decimal-pad"
          containerStyle={styles.amountInputContainer}
          style={styles.amountInput}
        />
      </View>

      {/* Title Input */}
      <Input
        label="Description"
        placeholder="e.g., Grocery shopping, Wi-Fi bill"
        value={title}
        onChangeText={setTitle}
        error={error}
      />

      {/* Category Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setCategory(cat)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Split Participants */}
      <View style={styles.section}>
        <View style={styles.splitHeader}>
          <Text style={styles.sectionTitle}>Split with Flatmates</Text>
          <Text style={styles.splitSubtext}>
            {selectedMembers.length} people (₹
            {amountStr && !isNaN(parseFloat(amountStr))
              ? (parseFloat(amountStr) / (selectedMembers.length || 1)).toFixed(2)
              : '0.00'}{' '}
            each)
          </Text>
        </View>

        <View style={styles.membersList}>
          {members.map((member) => {
            const isSelected = selectedMembers.includes(member.userId);
            return (
              <TouchableOpacity
                key={member.userId}
                activeOpacity={0.8}
                onPress={() => toggleMember(member.userId)}
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
        title="Add Expense"
        onPress={handleSave}
        loading={loading}
        style={styles.submitBtn}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  currencySymbol: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.deepNavy,
    marginRight: Spacing.xs,
  },
  amountInputContainer: {
    marginBottom: 0,
    width: 180,
  },
  amountInput: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.BodySmallMedium,
    color: Colors.deepNavy,
    marginBottom: Spacing.xs,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  splitSubtext: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: 6,
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
  submitBtn: {
    marginTop: Spacing.sm,
  },
});
