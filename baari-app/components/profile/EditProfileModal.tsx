import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Camera, Check } from 'lucide-react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  editName: string;
  setEditName: (name: string) => void;
  editImage: string | null;
  onPickImage: () => void;
  onSave: () => void;
  updating: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = React.memo(({
  visible,
  onClose,
  editName,
  setEditName,
  editImage,
  onPickImage,
  onSave,
  updating,
}) => {
  return (
    <Modal visible={visible} onClose={onClose} title="Edit Profile">
      <View style={styles.container}>
        <View style={styles.avatarPickRow}>
          <View style={styles.avatarWrap}>
            <Avatar name={editName || 'User'} image={editImage} size="lg" />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPickImage}
              style={styles.cameraBadge}
            >
              <Camera size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarPickHelp}>Tap camera icon to change photo</Text>
        </View>

        <Input
          label="Your Name"
          value={editName}
          onChangeText={setEditName}
          placeholder="Enter your full name"
        />

        <Button
          title="Save Changes"
          onPress={onSave}
          loading={updating}
          icon={<Check size={18} color={Colors.white} />}
          style={{ marginTop: Spacing.md }}
        />
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  avatarPickRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.navy,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarPickHelp: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginTop: Spacing.xs,
  },
});
