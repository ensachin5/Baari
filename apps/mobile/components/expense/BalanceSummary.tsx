import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { ArrowUpRight, ArrowDownLeft, Plus, HandCoins } from 'lucide-react-native';

interface BalanceSummaryProps {
  youAreOwed: number;
  youOwe: number;
  netBalance: number;
  onAddExpense: () => void;
  onSettleUp: () => void;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  youAreOwed,
  youOwe,
  netBalance,
  onAddExpense,
  onSettleUp,
}) => {
  return (
    <Card style={styles.container} variant="elevated">
      <Text style={[Typography.Caption, styles.headerLabel]}>TOTAL BALANCE</Text>

      {/* Net Balance Headline */}
      <View style={styles.netRow}>
        <Text style={styles.netAmount}>
          ₹{Math.abs(netBalance).toFixed(0)}
        </Text>
        <View
          style={[
            styles.netBadge,
            netBalance > 0
              ? styles.netBadgeOwed
              : netBalance < 0
              ? styles.netBadgeOwe
              : styles.netBadgeSettled,
          ]}
        >
          <Text
            style={[
              Typography.Caption,
              netBalance > 0
                ? styles.netTextOwed
                : netBalance < 0
                ? styles.netTextOwe
                : styles.netTextSettled,
            ]}
          >
            {netBalance > 0 ? 'You are owed' : netBalance < 0 ? 'You owe' : 'All settled'}
          </Text>
        </View>
      </View>

      {/* Two Column Breakdown */}
      <View style={styles.breakdownRow}>
        {/* You are owed */}
        <View style={styles.breakdownCol}>
          <View style={styles.colHeader}>
            <View style={styles.arrowIconOwedBg}>
              <ArrowDownLeft size={13} color="#059669" strokeWidth={2.5} />
            </View>
            <Text style={[Typography.Caption, styles.colLabel]}>You are owed</Text>
          </View>
          <Text style={[Typography.H2, { color: '#059669' }]}>
            ₹{youAreOwed.toFixed(2)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        {/* You owe */}
        <View style={styles.breakdownCol}>
          <View style={styles.colHeader}>
            <View style={styles.arrowIconOweBg}>
              <ArrowUpRight size={13} color="#DC2626" strokeWidth={2.5} />
            </View>
            <Text style={[Typography.Caption, styles.colLabel]}>You owe</Text>
          </View>
          <Text style={[Typography.H2, { color: '#DC2626' }]}>
            ₹{youOwe.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title="Add Expense"
          onPress={onAddExpense}
          icon={<Plus size={16} color={Colors.white} strokeWidth={2.4} />}
          style={styles.actionBtn}
        />
        <Button
          title="Settle Up"
          variant="secondary"
          onPress={onSettleUp}
          icon={<HandCoins size={16} color={Colors.deepNavy} strokeWidth={2.2} />}
          style={styles.actionBtn}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  headerLabel: {
    color: Colors.grayBlack,
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  netAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    lineHeight: 38,
    color: Colors.black,
  },
  netBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  netBadgeOwed: {
    backgroundColor: Colors.paleSky,
  },
  netBadgeOwe: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.navy,
  },
  netBadgeSettled: {
    backgroundColor: Colors.offWhite,
  },
  netTextOwed: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  netTextOwe: {
    color: Colors.navy,
    fontWeight: '700',
  },
  netTextSettled: {
    color: Colors.grayBlack,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  breakdownCol: {
    flex: 1,
    alignItems: 'center',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  arrowIconOwedBg: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIconOweBg: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colLabel: {
    color: Colors.grayBlack,
    fontWeight: '600',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
