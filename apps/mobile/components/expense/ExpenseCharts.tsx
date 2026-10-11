import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { ExpenseItem } from './ExpenseRow';

interface ExpenseChartsProps {
  expenses: ExpenseItem[];
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ expenses }) => {
  if (!expenses || expenses.length === 0) return null;

  // Aggregate spending by category
  const categoryTotals: Record<string, number> = {};
  let totalSpending = 0;

  expenses.forEach((exp) => {
    const cat = exp.category || 'General';
    const amt = parseFloat(exp.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    totalSpending += amt;
  });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const categoryShades = [
    Colors.navy,
    Colors.sky,
    Colors.mutedNavy,
    Colors.deepSky,
    Colors.paleSky,
    Colors.deepNavy,
  ];

  return (
    <Card style={styles.container} variant="outlined">
      <View style={styles.header}>
        <Text style={Typography.H2}>Category Breakdown</Text>
        <Text style={[Typography.Caption, styles.totalLabel]}>
          Total: ₹{totalSpending.toFixed(0)}
        </Text>
      </View>

      {/* Progress Bar Breakdown */}
      <View style={styles.barContainer}>
        {categories.map(([cat, amt], idx) => {
          const percent = totalSpending > 0 ? (amt / totalSpending) * 100 : 0;
          return (
            <View
              key={cat}
              style={[
                styles.barSegment,
                {
                  flex: percent,
                  backgroundColor: categoryShades[idx % categoryShades.length],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Category Legends */}
      <View style={styles.legendGrid}>
        {categories.map(([cat, amt], idx) => {
          const percent = totalSpending > 0 ? ((amt / totalSpending) * 100).toFixed(0) : '0';
          const shade = categoryShades[idx % categoryShades.length];
          return (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: shade }]} />
              <Text style={[Typography.Caption, styles.legendCat]} numberOfLines={1}>
                {cat}
              </Text>
              <Text style={[Typography.Caption, styles.legendAmt]}>
                ₹{amt.toFixed(0)} ({percent}%)
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  totalLabel: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  barContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.offWhite,
    marginBottom: Spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.xs,
    columnGap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendCat: {
    color: Colors.black,
    fontWeight: '600',
    flex: 1,
  },
  legendAmt: {
    color: Colors.grayBlack,
  },
});
