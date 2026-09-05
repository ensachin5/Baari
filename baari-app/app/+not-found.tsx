import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../lib/theme';
import { Compass } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Brand/Icon badge */}
          <View style={styles.iconContainer}>
            <Compass size={36} color={Colors.navy} strokeWidth={2} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>This page doesn't exist</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            The link you followed may be broken or the screen may have moved.
          </Text>

          {/* Return Home Button */}
          <Button
            title="Go to Home"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.paleSky,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.H1,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.BodySmall,
    color: Colors.grayBlack,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.xxl,
    lineHeight: 20,
  },
  button: {
    width: '100%',
    maxWidth: 260,
  },
});
