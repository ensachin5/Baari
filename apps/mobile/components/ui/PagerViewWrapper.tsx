import React from 'react';
import { View } from 'react-native';

export interface PagerViewWrapperProps {
  style?: any;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

export declare const PagerViewWrapper: React.ForwardRefExoticComponent<
  PagerViewWrapperProps & React.RefAttributes<any>
>;
