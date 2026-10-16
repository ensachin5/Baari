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
  FileText,
  CheckCircle2,
  AlertCircle,
  Scale,
  ShieldAlert,
  LifeBuoy,
  ExternalLink,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../lib/theme';
import { Card } from '../components/ui/Card';

export default function TermsAndConditionsScreen() {
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
          Terms & Conditions
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
            <FileText size={13} color={Colors.deepNavy} />
            <Text style={styles.badgeText}>LEGAL DOCUMENTATION</Text>
          </View>
          <Text style={Typography.Display}>Terms & Conditions</Text>
          <Text style={styles.lastUpdatedText}>
            Last Updated: <Text style={styles.lastUpdatedHighlight}>{lastUpdated}</Text>
          </Text>
        </View>

        {/* Intro Card */}
        <Card variant="outlined" style={styles.introCard}>
          <Text style={styles.introParagraph}>
            These Terms & Conditions (&ldquo;Terms&rdquo;) govern your access to and use of <Text style={styles.boldText}>Baari</Text> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), including our mobile application and related shared living coordination tools.
          </Text>
          <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
            By creating an account, signing in through Google OAuth, or using any part of the Services, you agree to be bound by these Terms. If you do not agree, please do not access or use Baari.
          </Text>
        </Card>

        {/* Section 1 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>1. Eligibility & Accounts</Text>
          </View>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Age Requirement:</Text> You must be at least 13 years old (or the legal age of majority in your jurisdiction) to use the Services.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Account Verification:</Text> Authentication is handled via Google OAuth. You are responsible for maintaining the security of your Google account credentials.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Account Responsibility:</Text> You agree that all actions taken under your account are your responsibility. Notify us immediately if you suspect unauthorized use.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Scale size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>2. Scope of Services</Text>
          </View>
          <Text style={styles.bodyText}>
            Baari provides tools to coordinate everyday shared living responsibilities:
          </Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Living Space Administration:</Text> Users may create flats, hostels, or PGs, share invite codes, and assign admin or member roles.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Chore Management (&ldquo;Kaam&rdquo;):</Text> Users can create, assign, rotate, and mark household tasks as complete.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.boldText}>Household Communication:</Text> Flatmates can post announcements, exchange chat messages, and receive chore reminders.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3 - Important Disclaimer */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <AlertCircle size={18} color="#D97706" />
            </View>
            <Text style={Typography.H2}>3. Expense Tracking Disclaimer</Text>
          </View>
          <Text style={styles.bodyText}>
            Baari provides an expense tracking and balance calculation calculator for flatmates.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Important Financial Notice:</Text>
            <Text style={styles.warningText}>
              Baari is <Text style={styles.boldText}>not</Text> a bank, financial institution, money transmitter, or payment processor.
            </Text>
            <Text style={[styles.warningText, { marginTop: 4 }]}>
              All monetary calculations displayed in Baari are informational estimates based on user-entered data. Actual transfers and settlements of funds occur externally between roommates through their own chosen payment methods (e.g., cash or external UPI/banking apps).
            </Text>
          </View>

          <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
            We are not responsible for any disputes, inaccuracies in user-entered amounts, or failed private financial settlements between roommates.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <ShieldAlert size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>4. Acceptable Use & Conduct</Text>
          </View>
          <Text style={styles.bodyText}>You agree not to use the Services to:</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Harass, abuse, impersonate, or threaten other roommates or users.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Upload defamatory, obscene, fraudulent, or unlawful content.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Interfere with or disrupt the integrity or performance of servers or databases.</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>Attempt to gain unauthorized access to any living space or user account.</Text>
            </View>
          </View>
        </View>

        {/* Section 5 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <LifeBuoy size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>5. Termination & Changes</Text>
          </View>
          <Text style={styles.bodyText}>
            We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or abusive behavior. We may update these Terms periodically, and will indicate the date of the latest revisions at the top of this document. Continued use of the Services after updates constitutes acceptance of the modified Terms.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <FileText size={18} color={Colors.navy} />
            </View>
            <Text style={Typography.H2}>6. Contact Information</Text>
          </View>
          <Text style={styles.bodyText}>
            If you have any questions regarding these Terms & Conditions, please contact us:
          </Text>
          <View style={styles.contactContainer}>
            <Text style={styles.contactEmail}>Email: support@baari.app</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL('https://baari-app.vercel.app')}
              style={styles.webLinkRow}
            >
              <Text style={styles.webLinkText}>Website: https://baari-app.vercel.app</Text>
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
              onPress={() => router.push('/privacy')}
            >
              <Text style={styles.footerLink}>Privacy Policy</Text>
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
  warningBox: {
    marginTop: Spacing.md,
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    ...Typography.BodySmallMedium,
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    ...Typography.Caption,
    color: '#92400E',
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
