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
import { ArrowLeft, Users } from 'lucide-react-native';

export default function JoinFlatScreen() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter the 6-character invite code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.post('/api/flats/join', {
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      if (data?.flat) {
        setActiveFlat({
          id: data.flat.id,
          name: data.flat.name,
          type: data.flat.type,
          inviteCode: data.flat.inviteCode,
          role: 'member',
        });
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid invite code. Please check with your flatmate.');
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
              Join with <Text style={styles.titleBlue}>Invite Code</Text>
            </Text>
            <Text style={styles.subtitle}>
              Enter the 6-character code given by your flat admin to join their group.
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
            <Text style={styles.sectionLabel}>Invite Code</Text>
            <View style={styles.inputContainer}>
              <Users size={20} color="#94A3B8" strokeWidth={2} />
              <View style={styles.inputDivider} />
              <TextInput
                value={inviteCode}
                onChangeText={(text) => {
                  setInviteCode(text.toUpperCase());
                  if (error) setError('');
                }}
                maxLength={10}
                placeholder="E.g. 7X9K2A"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                style={styles.inputField}
                autoFocus
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleJoin}
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.submitButtonText}>Joining Flat...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Join Flat</Text>
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
    fontWeight: '700',
    color: '#071A4B',
    letterSpacing: 1.5,
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
