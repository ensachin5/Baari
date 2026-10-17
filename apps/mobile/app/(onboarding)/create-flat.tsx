import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { ArrowLeft, Building2, Hotel } from 'lucide-react-native';
import { HomeIcon } from '../../components/ui/HomeIcon';

type PlaceType = 'flat' | 'pg' | 'hostel';

const PLACE_TYPES: { id: PlaceType; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'flat', label: 'Flat', icon: HomeIcon },
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
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={24} color="#071A4B" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Heading */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Create a <Text style={styles.titleBlue}>Place</Text>
            </Text>
            <Text style={styles.subtitle}>
              Choose your space type and give it a recognizable name.
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formSection}>
            {/* Place Type */}
            <Text style={styles.sectionLabel}>Place Type</Text>
            <View style={styles.segmentedContainer}>
              {PLACE_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = placeType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPlaceType(item.id);
                      if (error) setError('');
                    }}
                    style={[
                      styles.segmentButton,
                      isSelected && styles.segmentButtonSelected,
                    ]}
                  >
                    <Icon
                      size={18}
                      color={isSelected ? '#0866F5' : '#727D98'}
                      strokeWidth={isSelected ? 2.4 : 2}
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

            {/* Flat Name */}
            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>{getLabel()}</Text>
            <View style={styles.inputContainer}>
              <HomeIcon size={20} color="#94A3B8" strokeWidth={2} />
              <View style={styles.inputDivider} />
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
                placeholder={getPlaceholder()}
                placeholderTextColor="#94A3B8"
                style={styles.inputField}
                autoFocus
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleCreate}
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitButtonText}>Creating Place...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Create & Generate Invite Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 26,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#071A4B',
    letterSpacing: -0.5,
  },
  titleBlue: {
    color: '#0866F5',
  },
  subtitle: {
    fontSize: 14,
    color: '#727D98',
    marginTop: 6,
    lineHeight: 20,
  },
  formSection: {
    width: '100%',
  },
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#071A4B',
    marginBottom: 10,
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F6FAFE',
    borderWidth: 1,
    borderColor: '#DCEBFA',
    borderRadius: 18,
    padding: 6,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  segmentButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0866F5',
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: '#0866F5',
    fontWeight: '700',
  },
  segmentTextUnselected: {
    color: '#727D98',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCEBFA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '500',
    color: '#071A4B',
  },
  submitButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#0866F5',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
});
