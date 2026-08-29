import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = ({ pressed }: { pressed: boolean }): ViewStyle[] => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
    };

    // Size
    let sizeStyle: ViewStyle = {};
    if (size === 'sm') {
      sizeStyle = { paddingVertical: 8, paddingHorizontal: 12 };
    } else if (size === 'lg') {
      sizeStyle = { paddingVertical: 16, paddingHorizontal: 24 };
    } else {
      sizeStyle = { paddingVertical: 12, paddingHorizontal: 16 };
    }

    // Variant
    let variantStyle: ViewStyle = {};
    if (variant === 'primary') {
      variantStyle = {
        backgroundColor: pressed ? Colors.deepNavy : Colors.navy,
      };
    } else if (variant === 'secondary') {
      variantStyle = {
        backgroundColor: pressed ? Colors.deepSky : Colors.paleSky,
      };
    } else if (variant === 'outline') {
      variantStyle = {
        backgroundColor: pressed ? Colors.offWhite : Colors.white,
        borderWidth: 1.5,
        borderColor: Colors.navy,
      };
    } else if (variant === 'ghost') {
      variantStyle = {
        backgroundColor: pressed ? Colors.offWhite : 'transparent',
      };
    }

    if (disabled || loading) {
      variantStyle = {
        ...variantStyle,
        opacity: 0.5,
      };
    }

    return [baseStyle, sizeStyle, variantStyle, style || {}];
  };

  const getTextStyle = (): TextStyle => {
    let fontStyle = Typography.BodyMedium;
    if (size === 'sm') fontStyle = Typography.BodySmallMedium;
    if (size === 'lg') fontStyle = { ...Typography.BodyMedium, fontSize: 18 };

    let color: string = Colors.white;
    if (variant === 'secondary') color = Colors.deepNavy;
    if (variant === 'outline' || variant === 'ghost') color = Colors.navy;

    return {
      ...fontStyle,
      color,
      textAlign: 'center',
      ...(textStyle || {}),
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyle({ pressed: false })}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.white : Colors.navy}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
});
