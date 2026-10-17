import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, ArrowRight } from 'lucide-react-native';
import { HomeIcon } from '../../components/ui/HomeIcon';
import { useSession } from '../../store/session';

export default function ChooseFlatScreen() {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const { width: windowWidth } = useWindowDimensions();

  const isTablet = windowWidth >= 600;
  const containerWidth = isTablet ? 430 : windowWidth;
  const heroHeight = containerWidth * (580 / 492);

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
          {/* Top: 4 Flatmates + Cat Household Artwork */}
          <View style={[styles.heroWrapper, { width: containerWidth, height: heroHeight }]}>
            <Image
              source={require('../../assets/onboarding-welcome-hero.png')}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          </View>

          {/* Bottom Content */}
          <View style={styles.bottomContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                Welcome, <Text style={styles.titleBlue}>Flatmate!</Text> 👋
              </Text>
              <Text style={styles.subtitle}>
                To get started, set up your living space or join your flatmates using an invite code.
              </Text>
            </View>

            {/* Action Cards */}
            <View style={styles.optionsContainer}>
              {/* Option 1: Create a Place */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(onboarding)/create-flat')}
                style={styles.optionCard}
              >
                <View style={styles.iconBadge}>
                  <HomeIcon size={24} color="#0866F5" strokeWidth={2} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Create a new Place</Text>
                  <Text style={styles.optionDesc}>
                    Start a Flat, PG, or Hostel group and invite your flatmates
                  </Text>
                </View>
                <ArrowRight size={20} color="#071A4B" />
              </TouchableOpacity>

              {/* Option 2: Join an existing Place */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(onboarding)/join-flat')}
                style={styles.optionCard}
              >
                <View style={styles.iconBadge}>
                  <Users size={24} color="#0866F5" strokeWidth={2} />
                </View>
                <View style={styles.optionTextCol}>
                  <Text style={styles.optionTitle}>Join an existing Place</Text>
                  <Text style={styles.optionDesc}>
                    Enter the 6-character invite code shared by your flatmate
                  </Text>
                </View>
                <ArrowRight size={20} color="#071A4B" />
              </TouchableOpacity>
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
    overflow: 'hidden',
  },
  heroWrapper: {
    position: 'relative',
    backgroundColor: '#F0F6FE',
  },
  bottomContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#071A4B',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleBlue: {
    color: '#0866F5',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#727D98',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 300,
  },
  optionsContainer: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCEBFA',
    shadowColor: '#0866F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextCol: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#071A4B',
  },
  optionDesc: {
    fontSize: 12.5,
    color: '#727D98',
    marginTop: 3,
    lineHeight: 17,
  },
});
