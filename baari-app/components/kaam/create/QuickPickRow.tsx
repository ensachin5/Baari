import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { QuickPickPreset } from '../../../hooks/useQuickPicks';
import { renderQuickPickIcon } from '../EditQuickPicksModal';
import { Zap, Settings2 } from 'lucide-react-native';

interface QuickPickRowProps {
  presets: QuickPickPreset[];
  selectedQuickPickId: string | null;
  onSelectQuickPick: (item: QuickPickPreset) => void;
  onOpenEditPresets: () => void;
}

export const QuickPickRow: React.FC<QuickPickRowProps> = React.memo(({
  presets,
  selectedQuickPickId,
  onSelectQuickPick,
  onOpenEditPresets,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithIcon}>
          <Zap size={14} color={Colors.navy} />
          <Text style={styles.sectionTitle}>QUICK PICK</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenEditPresets}
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
              onPress={() => onSelectQuickPick(item)}
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
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
});
