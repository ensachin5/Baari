import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { WifiOff } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();

  // Trigger when disconnected or not reachable
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 10);

  return (
    <View style={[styles.banner, { paddingTop: topInset + 2 }]}>
      <WifiOff size={13} color={Colors.white} strokeWidth={2.2} />
      <Text style={styles.bannerText}>
        You're offline — changes will sync when reconnected
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.deepNavy,
    paddingBottom: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    gap: 6,
    zIndex: 9999,
  },
  bannerText: {
    ...Typography.Caption,
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});

