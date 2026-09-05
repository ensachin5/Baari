import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { House, Users, ArrowRight } from 'lucide-react-native';
import { useSession } from '../../store/session';

export default function ChooseFlatScreen() {
  const router = useRouter();
  const user = useSession((state) => state.user);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.H1}>Welcome, {user?.name || 'Flatmate'}! 👋</Text>
        <Text style={[Typography.BodySmall, styles.subtitle]}>
          To get started, set up your flat group or join your flatmates using an invite code.
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {/* Option 1: Create a Flat */}
        <Card
          onPress={() => router.push('/(onboarding)/create-flat')}
          style={styles.optionCard}
          variant="elevated"
        >
          <View style={styles.optionRow}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.navy }]}>
              <House size={24} color={Colors.white} strokeWidth={2} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={Typography.H2}>Create a new Flat</Text>
              <Text style={[Typography.BodySmall, styles.optionDesc]}>
                Start a flat group as an admin and invite your flatmates with a code
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.navy} />
          </View>
        </Card>

        {/* Option 2: Join with Code */}
        <Card
          onPress={() => router.push('/(onboarding)/join-flat')}
          style={styles.optionCard}
          variant="outlined"
        >
          <View style={styles.optionRow}>
            <View style={[styles.iconBadge, { backgroundColor: Colors.paleSky }]}>
              <Users size={24} color={Colors.deepNavy} />
            </View>
            <View style={styles.optionTextCol}>
              <Text style={Typography.H2}>Join an existing Flat</Text>
              <Text style={[Typography.BodySmall, styles.optionDesc]}>
                Enter the 6-character invite code shared by your flatmate
              </Text>
            </View>
            <ArrowRight size={20} color={Colors.navy} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  subtitle: {
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: Spacing.lg,
  },
  optionCard: {
    padding: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  optionTextCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  optionDesc: {
    marginTop: 2,
  },
});
