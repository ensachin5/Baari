import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selected,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected ? styles.segmentTextSelected : null,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentSelected: {
    backgroundColor: Colors.navy,
    shadowColor: Colors.deepNavy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
});
