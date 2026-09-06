import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import * as Linking from 'expo-linking';
import { useSession } from '../../store/session';

export default function SignInScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePostAuth = async (data?: any) => {
    // 1. Sync session token into Zustand store & SecureStore
    await syncSessionToStore(data);

    // 2. Check if user has an active flat via GET /api/flats/me
    try {
      const res = await api.get<{ flat: any }>('/api/flats/me');
      if (res?.flat) {
        useSession.getState().setActiveFlat(res.flat);
        fetchUserProfile().catch(() => {});
        router.replace('/(tabs)/home');
      } else {
        useSession.getState().setActiveFlat(null);
        router.replace('/(onboarding)/choose');
      }
    } catch {
      // Fallback: check profile
      const { activeFlat } = await fetchUserProfile();
      if (activeFlat) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(onboarding)/choose');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      const callbackURL = Linking.createURL('/');
      await authClient.signIn.social({
        provider: 'google',
        callbackURL,
      });
      // After OAuth redirect returns, sync session and check flat
      await handlePostAuth();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Branding Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/baari-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={Typography.Display}>Baari</Text>
          <Text style={[Typography.BodySmall, styles.tagline]}>
            Coordinate flat chores, expenses & communication in one place
          </Text>
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Google Sign In */}
        <Button
          title="Continue with Google"
          variant="outline"
          size="lg"
          icon={<GoogleIcon size={20} />}
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          style={styles.googleButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
    color: Colors.grayBlack,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
  },
  googleButton: {
    width: '100%',
  },
});
