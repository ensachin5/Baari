import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  Coffee,
  CheckCircle2,
} from 'lucide-react-native';

import { PresetItemRow } from './edit-quickpicks/PresetItemRow';
import { AddPresetForm } from './edit-quickpicks/AddPresetForm';

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

  const handleDelete = useCallback((preset: QuickPickPreset) => {
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
  }, [onDelete]);

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
          <PresetItemRow
            key={preset.id || idx}
            preset={preset}
            canDelete={presets.length > 1}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      {/* Add New Preset Form */}
      {isAdding ? (
        <AddPresetForm
          newLabel={newLabel}
          setNewLabel={setNewLabel}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          selectedIconName={selectedIconName}
          setSelectedIconName={setSelectedIconName}
          iconOptions={ICON_OPTIONS}
          categories={CATEGORIES}
          loading={loading}
          onCancel={() => {
            setIsAdding(false);
            setError('');
          }}
          onSubmit={handleAddPreset}
        />
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
});
