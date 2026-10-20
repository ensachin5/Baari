import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isSmallDevice = windowHeight < 720;
  const isLargeDevice = windowHeight > 880;
  const isTablet = windowWidth >= 600;
  const containerWidth = isTablet ? 420 : windowWidth;

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
        router.replace('/(tabs)/home');
      } else {
        useSession.getState().setActiveFlat(null);
        router.replace('/(onboarding)/choose');
      }
      fetchUserProfile().catch(() => {});
    } catch {
      try {
        const { activeFlat } = await fetchUserProfile();
        if (activeFlat) {
          useSession.getState().setActiveFlat(activeFlat);
          router.replace('/(tabs)/home');
        } else {
          useSession.getState().setActiveFlat(null);
          router.replace('/(onboarding)/choose');
        }
      } catch {
        router.replace('/(onboarding)/choose');
      }
    }
  };

  const topButtonInset = Math.max(insets.top + (Platform.OS === 'web' ? 10 : 8), 16);
  const bottomPadding = Math.max(
    insets.bottom + (isSmallDevice ? 8 : isLargeDevice ? 16 : 12),
    16
  );

  return (
    <View style={[styles.rootContainer, isTablet && styles.rootContainerTablet]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View
        style={[
          styles.screenContainer,
          isTablet && styles.screenContainerTablet,
          { width: containerWidth },
        ]}
      >
        {/* Top-Left Circular Blue Back Arrow Button (Overlaps the main page artwork) */}
        <TouchableOpacity
          onPress={() => router.replace('/splash')}
          activeOpacity={0.8}
          style={[
            styles.backButtonCircle,
            { top: topButtonInset, left: 16 },
          ]}
          accessibilityLabel="Go back to splash screen"
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.6} />
        </TouchableOpacity>

        {/* Global Error Banner */}
        {error ? (
          <View style={[styles.errorContainer, { top: topButtonInset + 48 }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Top: Authentic Logo & Household Scene Artwork (Full-bleed 100% width edge-to-edge) */}
        <View style={styles.heroSection}>
          <Image
            source={require('../../assets/signin-hero.png')}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition="top center"
            priority="high"
          />
        </View>

        {/* Bottom Half: Crisp Typography, Feature Badges, Google CTA & Legal Notice */}
        <View
          style={[
            styles.bottomSection,
            isSmallDevice && styles.bottomSectionSmall,
            isLargeDevice && styles.bottomSectionLarge,
            { paddingBottom: bottomPadding },
          ]}
        >
          {/* Main Headline */}
          <View style={styles.headlineWrapper}>
            <Text style={[styles.headlineNavy, isSmallDevice && styles.headlineNavySmall]}>
              Share Chores
            </Text>
            <Text style={[styles.headlineBlue, isSmallDevice && styles.headlineBlueSmall]}>
              Live Better
            </Text>
          </View>

          {/* 3 Feature Badges */}
          <View style={[styles.featureRow, isSmallDevice && styles.featureRowSmall]}>
            {/* Feature 1: Track Chores */}
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, isSmallDevice && styles.featureIconBoxSmall]}>
                <Svg width={isSmallDevice ? 20 : 23} height={isSmallDevice ? 20 : 23} viewBox="0 0 24 24">
                  <Rect x={4} y={3} width={16} height={18} rx={4} fill="#0866F5" />
                  <Path d="M8.5 2H15.5C16.05 2 16.5 2.45 16.5 3V4H7.5V3C7.5 2.45 7.95 2 8.5 2Z" fill="#071A4B" />
                  <Path d="M8 12.5L10.5 15L16 9" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={[styles.featureLabel, isSmallDevice && styles.featureLabelSmall]}>
                Track{'\n'}Chores
              </Text>
            </View>

            {/* Feature 2: Split Expenses */}
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, isSmallDevice && styles.featureIconBoxSmall]}>
                <Text style={[styles.rupeeIcon, isSmallDevice && styles.rupeeIconSmall]}>₹</Text>
              </View>
              <Text style={[styles.featureLabel, isSmallDevice && styles.featureLabelSmall]}>
                Split{'\n'}Expenses
              </Text>
            </View>

            {/* Feature 3: Roommate Chat */}
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBox, isSmallDevice && styles.featureIconBoxSmall]}>
                <Svg width={isSmallDevice ? 20 : 23} height={isSmallDevice ? 20 : 23} viewBox="0 0 24 24">
                  <Path
                    d="M12 3C6.48 3 2 6.81 2 11.5C2 14.16 3.45 16.51 5.73 18.01C5.47 19.35 4.8 20.49 4.76 20.55C4.55 20.89 4.68 21.33 5.03 21.52C5.23 21.62 5.45 21.64 5.66 21.58C7.58 20.98 9.18 19.92 10.15 19.16C10.75 19.26 11.37 19.32 12 19.32C17.52 19.32 22 15.51 22 10.82C22 6.12 17.52 3 12 3Z"
                    fill="#0866F5"
                  />
                  <Circle cx={8} cy={11.5} r={1.3} fill="#FFFFFF" />
                  <Circle cx={12} cy={11.5} r={1.3} fill="#FFFFFF" />
                  <Circle cx={16} cy={11.5} r={1.3} fill="#FFFFFF" />
                </Svg>
              </View>
              <Text style={[styles.featureLabel, isSmallDevice && styles.featureLabelSmall]}>
                Roommate{'\n'}Chat
              </Text>
            </View>
          </View>

          {/* Continue with Google Button */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            accessibilityLabel="Continue with Google"
            style={[styles.googleButton, isSmallDevice && styles.googleButtonSmall]}
          >
            {/* White circular badge with Google G */}
            <View style={[styles.googleBadge, isSmallDevice && styles.googleBadgeSmall]}>
              <GoogleIcon size={isSmallDevice ? 16 : 18} />
            </View>

            {/* Label */}
            <Text style={[styles.googleButtonText, isSmallDevice && styles.googleButtonTextSmall]}>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>

            {/* Right Arrow */}
            <View style={styles.arrowBadge}>
              {googleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ArrowRight size={isSmallDevice ? 18 : 20} color="#FFFFFF" strokeWidth={2.4} />
              )}
            </View>
          </TouchableOpacity>

          {/* Legal Notice */}
          <View style={styles.legalSection}>
            <Text style={styles.legalNoticeText}>By continuing, you agree to our</Text>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalBullet}>·</Text>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.legalLink}>Terms & Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rootContainerTablet: {
    backgroundColor: '#0F172A',
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  screenContainerTablet: {
    maxWidth: 420,
    maxHeight: 880,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#DCEBFA',
    shadowColor: '#071A4B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
    marginVertical: 'auto',
  },
  backButtonCircle: {
    position: 'absolute',
    zIndex: 50,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0866F5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  heroSection: {
    flex: 1,
    width: '100%',
    minHeight: 220,
    backgroundColor: '#EEF7FD',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  bottomSectionSmall: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  bottomSectionLarge: {
    paddingHorizontal: 26,
    paddingTop: 16,
    gap: 18,
  },
  headlineWrapper: {
    alignItems: 'center',
  },
  headlineNavy: {
    fontSize: 25,
    fontWeight: '800',
    color: '#071A4B',
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 30,
  },
  headlineNavySmall: {
    fontSize: 22,
    lineHeight: 26,
  },
  headlineBlue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0866F5',
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 30,
  },
  headlineBlueSmall: {
    fontSize: 22,
    lineHeight: 26,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
    paddingVertical: 2,
  },
  featureRowSmall: {
    gap: 18,
    paddingVertical: 0,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIconBoxSmall: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  rupeeIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0866F5',
  },
  rupeeIconSmall: {
    fontSize: 19,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#071A4B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  featureLabelSmall: {
    fontSize: 10,
    marginTop: 3,
    lineHeight: 13,
  },
  googleButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#0866F5',
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  googleButtonSmall: {
    height: 46,
    borderRadius: 23,
  },
  googleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  googleButtonTextSmall: {
    fontSize: 14,
  },
  arrowBadge: {
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  legalSection: {
    alignItems: 'center',
  },
  legalNoticeText: {
    fontSize: 11.5,
    color: '#727D98',
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 6,
  },
  legalLink: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0866F5',
  },
  legalBullet: {
    fontSize: 11.5,
    color: '#727D98',
  },
  errorContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 60,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
    lineHeight: 16,
    textAlign: 'center',
  },
});

