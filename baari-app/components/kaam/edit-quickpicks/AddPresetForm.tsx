import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Button } from '../../ui/Button';

interface IconOption {
  name: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface AddPresetFormProps {
  newLabel: string;
  setNewLabel: (val: string) => void;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newCategory: 'water' | 'garbage' | 'chore' | 'custom';
  setNewCategory: (val: 'water' | 'garbage' | 'chore' | 'custom') => void;
  selectedIconName: string;
  setSelectedIconName: (val: string) => void;
  iconOptions: IconOption[];
  categories: Array<{ label: string; value: 'water' | 'garbage' | 'chore' | 'custom' }>;
  loading: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export const AddPresetForm: React.FC<AddPresetFormProps> = React.memo(({
  newLabel,
  setNewLabel,
  newTitle,
  setNewTitle,
  newCategory,
  setNewCategory,
  selectedIconName,
  setSelectedIconName,
  iconOptions,
  categories,
  loading,
  onCancel,
  onSubmit,
}) => {
  return (
    <View style={styles.addFormContainer}>
      <Text style={styles.addFormHeader}>Add New Preset</Text>

      <Text style={styles.inputLabel}>Chip Label (Short)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Balcony"
        placeholderTextColor={Colors.mutedNavy}
        value={newLabel}
        onChangeText={setNewLabel}
      />

      <Text style={styles.inputLabel}>Full Kaam Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Clean balcony & watering plants"
        placeholderTextColor={Colors.mutedNavy}
        value={newTitle}
        onChangeText={setNewTitle}
      />

      <Text style={styles.inputLabel}>Select Icon</Text>
      <View style={styles.iconPickerGrid}>
        {iconOptions.map((opt) => {
          const isSelected = selectedIconName === opt.name;
          const IconComponent = opt.icon;
          return (
            <TouchableOpacity
              key={opt.name}
              activeOpacity={0.7}
              onPress={() => setSelectedIconName(opt.name)}
              style={[
                styles.iconPickerCell,
                isSelected && styles.iconPickerCellActive,
              ]}
            >
              <IconComponent
                size={18}
                color={isSelected ? Colors.white : Colors.navy}
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.inputLabel}>Category</Text>
      <View style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            activeOpacity={0.7}
            onPress={() => setNewCategory(cat.value)}
            style={[
              styles.categoryPill,
              newCategory === cat.value && styles.categoryPillActive,
            ]}
          >
            <Text
              style={[
                styles.categoryPillText,
                newCategory === cat.value && styles.categoryPillTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formActionRow}>
        <Button
          title="Cancel"
          variant="outline"
          size="sm"
          onPress={onCancel}
          style={{ flex: 1 }}
        />
        <Button
          title="Save Preset"
          size="sm"
          loading={loading}
          onPress={onSubmit}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  addFormContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addFormHeader: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: Colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.grayBlack,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.black,
  },
  iconPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  iconPickerCell: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPickerCellActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  categoryPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  categoryPillTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  formActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
