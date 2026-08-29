import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, StatusThemes, BorderRadius, Spacing } from '../../lib/theme';
import { Check, Clock, AlertCircle } from 'lucide-react-native';

export type BadgeStatus = 'done' | 'pending' | 'in_progress' | 'overdue' | 'custom';

interface BadgeProps {
  label: string;
  status?: BadgeStatus;
  category?: 'water' | 'garbage' | 'chore' | 'custom' | string;
  style?: ViewStyle;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  status,
  category,
  style,
  showIcon = true,
}) => {
  if (category) {
    return (
      <View style={[styles.categoryBadge, style]}>
        <Text style={styles.categoryText}>{label}</Text>
      </View>
    );
  }

  const currentStatus = (status && status in StatusThemes) ? (status as keyof typeof StatusThemes) : 'pending';
  const theme = StatusThemes[currentStatus] || StatusThemes.pending;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderWidth: theme.border !== 'transparent' ? 1 : 0,
        },
        style,
      ]}
    >
      {showIcon && (
        <View style={styles.iconWrapper}>
          {currentStatus === 'done' && <Check size={12} color={theme.iconColor} strokeWidth={2.5} />}
          {currentStatus === 'pending' && <Clock size={12} color={theme.iconColor} strokeWidth={2} />}
          {currentStatus === 'in_progress' && <Clock size={12} color={theme.iconColor} strokeWidth={2} />}
          {currentStatus === 'overdue' && <AlertCircle size={12} color={theme.iconColor} strokeWidth={2.5} />}
        </View>
      )}
      <Text style={[Typography.Caption, { color: theme.text, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  categoryBadge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.paleSky,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    ...Typography.Caption,
    color: Colors.navy,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  iconWrapper: {
    marginRight: 4,
  },
});
