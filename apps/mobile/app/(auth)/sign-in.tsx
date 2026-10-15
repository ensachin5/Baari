import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button } from '../../components/ui/Button';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';

export default function SignInScreen() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      const callbackURL = Linking.createURL('/');
      const res = await authClient.signIn.social({
        provider: 'google',
        callbackURL,
      });
      if (res?.error) {
        setError(res.error.message || 'Google sign-in failed');
        setGoogleLoading(false);
        return;
      }
      await handlePostAuth(res?.data);
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePostAuth = async (data?: any) => {
    await syncSessionToStore(data);
    const sessionToken = useSession.getState().token;
    if (!sessionToken) return;

    try {
      const res = await api.get<{ flat: any }>('/api/flats/me');
      if (res?.flat) {
        useSession.getState().setActiveFlat(res.flat);
      } else {
        useSession.getState().setActiveFlat(null);
      }
      fetchUserProfile().catch(() => {});
      router.replace('/(tabs)/home');
    } catch (err: any) {
      try {
        const { activeFlat } = await fetchUserProfile();
        useSession.getState().setActiveFlat(activeFlat || null);
        router.replace('/(tabs)/home');
      } catch {
        router.replace('/(tabs)/home');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Branding Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/baari-logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={Typography.Display}>Baari</Text>
          <Text style={[Typography.BodySmall, styles.tagline]}>
            Coordinate flat chores, expenses & communication in one place
          </Text>
        </View>

        {/* Global Error Banner */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Google Authentication Box */}
        <View style={styles.authContainer}>
          <Button
            title="Continue with Google"
            variant="outline"
            size="lg"
            icon={<GoogleIcon size={22} />}
            onPress={handleGoogleSignIn}
            loading={googleLoading}
            style={styles.googleButton}
          />

          <Text style={styles.subtext}>
            Sign in or get started instantly with your Google account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
    color: Colors.grayBlack,
    lineHeight: 20,
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
  authContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    width: '100%',
  },
  subtext: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    textAlign: 'center',
    marginTop: Spacing.lg,
    maxWidth: 260,
    lineHeight: 18,
  },
});
