import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { QuickPickPreset } from '../../hooks/useQuickPicks';
import {
  Trash2,
  Plus,
  Droplet,
  Wind,
  Bath,
  UtensilsCrossed,
  Shirt,
  ShoppingCart,
  Home,
  Flame,
  Zap,
  Bed,
  Tv,
  Package,
  Coffee,
  CheckCircle2,
  Check,
} from 'lucide-react-native';

interface EditQuickPicksModalProps {
  visible: boolean;
  onClose: () => void;
  presets: QuickPickPreset[];
  onAdd: (data: {
    label: string;
    title: string;
    category: 'water' | 'garbage' | 'chore' | 'custom';
    icon?: string;
  }) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

export const ICON_OPTIONS = [
  { name: 'Droplet', label: 'Water', icon: Droplet },
  { name: 'Trash2', label: 'Trash', icon: Trash2 },
  { name: 'Wind', label: 'Sweeping', icon: Wind },
  { name: 'Bath', label: 'Bathroom', icon: Bath },
  { name: 'UtensilsCrossed', label: 'Dishes', icon: UtensilsCrossed },
  { name: 'Shirt', label: 'Laundry', icon: Shirt },
  { name: 'ShoppingCart', label: 'Groceries', icon: ShoppingCart },
  { name: 'Home', label: 'Home', icon: Home },
  { name: 'Flame', label: 'Kitchen/Gas', icon: Flame },
  { name: 'Zap', label: 'Electricity', icon: Zap },
  { name: 'Bed', label: 'Bedding', icon: Bed },
  { name: 'Coffee', label: 'Breakfast', icon: Coffee },
];

const CATEGORIES: { label: string; value: 'water' | 'garbage' | 'chore' | 'custom' }[] = [
  { label: '💧 Water', value: 'water' },
  { label: '🗑️ Garbage', value: 'garbage' },
  { label: '🧹 Chore', value: 'chore' },
  { label: '✨ Custom', value: 'custom' },
];

export const renderQuickPickIcon = (
  presetOrName?: string | QuickPickPreset | null,
  size: number = 16,
  color: string = Colors.navy
) => {
  let iconKey = '';
  let label = '';
  let category = '';

  if (typeof presetOrName === 'string') {
    iconKey = presetOrName;
  } else if (presetOrName) {
    iconKey = presetOrName.icon || '';
    label = (presetOrName.label || presetOrName.title || '').toLowerCase();
    category = (presetOrName.category || '').toLowerCase();
  }

  // 1. Direct icon key matching
  const keyLower = iconKey.toLowerCase();
  if (keyLower.includes('droplet') || keyLower.includes('water') || label.includes('water') || category === 'water') {
    return <Droplet size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('trash') || keyLower.includes('garbage') || label.includes('trash') || category === 'garbage') {
    return <Trash2 size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('wind') || keyLower.includes('brush') || label.includes('sweep') || label.includes('broom')) {
    return <Wind size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('bath') || label.includes('bath') || label.includes('toilet') || label.includes('washroom')) {
    return <Bath size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('utensil') || keyLower.includes('dish') || label.includes('dish') || label.includes('plate')) {
    return <UtensilsCrossed size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('shirt') || keyLower.includes('laund') || label.includes('laund') || label.includes('cloth')) {
    return <Shirt size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('cart') || keyLower.includes('bag') || keyLower.includes('groc') || label.includes('groc') || label.includes('shop')) {
    return <ShoppingCart size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('home') || label.includes('home') || label.includes('room')) {
    return <Home size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('flame') || label.includes('gas') || label.includes('cook')) {
    return <Flame size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('zap') || label.includes('electr') || label.includes('power')) {
    return <Zap size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('bed') || label.includes('bed') || label.includes('sheet')) {
    return <Bed size={size} color={color} strokeWidth={2.2} />;
  }
  if (keyLower.includes('coffee') || label.includes('tea') || label.includes('breakfast')) {
    return <Coffee size={size} color={color} strokeWidth={2.2} />;
  }

  // Fallback
  return <CheckCircle2 size={size} color={color} strokeWidth={2.2} />;
};

export const getCategoryIcon = renderQuickPickIcon;

export const EditQuickPicksModal: React.FC<EditQuickPicksModalProps> = ({
  visible,
  onClose,
  presets,
  onAdd,
  onDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'water' | 'garbage' | 'chore' | 'custom'>('chore');
  const [selectedIconName, setSelectedIconName] = useState('Wind');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddPreset = async () => {
    if (!newLabel.trim()) {
      setError('Please enter a short chip label (e.g. "Balcony")');
      return;
    }
    if (!newTitle.trim()) {
      setError('Please enter the full Kaam title (e.g. "Mop balcony floor")');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onAdd({
        label: newLabel.trim(),
        title: newTitle.trim(),
        category: newCategory,
        icon: selectedIconName,
      });
      setNewLabel('');
      setNewTitle('');
      setNewCategory('chore');
      setSelectedIconName('Wind');
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add preset');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (preset: QuickPickPreset) => {
    Alert.alert(
      'Remove Preset',
      `Are you sure you want to remove "${preset.label}" from your flat's Quick Picks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(preset.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete preset');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Customize Quick Picks">
      <Text style={[Typography.Caption, styles.modalSub]}>
        Manage common chore templates for everyone in your flat.
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Existing Presets List */}
      <ScrollView style={styles.presetList} showsVerticalScrollIndicator={false}>
        {presets.map((preset, idx) => (
          <View key={preset.id || idx} style={styles.presetRow}>
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

            {presets.length > 1 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDelete(preset)}
                style={styles.deleteBtn}
              >
                <Trash2 size={16} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add New Preset Form */}
      {isAdding ? (
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
            {ICON_OPTIONS.map((opt) => {
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
            {CATEGORIES.map((cat) => (
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
              onPress={() => {
                setIsAdding(false);
                setError('');
              }}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Preset"
              size="sm"
              loading={loading}
              onPress={handleAddPreset}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsAdding(true)}
          style={styles.addNewButton}
        >
          <Plus size={16} color={Colors.navy} strokeWidth={2.4} />
          <Text style={styles.addNewButtonText}>Add Custom Preset</Text>
        </TouchableOpacity>
      )}

      <Button
        title="Done"
        onPress={onClose}
        style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalSub: {
    color: Colors.grayBlack,
    marginBottom: Spacing.md,
  },
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
  presetList: {
    maxHeight: 280,
    marginBottom: Spacing.md,
  },
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
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderStyle: 'dashed',
  },
  addNewButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.navy,
  },
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  categoryPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.deepNavy,
  },
  categoryPillTextActive: {
    color: Colors.white,
  },
  formActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
});
