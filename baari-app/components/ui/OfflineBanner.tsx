import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { WifiOff } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  const netInfo = useNetInfo();

  if (netInfo.isConnected !== false) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color={Colors.white} />
      <Text style={styles.bannerText}>
        You're offline — changes will sync when you're back online
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navy,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  bannerText: {
    ...Typography.Caption,
    color: Colors.white,
    fontWeight: '600',
  },
});
