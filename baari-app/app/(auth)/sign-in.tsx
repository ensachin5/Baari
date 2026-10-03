import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import * as Linking from 'expo-linking';
import { useSession } from '../../store/session';

type AuthMode = 'sign-in' | 'sign-up' | 'otp';

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('sign-in');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  // References for 6-digit OTP input boxes
  const otpInputRefs = useRef<(TextInput | null)[]>([]);

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
        fetchUserProfile().catch(() => {});
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
      try {
        await authClient.emailOtp.sendVerificationOtp({
          email: email.trim().toLowerCase(),
          type: 'email-verification',
        });
      } catch (_) {}
      setMode('otp');
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
        const errMsg = res.error.message || '';
        if (
          errMsg.toLowerCase().includes('email not verified') ||
          errMsg.toLowerCase().includes('verify your email') ||
          res.error.code === 'EMAIL_NOT_VERIFIED'
        ) {
          try {
            await authClient.emailOtp.sendVerificationOtp({
              email: email.trim().toLowerCase(),
              type: 'email-verification',
            });
          } catch (_) {}
          setMode('otp');
          setLoading(false);
          return;
        }
        setError(errMsg || 'Invalid email or password');
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

  const handleOtpChange = (text: string, index: number) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    if (cleanText.length > 1) {
      const digits = cleanText.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      if (digits.length === 6) {
        otpInputRefs.current[5]?.focus();
      }
      return;
    }

    newOtp[index] = cleanText;
    setOtp(newOtp);

    if (cleanText && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: code,
      });
      if (res.error) {
        setError(res.error.message || 'Invalid or expired code');
        setLoading(false);
        return;
      }
      await handlePostAuth(res.data);
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    setError('');
    setResendMessage('');
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'email-verification',
      });
      if (res.error) {
        setError(res.error.message || 'Failed to send code');
      } else {
        setResendMessage('Verification code sent!');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send code');
    } finally {
      setResendLoading(false);
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

          {/* Resend Success Message */}
          {resendMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{resendMessage}</Text>
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

          {/* MODE: OTP ENTRY */}
          {mode === 'otp' && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Verify your email</Text>
              <Text style={styles.otpSubtitle}>
                We sent a 6-digit verification code to {'\n'}
                <Text style={styles.otpEmailText}>{email}</Text>
              </Text>

              <View style={styles.otpInputRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={idx === 0 ? 6 : 1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <Button
                title="Verify Code"
                variant="primary"
                size="lg"
                onPress={handleVerifyOtp}
                loading={loading}
                style={styles.actionButton}
              />

              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={resendLoading}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? 'Sending...' : "Didn't receive a code? Resend code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setError('');
                  setResendMessage('');
                  setMode('sign-in');
                }}
                style={styles.switchModeButton}
              >
                <Text style={styles.switchModeText}>
                  ← Back to sign in
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
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#166534',
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
  otpSubtitle: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  otpEmailText: {
    ...Typography.BodySmallMedium,
    color: Colors.navy,
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.navy,
    backgroundColor: Colors.white,
  },
  otpBoxFilled: {
    borderColor: Colors.navy,
    backgroundColor: '#F8FAFC',
  },
  resendButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  resendText: {
    ...Typography.Caption,
    color: Colors.navy,
    fontWeight: '600',
  },
});
