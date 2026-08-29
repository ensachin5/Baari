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
import { Colors, Typography, Spacing } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { ArrowLeft } from 'lucide-react-native';

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
          <Text style={Typography.H1}>Join with Invite Code</Text>
          <Text style={[Typography.BodySmall, styles.subtitle]}>
            Enter the 6-character code given by your flat admin to join their group
          </Text>
        </View>

        <Input
          label="Invite Code"
          placeholder="e.g. 7X9K2A"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={10}
          error={error}
          autoFocus
        />

        <Button
          title="Join Flat"
          onPress={handleJoin}
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
  submitBtn: {
    marginTop: Spacing.md,
  },
});
