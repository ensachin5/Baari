import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { ArrowLeft, House, Building2, Hotel } from 'lucide-react-native';

type PlaceType = 'flat' | 'pg' | 'hostel';

const PLACE_TYPES: { id: PlaceType; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'flat', label: 'Flat', icon: House },
  { id: 'pg', label: 'PG', icon: Building2 },
  { id: 'hostel', label: 'Hostel', icon: Hotel },
];

export default function CreateFlatScreen() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [placeType, setPlaceType] = useState<PlaceType>('flat');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getPlaceholder = () => {
    switch (placeType) {
      case 'pg':
        return 'e.g., Sai 105 or Stanza Room 3';
      case 'hostel':
        return 'e.g., Ganga Hostel Room 12';
      case 'flat':
      default:
        return 'e.g., Flat 402 or Green Villa';
    }
  };

  const getLabel = () => {
    switch (placeType) {
      case 'pg':
        return 'PG / Room Name';
      case 'hostel':
        return 'Hostel / Room Name';
      case 'flat':
      default:
        return 'Flat / Home Name';
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(`Please enter a name for your ${placeType === 'flat' ? 'flat' : placeType.toUpperCase()}`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.post('/api/flats', {
        name: name.trim(),
        type: placeType,
      });

      if (data?.flat) {
        setActiveFlat({
          id: data.flat.id,
          name: data.flat.name,
          type: data.flat.type || placeType,
          inviteCode: data.flat.inviteCode,
          role: 'admin',
        });
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create place');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowLeft size={24} color={Colors.navy} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={Typography.H1}>Create a Place</Text>
          <Text style={[Typography.BodySmall, styles.subtitle]}>
            Choose your space type and give it a recognizable name.
          </Text>
        </View>

        {/* Place Type Selector */}
        <View style={styles.typeSection}>
          <Text style={[Typography.BodySmallMedium, styles.typeSectionLabel]}>Place Type</Text>
          <View style={styles.segmentedControl}>
            {PLACE_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = placeType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setPlaceType(item.id)}
                  style={[
                    styles.segmentButton,
                    isSelected && styles.segmentButtonSelected,
                  ]}
                >
                  <Icon
                    size={18}
                    color={isSelected ? Colors.navy : Colors.grayBlack}
                    strokeWidth={isSelected ? 2.5 : 2}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      isSelected ? styles.segmentTextSelected : styles.segmentTextUnselected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Name Input */}
        <Input
          label={getLabel()}
          placeholder={getPlaceholder()}
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError('');
          }}
          error={error}
          autoFocus
        />

        <Button
          title="Create & Generate Invite Code"
          onPress={handleCreate}
          loading={loading}
          style={styles.submitBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + Spacing.lg,
  },
  backButton: {
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  typeSection: {
    marginBottom: Spacing.lg,
  },
  typeSectionLabel: {
    marginBottom: Spacing.xs,
    color: Colors.black,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  segmentButtonSelected: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.navy,
    shadowColor: Colors.deepNavy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
  },
  segmentTextSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
  },
  segmentTextUnselected: {
    fontFamily: 'Inter_500Medium',
    color: Colors.grayBlack,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
});
