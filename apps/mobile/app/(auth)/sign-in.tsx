import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { authClient, syncSessionToStore, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';

export default function SignInScreen() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { width: windowWidth } = useWindowDimensions();

  const isTablet = windowWidth >= 600;
  const containerWidth = isTablet ? 420 : windowWidth;
  const heroHeight = containerWidth * (592 / 493);

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
    } catch (err: any) {
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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTablet && styles.scrollContainerTablet,
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mainCard, { width: containerWidth }]}>
          {/* Global Error Banner */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Top: Authentic Logo & Household Scene Artwork */}
          <View style={[styles.heroWrapper, { width: containerWidth, height: heroHeight }]}>
            <Image
              source={require('../../assets/signin-hero.png')}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          </View>

          {/* Bottom Half: Crisp Typography, Feature Badges, CTA & Legal Links */}
          <View style={styles.bottomContent}>
            {/* Main Headline */}
            <View style={styles.headlinewrapper}>
              <Text style={styles.headlineNavy}>Share Chores</Text>
              <Text style={styles.headlineBlue}>Live Better</Text>
            </View>

            {/* 3 Feature Badges */}
            <View style={styles.featureRow}>
              {/* Feature 1: Track Chores */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Rect x={4} y={3} width={16} height={18} rx={4} fill="#0866F5" />
                    <Path d="M8.5 2H15.5C16.05 2 16.5 2.45 16.5 3V4H7.5V3C7.5 2.45 7.95 2 8.5 2Z" fill="#071A4B" />
                    <Path d="M8 12.5L10.5 15L16 9" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={styles.featureLabel}>Track{'\n'}Chores</Text>
              </View>

              {/* Feature 2: Split Expenses */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Text style={styles.rupeeIcon}>₹</Text>
                </View>
                <Text style={styles.featureLabel}>Split{'\n'}Expenses</Text>
              </View>

              {/* Feature 3: Roommate Chat */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconBox}>
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path
                      d="M12 3C6.48 3 2 6.81 2 11.5C2 14.16 3.45 16.51 5.73 18.01C5.47 19.35 4.8 20.49 4.76 20.55C4.55 20.89 4.68 21.33 5.03 21.52C5.23 21.62 5.45 21.64 5.66 21.58C7.58 20.98 9.18 19.92 10.15 19.16C10.75 19.26 11.37 19.32 12 19.32C17.52 19.32 22 15.51 22 10.82C22 6.12 17.52 3 12 3Z"
                      fill="#0866F5"
                    />
                    <Circle cx={8} cy={11.5} r={1.3} fill="#FFFFFF" />
                    <Circle cx={12} cy={11.5} r={1.3} fill="#FFFFFF" />
                    <Circle cx={16} cy={11.5} r={1.3} fill="#FFFFFF" />
                  </Svg>
                </View>
                <Text style={styles.featureLabel}>Roommate{'\n'}Chat</Text>
              </View>
            </View>

            {/* Continue with Google Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              accessibilityLabel="Continue with Google"
              style={styles.googleButton}
            >
              {/* White badge with Google G */}
              <View style={styles.googleBadge}>
                <GoogleIcon size={18} />
              </View>

              {/* Label */}
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </Text>

              {/* Right Arrow */}
              <View style={styles.arrowBadge}>
                {googleLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.4} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F8FF',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainerTablet: {
    backgroundColor: '#F3F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 32 : 0,
    overflow: 'hidden',
  },
  heroWrapper: {
    position: 'relative',
    backgroundColor: '#F0F6FE',
  },
  bottomContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
    backgroundColor: '#FFFFFF',
  },
  headlinewrapper: {
    alignItems: 'center',
    paddingTop: 4,
  },
  headlineNavy: {
    fontSize: 27,
    fontWeight: '800',
    color: '#071A4B',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 33,
  },
  headlineBlue: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0866F5',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 33,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
    paddingVertical: 4,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  rupeeIcon: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0866F5',
  },
  featureLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#071A4B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },
  googleButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#0866F5',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
    marginTop: 4,
  },
  googleBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  arrowBadge: {
    width: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  legalSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  legalNoticeText: {
    fontSize: 12,
    color: '#727D98',
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    gap: 6,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0866F5',
  },
  legalBullet: {
    fontSize: 12,
    color: '#727D98',
  },
  errorContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 30,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
  },
});
