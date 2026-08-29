import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../store/session';
import { Colors } from '../lib/theme';

export default function IndexScreen() {
  const router = useRouter();
  const token = useSession((state) => state.token);
  const activeFlat = useSession((state) => state.activeFlat);
  const isHydrated = useSession((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    if (!token) {
      router.replace('/(auth)/sign-in');
    } else if (!activeFlat) {
      router.replace('/(onboarding)/choose');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [isHydrated, token, activeFlat]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
