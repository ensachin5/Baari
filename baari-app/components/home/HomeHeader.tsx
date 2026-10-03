import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography } from '../../lib/theme';
import { CheckSquare2, MessageCircle } from 'lucide-react-native';

interface HomeHeaderProps {
  topInset: number;
  activeFlat: {
    name: string;
  } | null;
  memberCountText: string;
  activePage: number;
  onSwitchPage: (pageIndex: number) => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = React.memo(({
  topInset,
  activeFlat,
  memberCountText,
  activePage,
  onSwitchPage,
}) => {
  return (
    <View style={[styles.topHeader, { paddingTop: topInset + 6 }]}>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.topFlatLabel}>Baari</Text>
        {activeFlat?.name ? (
          <View style={styles.flatTitleRow}>
            <Text style={[Typography.H1, styles.flatNameText]} numberOfLines={1}>
              {activeFlat.name}
            </Text>
            <Text style={[Typography.Caption, styles.memberCountText]}>
              · {memberCountText}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSkeleton} />
        )}
      </View>

      {/* 2-Page Indicator Switcher */}
      <View style={styles.indicatorContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSwitchPage(0)}
          style={[styles.indicatorDotBtn, activePage === 0 && styles.indicatorActive]}
        >
          <CheckSquare2
            size={13}
            color={activePage === 0 ? Colors.white : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.indicatorText,
              activePage === 0 && styles.indicatorTextActive,
            ]}
          >
            Kaam
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSwitchPage(1)}
          style={[styles.indicatorDotBtn, activePage === 1 && styles.indicatorActive]}
        >
          <MessageCircle
            size={13}
            color={activePage === 1 ? Colors.white : Colors.mutedNavy}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.indicatorText,
              activePage === 1 && styles.indicatorTextActive,
            ]}
          >
            Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  topFlatLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.navy,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  flatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  flatNameText: {
    color: Colors.deepNavy,
  },
  memberCountText: {
    color: Colors.mutedNavy,
    fontSize: 12,
  },
  headerSkeleton: {
    height: 22,
    width: 120,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: 2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: 9999,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  indicatorDotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  indicatorActive: {
    backgroundColor: Colors.navy,
  },
  indicatorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  indicatorTextActive: {
    color: Colors.white,
  },
});
