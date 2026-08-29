import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'muted';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'outlined',
}) => {
  const getCardStyle = (): ViewStyle => {
    let specificStyle: ViewStyle = {};

    if (variant === 'elevated') {
      specificStyle = {
        backgroundColor: Colors.white,
        shadowColor: Colors.deepNavy,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      };
    } else if (variant === 'muted') {
      specificStyle = {
        backgroundColor: Colors.offWhite,
        borderWidth: 1,
        borderColor: Colors.border,
      };
    } else {
      // Outlined (default)
      specificStyle = {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
      };
    }

    return {
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      ...specificStyle,
      ...(style || {}),
    };
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={getCardStyle()}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={getCardStyle()}>{children}</View>;
};
