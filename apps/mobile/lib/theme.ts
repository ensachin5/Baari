import { TextStyle } from 'react-native';

export const Colors = {
  // White variants
  white: '#FFFFFF',
  offWhite: '#F4F6F9',

  // Black variants
  black: '#1A1A1A',
  grayBlack: '#5C5F66',
  nearBlack: '#0A0A0A',

  // Navy blue variants (Primary Accent)
  navy: '#0A2540',
  mutedNavy: '#3C4E7A',
  deepNavy: '#061729',

  // Sky blue variants (Secondary Accent)
  sky: '#5AC8FA',
  paleSky: '#DCEEF7',
  deepSky: '#2E93C4',

  // Borders & Dividers
  border: '#E2E8F0',
  borderDark: '#0A2540',
} as const;

export const Typography: Record<string, TextStyle> = {
  Display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: Colors.black,
  },
  H1: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.black,
  },
  H2: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: Colors.black,
  },
  Body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.black,
  },
  BodyMedium: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.black,
  },
  BodySmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.grayBlack,
  },
  BodySmallMedium: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.black,
  },
  Caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.grayBlack,
  },
};

export const StatusThemes = {
  done: {
    background: Colors.paleSky,
    text: Colors.deepNavy,
    border: 'transparent',
    iconColor: Colors.deepNavy,
  },
  pending: {
    background: Colors.offWhite,
    text: Colors.mutedNavy,
    border: Colors.navy,
    iconColor: Colors.mutedNavy,
  },
  overdue: {
    background: Colors.deepNavy,
    text: Colors.white,
    border: Colors.deepNavy,
    iconColor: Colors.white,
  },
  in_progress: {
    background: Colors.paleSky,
    text: Colors.navy,
    border: Colors.sky,
    iconColor: Colors.deepSky,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
