import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { api } from '../../lib/api';

interface SkipTurnModalProps {
  visible: boolean;
  taskTitle: string;
  occurrenceId: string;
  onClose: () => void;
  onSuccess: (passedToName: string) => void;
}

export const SkipTurnModal: React.FC<SkipTurnModalProps> = ({
  visible,
  taskTitle,
  occurrenceId,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    try {
      setLoading(true);
      const res = await api.patch<{ message: string; passedTo: { name: string } }>(
        `/api/tasks/occurrences/${occurrenceId}/skip-turn`,
        { reason: reason.trim() || undefined }
      );
      setReason('');
      onSuccess(res.passedTo?.name || 'next flatmate');
      onClose();
    } catch (err: any) {
      Alert.alert('Cannot Skip Turn', err.message || 'Failed to skip turn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Skip My Turn">
      <View style={styles.content}>
        <Text style={[Typography.BodySmall, styles.description]}>
          Passing your turn for <Text style={styles.boldText}>{taskTitle}</Text> will assign it to the next flatmate in rotation for this occurrence only.
        </Text>

        <Input
          label="Reason (Optional)"
          placeholder="e.g. Out of town, busy with exams"
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.buttonRow}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={loading}
          />
          <Button
            title="Pass Turn"
            onPress={handleSkip}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.xs,
  },
  description: {
    color: Colors.mutedNavy,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.deepNavy,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    minWidth: 80,
  },
  submitBtn: {
    minWidth: 110,
  },
});
