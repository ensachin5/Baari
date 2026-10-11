import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, StatusThemes, BorderRadius, Spacing } from '../../lib/theme';
import {
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Droplets,
  Trash2,
  Brush,
  LayoutGrid,
} from 'lucide-react-native';

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
    const catLower = category.toLowerCase();
    let catConfig: { bg: string; border: string; color: string; icon: React.ReactNode } = {
      bg: Colors.paleSky,
      border: '#BAE6FD',
      color: Colors.navy,
      icon: <LayoutGrid size={11} color={Colors.navy} strokeWidth={2.2} />,
    };

    if (catLower === 'water') {
      catConfig = {
        bg: '#F0F9FF',
        border: '#BAE6FD',
        color: '#0284C7',
        icon: <Droplets size={11} color="#0284C7" strokeWidth={2.2} />,
      };
    } else if (catLower === 'garbage') {
      catConfig = {
        bg: '#FFFBEB',
        border: '#FDE68A',
        color: '#D97706',
        icon: <Trash2 size={11} color="#D97706" strokeWidth={2.2} />,
      };
    } else if (catLower === 'chore') {
      catConfig = {
        bg: '#ECFDF5',
        border: '#A7F3D0',
        color: '#059669',
        icon: <Brush size={11} color="#059669" strokeWidth={2.2} />,
      };
    }

    return (
      <View
        style={[
          styles.categoryBadge,
          { backgroundColor: catConfig.bg, borderColor: catConfig.border },
          style,
        ]}
      >
        {showIcon && <View style={styles.catIconWrapper}>{catConfig.icon}</View>}
        <Text style={[styles.categoryText, { color: catConfig.color }]}>{label}</Text>
      </View>
    );
  }

  const currentStatus =
    status && status in StatusThemes ? (status as keyof typeof StatusThemes) : 'pending';
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
          {currentStatus === 'done' && (
            <Check size={11} color={theme.iconColor} strokeWidth={2.5} />
          )}
          {currentStatus === 'pending' && (
            <Clock size={11} color={theme.iconColor} strokeWidth={2} />
          )}
          {currentStatus === 'in_progress' && (
            <Clock size={11} color={theme.iconColor} strokeWidth={2} />
          )}
          {currentStatus === 'overdue' && (
            <AlertCircle size={11} color={theme.iconColor} strokeWidth={2.5} />
          )}
        </View>
      )}
      <Text style={[Typography.Caption, { color: theme.text, fontWeight: '600', fontSize: 11 }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  catIconWrapper: {
    marginRight: 4,
  },
  categoryText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  iconWrapper: {
    marginRight: 4,
  },
});
