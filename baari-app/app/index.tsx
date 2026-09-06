import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../store/session';
import { api, API_BASE_URL } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../lib/theme';
import { RotateCw, AlertTriangle, LogOut } from 'lucide-react-native';

const MAX_TOTAL_WAIT_MS = 45000; // Hard max wait: 45 seconds
const PER_REQUEST_TIMEOUT_MS = 10000; // 10s per fetch attempt
const MAX_ATTEMPTS = 8; // Max retries before showing error

type StartupStatus = 'initializing' | 'waking' | 'resolving' | 'error';

export default function IndexScreen() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const isHydrated = useSession((state) => state.isHydrated);
  const setActiveFlat = useSession((state) => state.setActiveFlat);
  const logout = useSession((state) => state.logout);

  const [status, setStatus] = useState<StartupStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slowServerHint, setSlowServerHint] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);

  // 1. Slow server hint after 3.5 seconds of waiting
  useEffect(() => {
    if (status === 'waking' || status === 'initializing') {
      const timer = setTimeout(() => {
        setSlowServerHint(true);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setSlowServerHint(false);
    }
  }, [status]);

  // 2. Ping backend with timeout and exponential backoff
  const pingBackend = async (
    attempt: number,
    totalStartTime: number,
    signal: AbortSignal
  ): Promise<boolean> => {
    const attemptStartTime = Date.now();
    const elapsedTotal = Math.round((attemptStartTime - totalStartTime) / 1000);
    console.log(
      `[WakeUp] Attempt ${attempt}/${MAX_ATTEMPTS} — Pinging ${API_BASE_URL}/health-ping (total elapsed: ${elapsedTotal}s)...`
    );

    const requestController = new AbortController();
    const timeoutId = setTimeout(
      () => requestController.abort(),
      PER_REQUEST_TIMEOUT_MS
    );

    const onParentAbort = () => requestController.abort();
    signal.addEventListener('abort', onParentAbort);

    try {
      const res = await fetch(`${API_BASE_URL}/health-ping`, {
        method: 'GET',
        signal: requestController.signal,
      });
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onParentAbort);

      const durationMs = Date.now() - attemptStartTime;
      if (res.ok) {
        console.log(
          `[WakeUp] Attempt ${attempt} SUCCEEDED (status: ${res.status}, duration: ${durationMs}ms)`
        );
        return true;
      } else {
        console.warn(
          `[WakeUp] Attempt ${attempt} returned non-200 status: ${res.status} in ${durationMs}ms`
        );
        return false;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onParentAbort);

      const durationMs = Date.now() - attemptStartTime;
      const isTimeout =
        err?.name === 'AbortError' || requestController.signal.aborted;
      if (isTimeout) {
        console.warn(
          `[WakeUp] Attempt ${attempt} TIMED OUT after ${durationMs}ms`
        );
      } else {
        console.warn(
          `[WakeUp] Attempt ${attempt} FAILED: [${err?.name || 'Error'}] ${
            err?.message || 'Unknown network error'
          } in ${durationMs}ms`
        );
      }
      return false;
    }
  };

  // 3. Main wake-up and routing sequence
  const startWakeUpAndResolve = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const overallController = new AbortController();
    abortControllerRef.current = overallController;

    setStatus('waking');
    setErrorMessage(null);

    const totalStartTime = Date.now();
    let isServerReady = false;

    console.log(
      `[WakeUp] Starting backend wake-up cycle (max timeout: ${
        MAX_TOTAL_WAIT_MS / 1000
      }s, max attempts: ${MAX_ATTEMPTS})`
    );

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (overallController.signal.aborted) break;

      setAttemptCount(attempt);
      const success = await pingBackend(
        attempt,
        totalStartTime,
        overallController.signal
      );

      if (success) {
        isServerReady = true;
        break;
      }

      const totalElapsed = Date.now() - totalStartTime;
      if (totalElapsed >= MAX_TOTAL_WAIT_MS || attempt === MAX_ATTEMPTS) {
        console.error(
          `[WakeUp] Exceeded budget (total elapsed: ${Math.round(
            totalElapsed / 1000
          )}s, attempts: ${attempt}). Stopping retries.`
        );
        break;
      }

      const backoffDelay = Math.min(1000 * attempt, 4000);
      console.log(`[WakeUp] Waiting ${backoffDelay}ms before retry ${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }

    if (!isServerReady) {
      isRunningRef.current = false;
      setStatus('error');
      setErrorMessage(
        "We're having trouble reaching the server. It may still be starting up or your connection was interrupted."
      );
      return;
    }

    // 4. Server is ready -> resolve active flat
    setStatus('resolving');
    console.log('[WakeUp] Server is awake. Resolving user flat via GET /api/flats/me...');

    try {
      const res = await api.get<{ flat: any }>('/api/flats/me');
      if (res?.flat) {
        console.log(
          `[WakeUp] Active flat resolved: "${res.flat.name}" (id: ${res.flat.id}). Redirecting to /(tabs)/home...`
        );
        setActiveFlat(res.flat);
        router.replace('/(tabs)/home');
      } else {
        console.log('[WakeUp] No active flat found. Redirecting to /(onboarding)/choose...');
        setActiveFlat(null);
        router.replace('/(onboarding)/choose');
      }
    } catch (apiErr: any) {
      console.error(
        `[WakeUp] Failed to resolve flat via /api/flats/me: [${apiErr?.status}] ${apiErr?.message}`
      );
      if (apiErr?.status === 401) {
        console.log('[WakeUp] 401 Unauthorized — Redirecting to /(auth)/sign-in...');
        await logout();
        router.replace('/(auth)/sign-in');
      } else if (apiErr?.status === 404) {
        console.log('[WakeUp] 404 Not Found — Redirecting to /(onboarding)/choose...');
        setActiveFlat(null);
        router.replace('/(onboarding)/choose');
      } else {
        setStatus('error');
        setErrorMessage(
          apiErr?.message || 'Failed to load flat space. Please try again.'
        );
      }
    } finally {
      isRunningRef.current = false;
    }
  }, [router, setActiveFlat, logout]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!token) {
      console.log('[WakeUp] No stored session token. Redirecting to /(auth)/sign-in...');
      router.replace('/(auth)/sign-in');
      return;
    }

    startWakeUpAndResolve();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isHydrated, token, startWakeUpAndResolve, router]);

  const handleRetry = () => {
    startWakeUpAndResolve();
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo */}
        <Image
          source={require('../assets/baari-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {status === 'error' ? (
          /* Error State */
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <AlertTriangle size={24} color="#DC2626" />
            </View>

            <Text style={styles.errorTitle}>
              We're having trouble reaching the server
            </Text>
            <Text style={styles.errorDescription}>
              {errorMessage ||
                'The backend server is taking longer than usual to respond. Please check your internet connection or try again.'}
            </Text>

            <View style={styles.actionContainer}>
              <Button
                title="Try again"
                variant="primary"
                size="md"
                onPress={handleRetry}
                icon={<RotateCw size={16} color={Colors.white} />}
                style={styles.retryButton}
              />

              <TouchableOpacity
                onPress={handleSignOut}
                activeOpacity={0.7}
                style={styles.signOutButton}
              >
                <LogOut size={13} color={Colors.mutedNavy} />
                <Text style={styles.signOutText}>
                  Sign in with a different account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Normal Waking / Loading State */
          <View style={styles.loadingContainer}>
            <Text style={Typography.H1}>Baari</Text>
            <Text style={[Typography.BodySmall, styles.subtitle]}>
              {status === 'resolving'
                ? 'Loading your flat space...'
                : 'Setting up your flat space...'}
            </Text>

            <ActivityIndicator
              size="large"
              color={Colors.navy}
              style={styles.spinner}
            />

            {slowServerHint && (
              <View style={styles.hintBadge}>
                <Text style={styles.hintText}>
                  Waking up backend server (attempt {attemptCount})... thank you for your patience! ✨
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  subtitle: {
    color: Colors.grayBlack,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  spinner: {
    marginTop: Spacing.xl,
  },
  hintBadge: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.offWhite,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hintText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorCard: {
    alignItems: 'center',
    width: '100%',
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.H2,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  errorDescription: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  actionContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  retryButton: {
    width: '100%',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  signOutText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
  },
});
