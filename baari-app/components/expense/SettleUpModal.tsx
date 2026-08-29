import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { FlatMember } from './AddExpenseModal';
import { useSession } from '../../store/session';

interface SettleUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    paidTo: string;
    amount: number;
    note?: string;
  }) => Promise<void>;
  members: FlatMember[];
  suggestedDebts?: {
    toUserId: string;
    toUserName: string;
    amount: number;
  }[];
  loading?: boolean;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  suggestedDebts = [],
  loading = false,
}) => {
  const currentUserId = useSession((state) => state.user?.id);
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId);

  const [selectedPayeeId, setSelectedPayeeId] = useState<string>(
    suggestedDebts[0]?.toUserId || eligibleMembers[0]?.userId || ''
  );
  const [amountStr, setAmountStr] = useState<string>(
    suggestedDebts[0]?.amount ? suggestedDebts[0].amount.toString() : ''
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSelectDebt = (debt: { toUserId: string; amount: number }) => {
    setSelectedPayeeId(debt.toUserId);
    setAmountStr(debt.amount.toString());
  };

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!selectedPayeeId) {
      setError('Please select who you paid');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setError('');
      await onSubmit({
        paidTo: selectedPayeeId,
        amount,
        note: note.trim() || undefined,
      });

      // Reset
      setAmountStr('');
      setNote('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Settle Up Payment">
      {/* Suggested Debts Quick Selection */}
      {suggestedDebts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested Settlements</Text>
          <View style={styles.chipsRow}>
            {suggestedDebts.map((d) => (
              <TouchableOpacity
                key={d.toUserId}
                activeOpacity={0.8}
                onPress={() => handleSelectDebt(d)}
                style={[
                  styles.debtChip,
                  selectedPayeeId === d.toUserId && styles.debtChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.debtChipText,
                    selectedPayeeId === d.toUserId && styles.debtChipTextSelected,
                  ]}
                >
                  Pay {d.toUserName} ₹{d.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Select Flatmate */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paid To</Text>
        <View style={styles.membersList}>
          {eligibleMembers.map((member) => {
            const isSelected = selectedPayeeId === member.userId;
            return (
              <TouchableOpacity
                key={member.userId}
                activeOpacity={0.8}
                onPress={() => setSelectedPayeeId(member.userId)}
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
                    styles.radio,
                    isSelected && styles.radioSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Amount Input */}
      <Input
        label="Amount (₹)"
        placeholder="0.00"
        value={amountStr}
        onChangeText={setAmountStr}
        keyboardType="decimal-pad"
        error={error}
      />

      {/* Note Input */}
      <Input
        label="Note (Optional)"
        placeholder="e.g., Paid via UPI / cash"
        value={note}
        onChangeText={setNote}
      />

      <Button
        title="Record Settlement"
        onPress={handleSave}
        loading={loading}
        style={styles.submitBtn}
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
  debtChip: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  debtChipSelected: {
    backgroundColor: Colors.paleSky,
    borderColor: Colors.navy,
  },
  debtChipText: {
    ...Typography.Caption,
    color: Colors.black,
    fontWeight: '600',
  },
  debtChipTextSelected: {
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
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.mutedNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.navy,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.navy,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
});
