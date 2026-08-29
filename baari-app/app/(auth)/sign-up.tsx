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
import { authClient, syncSessionToStore } from '../../lib/auth-client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePostAuth = async (data?: any) => {
    await syncSessionToStore(data);
    // New user → always go to onboarding
    router.replace('/(onboarding)/choose');
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Registration failed');
        return;
      }

      await handlePostAuth(result.data);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await authClient.signIn.social({
        provider: 'google',
      });
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
        <View style={styles.header}>
          <Text style={Typography.H1}>Create your account</Text>
          <Text style={[Typography.BodySmall, styles.subtitle]}>
            Join Baari to manage flat tasks and split expenses seamlessly
          </Text>
        </View>

        {/* Google Sign Up */}
        <Button
          title="Continue with Google"
          variant="outline"
          onPress={handleGoogleSignUp}
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

        <Input
          label="Full Name"
          placeholder="Sachin Yadav"
          value={name}
          onChangeText={(text) => { setName(text); setError(''); }}
        />

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
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          isPassword
        />

        <Button
          title="Create Account"
          onPress={handleSignUp}
          loading={loading}
          disabled={googleLoading}
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text style={Typography.BodySmall}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()} disabled={loading || googleLoading}>
            <Text style={[Typography.BodySmallMedium, styles.signInLink]}>
              Sign In
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
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    marginTop: Spacing.xs,
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
  submitBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInLink: {
    color: Colors.navy,
    fontWeight: '700',
  },
});
