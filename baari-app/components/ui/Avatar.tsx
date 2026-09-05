import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Typography } from '../../lib/theme';

interface AvatarProps {
  name?: string;
  image?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle | ImageStyle;
}

const AVATAR_COLORS = [
  { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' }, // Sky
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Amber
  { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }, // Emerald
  { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }, // Purple
  { bg: '#FFE4E6', text: '#BE123C', border: '#FECDD3' }, // Rose
  { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' }, // Teal
  { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' }, // Indigo
];

function getAvatarColor(n: string) {
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

const isValidImageUri = (uri?: string | null): boolean => {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  );
};

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  image,
  size = 'md',
  style,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [image]);

  const getDimensions = () => {
    switch (size) {
      case 'xs':
        return { size: 28, fontSize: 11 };
      case 'sm':
        return { size: 32, fontSize: 13 };
      case 'lg':
        return { size: 56, fontSize: 20 };
      case 'xl':
        return { size: 72, fontSize: 26 };
      case 'md':
      default:
        return { size: 40, fontSize: 15 };
    }
  };

  const { size: dim, fontSize } = getDimensions();

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const colorScheme = getAvatarColor(name || 'User');
  const validUri = isValidImageUri(image);

  if (validUri && !imgFailed) {
    return (
      <Image
        source={{ uri: image!.trim() }}
        style={[
          styles.avatar,
          { width: dim, height: dim, borderRadius: dim / 2 },
          style as any,
        ]}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colorScheme.bg,
          borderWidth: 1,
          borderColor: colorScheme.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          Typography.BodyMedium,
          {
            fontSize,
            color: colorScheme.text,
            fontWeight: '700',
            includeFontPadding: false,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
