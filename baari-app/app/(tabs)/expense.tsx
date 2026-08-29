import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useExpenses } from '../../hooks/useExpenses';
import { BalanceSummary } from '../../components/expense/BalanceSummary';
import { ExpenseRow } from '../../components/expense/ExpenseRow';
import { ExpenseCharts } from '../../components/expense/ExpenseCharts';
import { AddExpenseModal } from '../../components/expense/AddExpenseModal';
import { SettleUpModal } from '../../components/expense/SettleUpModal';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Receipt, CreditCard } from 'lucide-react-native';

export default function ExpenseScreen() {
  const {
    expenses,
    balances,
    members,
    myDebts,
    loading,
    refreshing,
    addExpense,
    settleUp,
    onRefresh,
  } = useExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={Typography.H1}>Expenses & Balances</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.navy}
          />
        }
      >
        {/* Balance Summary Header Card */}
        <BalanceSummary
          youAreOwed={balances.summary.youAreOwed}
          youOwe={balances.summary.youOwe}
          netBalance={balances.summary.netBalance}
          onAddExpense={() => setIsAddModalOpen(true)}
          onSettleUp={() => setIsSettleModalOpen(true)}
        />

        {/* Member Balances Section */}
        {balances.memberBalances.length > 0 && (
          <View style={styles.section}>
            <Text style={[Typography.H2, styles.sectionTitle]}>Flatmate Balances</Text>
            <Card variant="outlined" style={styles.memberBalancesCard}>
              {balances.memberBalances.map((mb, idx) => (
                <View
                  key={mb.userId}
                  style={[
                    styles.memberBalanceRow,
                    idx !== balances.memberBalances.length - 1 && styles.memberRowBorder,
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <Avatar name={mb.name} image={mb.image} size="sm" />
                    <Text style={styles.memberName}>{mb.name}</Text>
                  </View>
                  <Text
                    style={[
                      Typography.BodySmallMedium,
                      mb.netBalance > 0
                        ? styles.netPositive
                        : mb.netBalance < 0
                        ? styles.netNegative
                        : styles.netZero,
                    ]}
                  >
                    {mb.netBalance > 0
                      ? `+₹${mb.netBalance.toFixed(2)}`
                      : mb.netBalance < 0
                      ? `-₹${Math.abs(mb.netBalance).toFixed(2)}`
                      : 'Settled'}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Category Breakdown Chart */}
        {expenses.length > 0 && <ExpenseCharts expenses={expenses} />}

        {/* Expense History List */}
        <View style={styles.section}>
          <Text style={[Typography.H2, styles.sectionTitle]}>Expense History</Text>
          {expenses.length > 0 ? (
            <Card variant="outlined" style={styles.historyCard}>
              {expenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
            </Card>
          ) : (
            <View style={styles.emptyExpenses}>
              <Receipt size={36} color={Colors.sky} />
              <Text style={[Typography.BodyMedium, styles.emptyText]}>
                No expenses logged yet. Tap "Add Expense" to split bills.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={addExpense}
        members={members}
      />

      {/* Settle Up Modal */}
      <SettleUpModal
        visible={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        onSubmit={settleUp}
        members={members}
        suggestedDebts={myDebts}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  memberBalancesCard: {
    padding: Spacing.md,
  },
  memberBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    ...Typography.BodySmallMedium,
    color: Colors.black,
  },
  netPositive: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  netNegative: {
    color: Colors.mutedNavy,
    fontWeight: '700',
  },
  netZero: {
    color: Colors.grayBlack,
  },
  historyCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  emptyExpenses: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    marginTop: Spacing.sm,
    color: Colors.grayBlack,
    textAlign: 'center',
  },
});
