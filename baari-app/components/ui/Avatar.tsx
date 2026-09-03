import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../lib/theme';

interface AvatarProps {
  name?: string;
  image?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle | ImageStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  image,
  size = 'md',
  style,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const getDimensions = () => {
    switch (size) {
      case 'xs':
        return { size: 28, fontSize: 10 };
      case 'sm':
        return { size: 32, fontSize: 13 };
      case 'lg':
        return { size: 56, fontSize: 20 };
      case 'xl':
        return { size: 72, fontSize: 26 };
      case 'md':
      default:
        return { size: 40, fontSize: 16 };
    }
  };

  const { size: dim, fontSize } = getDimensions();

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  if (image && !imgFailed) {
    return (
      <Image
        source={{ uri: image }}
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
          backgroundColor: Colors.paleSky,
          borderColor: Colors.navy,
        },
        style,
      ]}
    >
      <Text
        style={[
          Typography.BodyMedium,
          { fontSize, color: Colors.deepNavy, fontWeight: '700' },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.offWhite,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
