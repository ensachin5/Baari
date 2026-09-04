import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { Megaphone, Pin } from 'lucide-react-native';

interface CreateAnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const activeFlat = useSession((state) => state.activeFlat);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for the announcement');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Required', 'Please enter the announcement message');
      return;
    }
    if (!activeFlat?.id) return;

    setLoading(true);
    try {
      await api.post('/api/announcements', {
        flatId: activeFlat.id,
        title: title.trim(),
        body: body.trim(),
        pinned,
      });
      setTitle('');
      setBody('');
      setPinned(true);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Notice">
      <View style={styles.container}>
        <View style={styles.headerNotice}>
          <Megaphone size={18} color={Colors.navy} />
          <Text style={styles.headerNoticeText}>
            Pinned notices stay visible at the top of Home for everyone.
          </Text>
        </View>

        <Input
          label="Title"
          placeholder="e.g. Landlord visit this Friday, Wi-Fi bill"
          value={title}
          onChangeText={setTitle}
          autoFocus={Platform.OS !== 'web'}
        />

        <Input
          label="Details / Instructions"
          placeholder="e.g. Please ensure all rooms are tidy by 10 AM..."
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        <View style={styles.switchRow}>
          <View style={styles.switchLabelCol}>
            <View style={styles.pinIconRow}>
              <Pin size={14} color={Colors.navy} />
              <Text style={styles.switchLabel}>Pin to top</Text>
            </View>
            <Text style={styles.switchSub}>Displays notice in the Home banner</Text>
          </View>
          <Switch
            value={pinned}
            onValueChange={setPinned}
            trackColor={{ false: Colors.border, true: Colors.navy }}
            thumbColor={Colors.white}
          />
        </View>

        <View style={styles.btnRow}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={onClose}
            style={styles.cancelBtn}
            disabled={loading}
          />
          <Button
            title={loading ? 'Posting...' : 'Post Notice'}
            variant="primary"
            onPress={handleSubmit}
            style={styles.submitBtn}
            disabled={loading}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  headerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  headerNoticeText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  switchLabelCol: {
    flex: 1,
    gap: 2,
  },
  pinIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchLabel: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.grayBlack,
  },
  switchSub: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
