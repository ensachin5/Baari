wimport React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('sign-in');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting
  /*
  const [googleLoading, setGoogleLoading] = useState(false);
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      const callbackURL = Linking.createURL('/');
      await authClient.signIn.social({
        provider: 'google',
        callbackURL,
      });
      await handlePostAuth();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };
  */

  const handlePostAuth = async (data?: any) => {
    await syncSessionToStore(data);
    const sessionToken = useSession.getState().token;
    if (!sessionToken) return;

    try {
      const res = await api.get<{ flat: any }>('/api/flats/me');
      if (res?.flat) {
        useSession.getState().setActiveFlat(res.flat);
        fetchUserProfile().catch(() => { });
        router.replace('/(tabs)/home');
      } else {
        useSession.getState().setActiveFlat(null);
        router.replace('/(onboarding)/choose');
      }
    } catch (err: any) {
      if (err?.status === 401) return;
      try {
        const { activeFlat } = await fetchUserProfile();
        if (activeFlat) {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/(onboarding)/choose');
        }
      } catch {
        router.replace('/(onboarding)/choose');
      }
    }
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        setError(res.error.message || 'Failed to sign up');
        setLoading(false);
        return;
      }
      // autoSignIn is true — session is created immediately, go straight to onboarding
      await handlePostAuth(res.data);
    } catch (err: any) {
      setError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (res.error) {
        setError(res.error.message || 'Invalid email or password');
        setLoading(false);
        return;
      }
      await handlePostAuth(res.data);
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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

          {/* MODE: SIGN IN */}
          {mode === 'sign-in' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Welcome back</Text>

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <Button
                title="Log in"
                variant="primary"
                size="lg"
                onPress={handleSignIn}
                loading={loading}
                style={styles.actionButton}
              />

              {/* TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting */}
              {/*
              <Button
                title="Continue with Google"
                variant="outline"
                size="lg"
                icon={<GoogleIcon size={20} />}
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                style={styles.googleButton}
              />
              */}

              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setMode('sign-up');
                }}
                style={styles.switchModeButton}
              >
                <Text style={styles.switchModeText}>
                  Don't have an account? <Text style={styles.switchModeHighlight}>Create account</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* MODE: SIGN UP */}
          {mode === 'sign-up' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Create an account</Text>

              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <Button
                title="Create account"
                variant="primary"
                size="lg"
                onPress={handleSignUp}
                loading={loading}
                style={styles.actionButton}
              />

              {/* TEMP: Google sign-in disabled while fixing WebKit cookie issue — re-enable by uncommenting */}
              {/*
              <Button
                title="Continue with Google"
                variant="outline"
                size="lg"
                icon={<GoogleIcon size={20} />}
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                style={styles.googleButton}
              />
              */}

              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setMode('sign-in');
                }}
                style={styles.switchModeButton}
              >
                <Text style={styles.switchModeText}>
                  Already have an account? <Text style={styles.switchModeHighlight}>Log in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: Spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 72,
    height: 72,
    marginBottom: Spacing.sm,
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
  formContainer: {
    width: '100%',
  },
  formTitle: {
    ...Typography.H2,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  actionButton: {
    width: '100%',
    marginTop: Spacing.md,
  },
  googleButton: {
    width: '100%',
    marginTop: Spacing.md,
  },
  switchModeButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  switchModeText: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
  },
  switchModeHighlight: {
    ...Typography.BodySmallMedium,
    color: Colors.navy,
  },
});
