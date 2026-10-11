import React, { forwardRef, useState, useImperativeHandle, Children } from 'react';
import { View, StyleSheet } from 'react-native';

export interface PagerViewWrapperProps {
  style?: any;
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children: React.ReactNode;
}

export const PagerViewWrapper = forwardRef<any, PagerViewWrapperProps>(
  ({ style, initialPage = 0, onPageSelected, children }, ref) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    useImperativeHandle(ref, () => ({
      setPage: (pageIndex: number) => {
        setCurrentPage(pageIndex);
        if (onPageSelected) {
          onPageSelected({ nativeEvent: { position: pageIndex } });
        }
      },
    }));

    const childArray = Children.toArray(children);

    return (
      <View style={[styles.container, style]}>
        {childArray.map((child, index) => (
          <View
            key={index}
            style={[
              styles.page,
              { display: index === currentPage ? 'flex' : 'none' },
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
