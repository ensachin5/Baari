import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import * as Linking from 'expo-linking';
import { useSession } from '../../store/session';

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePostAuth = async (data?: any) => {
    // Sync the Better Auth session into Zustand store
    await syncSessionToStore(data);
    // Fetch profile + flat membership
    const { activeFlat } = await fetchUserProfile();
    if (activeFlat) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(onboarding)/choose');
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Invalid email or password');
        return;
      }

      await handlePostAuth(result.data);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
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
      // After OAuth redirect returns, sync session
      await handlePostAuth();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>B</Text>
          </View>
          <Text style={Typography.Display}>Baari</Text>
          <Text style={[Typography.BodySmall, styles.tagline]}>
            Coordinate flat chores, expenses & communication in one place
          </Text>
        </View>

        {/* Google Sign In */}
        <Button
          title="Continue with Google"
          variant="outline"
          onPress={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading}
          style={styles.googleButton}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={[Typography.Caption, styles.dividerText]}>OR WITH EMAIL</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <Input
          label="Email Address"
          placeholder="your.email@example.com"
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          isPassword
        />

        <Button
          title="Sign In"
          onPress={handleSignIn}
          loading={loading}
          disabled={googleLoading}
          style={styles.signInButton}
        />

        {/* Switch to Sign Up */}
        <View style={styles.footerRow}>
          <Text style={Typography.BodySmall}>New to Baari? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} disabled={loading || googleLoading}>
            <Text style={[Typography.BodySmallMedium, styles.signUpLink]}>
              Create an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingVertical: Spacing.xxxl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.deepNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.white,
  },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
  },
  googleButton: {
    marginBottom: Spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    color: Colors.grayBlack,
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  signInButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpLink: {
    color: Colors.navy,
    fontWeight: '700',
  },
});
