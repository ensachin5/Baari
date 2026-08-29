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

export default function CreateFlatScreen() {
  const router = useRouter();
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name for your flat or home');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await api.post('/api/flats', { name: name.trim() });
      if (data?.flat) {
        setActiveFlat({
          id: data.flat.id,
          name: data.flat.name,
          inviteCode: data.flat.inviteCode,
          role: 'admin',
        });
        router.replace('/(tabs)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create flat');
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
          <Text style={Typography.H1}>Name your Flat</Text>
          <Text style={[Typography.BodySmall, styles.subtitle]}>
            Give your place a recognizable name e.g., "Flat 402", "Sunshine Residency", or "The Boys PG"
          </Text>
        </View>

        <Input
          label="Flat / Home Name"
          placeholder="e.g., Flat 402"
          value={name}
          onChangeText={setName}
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
  submitBtn: {
    marginTop: Spacing.md,
  },
});
