import React, { forwardRef } from 'react';
import PagerView from 'react-native-pager-view';

export interface PagerViewWrapperProps {
  style?: any;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

export const PagerViewWrapper = forwardRef<any, PagerViewWrapperProps>(
  ({ style, initialPage = 0, onPageSelected, children }, ref) => {
    return (
      <PagerView
        ref={ref}
        style={style}
        initialPage={initialPage}
        onPageSelected={onPageSelected}
      >
        {children}
      </PagerView>
    );
  }
);
