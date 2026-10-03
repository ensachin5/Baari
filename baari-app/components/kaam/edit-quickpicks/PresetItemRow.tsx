import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { QuickPickPreset } from '../../../hooks/useQuickPicks';
import { renderQuickPickIcon } from '../EditQuickPicksModal';
import { Trash2 } from 'lucide-react-native';

interface PresetItemRowProps {
  preset: QuickPickPreset;
  canDelete: boolean;
  onDelete: (preset: QuickPickPreset) => void;
}

export const PresetItemRow: React.FC<PresetItemRowProps> = React.memo(({
  preset,
  canDelete,
  onDelete,
}) => {
  return (
    <View style={styles.presetRow}>
      <View style={styles.presetIconWrap}>
        {renderQuickPickIcon(preset, 18, Colors.navy)}
      </View>
      <View style={styles.presetInfo}>
        <View style={styles.presetLabelRow}>
          <Text style={styles.presetLabelText}>{preset.label}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{preset.category}</Text>
          </View>
        </View>
        <Text style={styles.presetTitleText}>{preset.title}</Text>
      </View>

      {canDelete && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onDelete(preset)}
          style={styles.deleteBtn}
        >
          <Trash2 size={16} color="#DC2626" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.paleSky,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  presetInfo: {
    flex: 1,
  },
  presetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetLabelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.deepNavy,
  },
  categoryBadge: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: Colors.mutedNavy,
    textTransform: 'uppercase',
  },
  presetTitleText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: BorderRadius.sm,
  },
});
