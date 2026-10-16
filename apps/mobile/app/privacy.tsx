import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  ArrowLeft,
  Shield,
  Eye,
  FileText,
  Database,
  Lock,
  UserCheck,
  Bell,
  ExternalLink,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../lib/theme';
import { Card } from '../components/ui/Card';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 16);
  const bottomInset = Math.max(insets.bottom, 20);

  const lastUpdated = 'October 15, 2026';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={Colors.navy} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Privacy Policy
        </Text>

        <View style={styles.headerLogoContainer}>
          <Image
            source={require('../assets/baari-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Badge & Title */}
        <View style={styles.titleSection}>
          <View style={styles.badge}>
            <Shield size={13} color={Colors.deepNavy} />
            <Text style={styles.badgeText}>LEGAL DOCUMENTATION</Text>
          </View>
          <Text style={Typography.Display}>Privacy Policy</Text>
          <Text style={styles.lastUpdatedText}>
            Last Updated: <Text style={styles.lastUpdatedHighlight}>{lastUpdated}</Text>
          </Text>
        </View>

        {/* Intro Card */}
        <Card variant="outlined" style={styles.introCard}>
          <Text style={styles.introParagraph}>
            Welcome to <Text style={styles.boldText}>Baari</Text> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). Baari is a shared living coordination platform designed to help roommates, flatmates, and hostel residents organize tasks (&ldquo;Kaam&rdquo;), split shared expenses, communicate, and manage household routines.
          </Text>
          <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
            We value your trust and are committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, and protect your information when you access or use our mobile application and related services.
          </Text>
        </Card>

        {/* Section 1 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Eye size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>1. Information We Collect</Text>
          </View>
          <Text style={styles.bodyText}>
            We collect only the information necessary to provide you with seamless shared living management:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Google Account Data:</Text> When you sign in using Google OAuth, we receive your verified email address, full name, and avatar picture. We do not receive or store your Google password.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Living Space & Membership Data:</Text> Details about the flat, PG, or living space you create or join, including flat name, invite codes, and your role (admin or member).
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Household Activity Data:</Text> Tasks and chores you assign, schedule, or complete; expense records and split amounts you log; and in-app chat messages exchanged within your flat room.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Device & Notification Data:</Text> When push notifications are enabled, we store device push tokens to deliver reminders for chores, expenses, and announcements.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <FileText size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>2. How We Use Information</Text>
          </View>
          <Text style={styles.bodyText}>
            We use your information strictly for the following purposes:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Authenticating and verifying your identity via Google OAuth.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Enabling shared chore rotation, scheduling, and completion tracking among flatmates.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Calculating shared expense splits and tracking settlements accurately.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Delivering timely reminders and flat announcements via push notifications.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Maintaining the security, performance, and integrity of our application.</Text>
            </View>
          </View>

          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              🔒 <Text style={styles.boldText}>Zero Advertising / Data Selling:</Text> We do not sell, rent, or trade your personal data to any third-party advertisers or data brokers under any circumstances.
            </Text>
          </View>
        </View>

        {/* Section 3 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Database size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>3. Information Sharing</Text>
          </View>
          <Text style={styles.bodyText}>
            Your household data is shared strictly within your selected living space:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>With Your Flatmates:</Text> Members of your flat space can view your display name, avatar, assigned chores, expense shares, and messages posted to the flat chat.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Infrastructure Providers:</Text> We use industry-standard cloud providers (such as Supabase PostgreSQL and Vercel hosting) under strict data protection terms.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Legal Compliance:</Text> We may disclose information if required to do so by applicable law, regulation, or valid legal process.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 4 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Lock size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>4. Data Security & Retention</Text>
          </View>
          <Text style={styles.bodyText}>
            We implement robust security measures including Transport Layer Security (TLS/HTTPS) encryption in transit, encrypted database connections, and secure session management. Your information is retained for as long as your account is active and needed to provide the Services.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <UserCheck size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>5. Your Rights & Choices</Text>
          </View>
          <Text style={styles.bodyText}>You have full control over your information:</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Profile Updates:</Text> You can edit your display name and avatar at any time in the Profile tab.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Leaving a Flat:</Text> You can leave any living space whenever you move or transition.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Account Deletion:</Text> You can request full deletion of your account and personal records by contacting our support team.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Notifications:</Text> You can enable or disable push notifications at any time in your device settings.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 6 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Bell size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>6. Contact Us</Text>
          </View>
          <Text style={styles.bodyText}>
            If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out to us:
          </Text>
          <View style={styles.contactContainer}>
            <Text style={styles.contactEmail}>Email: support@baari.app</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL('https://baari-app.vercel.app')}
              style={styles.webLinkRow}
            >
              <Text style={styles.webLinkText}>Web: https://baari-app.vercel.app</Text>
              <ExternalLink size={13} color={Colors.mutedNavy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footerSection}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} Baari. All rights reserved.
          </Text>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/terms')}
            >
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.H2,
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerLogoContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.paleSky,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    ...Typography.Caption,
    color: Colors.deepNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  lastUpdatedText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    marginTop: Spacing.xs,
  },
  lastUpdatedHighlight: {
    color: Colors.black,
    fontFamily: 'Inter_500Medium',
  },
  introCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
  },
  introParagraph: {
    ...Typography.Body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.black,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.paleSky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyText: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
    lineHeight: 21,
  },
  bulletList: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bulletDot: {
    color: Colors.navy,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Inter_700Bold',
  },
  bulletText: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
    flex: 1,
    lineHeight: 20,
  },
  boldText: {
    color: Colors.black,
    fontFamily: 'Inter_600SemiBold',
  },
  highlightBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.paleSky,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#CDE5F3',
  },
  highlightText: {
    ...Typography.Caption,
    color: Colors.deepNavy,
    lineHeight: 18,
  },
  contactContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  contactEmail: {
    ...Typography.BodySmallMedium,
    color: Colors.navy,
  },
  webLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  webLinkText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    textDecorationLine: 'underline',
  },
  footerSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  copyrightText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontSize: 11,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerLink: {
    ...Typography.Caption,
    color: Colors.navy,
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
});
