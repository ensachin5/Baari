import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Flame, Edit3 } from 'lucide-react-native';

interface ProfileHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    currentStreak?: number;
    longestStreak?: number;
  } | null;
  isAdmin: boolean;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({
  user,
  isAdmin,
  onEditPress,
}) => {
  return (
    <Card variant="outlined" style={styles.userCard}>
      <View style={styles.userRow}>
        <Avatar name={user?.name || 'User'} image={user?.image} size="lg" />
        <View style={styles.userCol}>
          <View style={styles.userNameRow}>
            <Text style={Typography.H2}>{user?.name || 'Flatmate'}</Text>
            {typeof user?.currentStreak === 'number' && user.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={14} color={Colors.sky} fill={Colors.sky} />
                <Text style={styles.streakBadgeText}>{user.currentStreak}</Text>
              </View>
            )}
          </View>
          <Text style={[Typography.BodySmall, styles.userEmail]}>
            {user?.email || ''}
          </Text>
          <View style={styles.roleBadgeRow}>
            <Badge
              label={isAdmin ? 'Flat Admin' : 'Member'}
              status={isAdmin ? 'done' : 'pending'}
              showIcon={false}
            />
            {typeof user?.longestStreak === 'number' && user.longestStreak > 0 && (
              <Text style={styles.longestStreakText}>
                Best streak: {user.longestStreak}d
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEditPress}
          style={styles.editBtn}
        >
          <Edit3 size={18} color={Colors.navy} />
        </TouchableOpacity>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  userCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userCol: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userEmail: {
    color: Colors.grayBlack,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.paleSky,
  },
  streakBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.deepSky,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  longestStreakText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
  },
  editBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.offWhite,
  },
});
