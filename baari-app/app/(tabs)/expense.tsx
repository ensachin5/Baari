import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useExpenses } from '../../hooks/useExpenses';
import { BalanceSummary } from '../../components/expense/BalanceSummary';
import { ExpenseRow, ExpenseItem } from '../../components/expense/ExpenseRow';
import { ExpenseCharts } from '../../components/expense/ExpenseCharts';
import { AddExpenseModal } from '../../components/expense/AddExpenseModal';
import { SettleUpModal } from '../../components/expense/SettleUpModal';
import { ExpenseDetailModal } from '../../components/expense/ExpenseDetailModal';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Receipt, Search, ArrowRight, Check, X, SlidersHorizontal } from 'lucide-react-native';

const CATEGORIES = ['All', 'Groceries', 'Utilities', 'Wi-Fi', 'Food', 'General'];

export default function ExpenseScreen() {
  const {
    expenses,
    balances,
    members,
    myDebts,
    pendingSettlements,
    search,
    category,
    loading,
    refreshing,
    setSearch,
    setCategory,
    addExpense,
    settleUp,
    confirmSettlement,
    rejectSettlement,
    onRefresh,
  } = useExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [showSimplifiedDebts, setShowSimplifiedDebts] = useState(false);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 16);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
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
        {/* Pending Settlements Confirmation Banner */}
        {pendingSettlements.length > 0 && (
          <View style={styles.section}>
            <Text style={[Typography.H2, styles.sectionTitle, { color: '#B45309' }]}>
              Pending Settle-Ups ({pendingSettlements.length})
            </Text>
            <View style={styles.pendingContainer}>
              {pendingSettlements.map((ps) => (
                <Card key={ps.id} variant="outlined" style={styles.pendingCard}>
                  <View style={styles.pendingInfo}>
                    <Avatar name={ps.payerName} image={ps.payerImage} size="sm" />
                    <View style={styles.pendingTextCol}>
                      <Text style={styles.pendingTitle}>
                        <Text style={styles.boldText}>{ps.payerName}</Text> sent ₹{parseFloat(ps.amount).toFixed(2)}
                      </Text>
                      {ps.note ? <Text style={styles.pendingNote}>"{ps.note}"</Text> : null}
                    </View>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.pendingBtn, styles.rejectBtn]}
                      onPress={() => rejectSettlement(ps.id)}
                    >
                      <X size={14} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pendingBtn, styles.confirmBtn]}
                      onPress={() => confirmSettlement(ps.id)}
                    >
                      <Check size={14} color={Colors.white} />
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Balance Summary Header Card */}
        <BalanceSummary
          youAreOwed={balances.summary.youAreOwed}
          youOwe={balances.summary.youOwe}
          netBalance={balances.summary.netBalance}
          onAddExpense={() => setIsAddModalOpen(true)}
          onSettleUp={() => setIsSettleModalOpen(true)}
        />

        {/* Member Balances / Simplified Debts Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[Typography.H2, styles.sectionTitle, { marginBottom: 0 }]}>
              {showSimplifiedDebts ? 'Simplified Debts' : 'Flatmate Balances'}
            </Text>
            <TouchableOpacity
              style={styles.toggleDebtsBtn}
              onPress={() => setShowSimplifiedDebts(!showSimplifiedDebts)}
              activeOpacity={0.7}
            >
              <SlidersHorizontal size={12} color={Colors.navy} />
              <Text style={styles.toggleDebtsBtnText}>
                {showSimplifiedDebts ? 'Show Balances' : 'Simplify Debts'}
              </Text>
            </TouchableOpacity>
          </View>

          {showSimplifiedDebts ? (
            /* Simplified Debts Plan (Splitwise-inspired minimal transfers) */
            <Card variant="outlined" style={styles.memberBalancesCard}>
              {balances.simplifiedDebts.length > 0 ? (
                balances.simplifiedDebts.map((debt, idx) => (
                  <View
                    key={`${debt.fromUserId}-${debt.toUserId}`}
                    style={[
                      styles.simplifiedRow,
                      idx !== balances.simplifiedDebts.length - 1 && styles.memberRowBorder,
                    ]}
                  >
                    <Text style={styles.debtorName}>{debt.fromUserName}</Text>
                    <View style={styles.arrowContainer}>
                      <Text style={styles.debtAmount}>pays ₹{debt.amount.toFixed(2)}</Text>
                      <ArrowRight size={14} color={Colors.mutedNavy} />
                    </View>
                    <Text style={styles.creditorName}>{debt.toUserName}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.allSettledText}>All flat debts are settled!</Text>
              )}
            </Card>
          ) : (
            /* Individual Net Balances */
            balances.memberBalances.length > 0 && (
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
            )
          )}
        </View>

        {/* Category Breakdown Chart */}
        {expenses.length > 0 && <ExpenseCharts expenses={expenses} />}

        {/* Expense History List with Search & Category Filters */}
        <View style={styles.section}>
          <Text style={[Typography.H2, styles.sectionTitle]}>Expense History</Text>

          {/* Search Box */}
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.grayBlack} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by description or merchant..."
              placeholderTextColor={Colors.grayBlack}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color={Colors.grayBlack} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {expenses.length > 0 ? (
            <Card variant="outlined" style={styles.historyCard}>
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onPress={(exp) => setSelectedExpense(exp)}
                />
              ))}
            </Card>
          ) : (
            <View style={styles.emptyExpenses}>
              <Receipt size={36} color={Colors.sky} />
              <Text style={[Typography.BodyMedium, styles.emptyText]}>
                {search || category !== 'All'
                  ? 'No matching expenses found.'
                  : 'No expenses logged yet. Tap "Add Expense" to split bills.'}
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

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        visible={!!selectedExpense}
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onRefresh={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  toggleDebtsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  toggleDebtsBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.navy,
  },
  pendingContainer: {
    gap: Spacing.xs,
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  pendingTextCol: {
    flex: 1,
  },
  pendingTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#92400E',
  },
  pendingNote: {
    ...Typography.Caption,
    fontSize: 11,
    color: '#B45309',
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: '700',
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  confirmBtn: {
    backgroundColor: '#059669',
  },
  confirmBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.white,
  },
  rejectBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#DC2626',
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
    ...Typography.BodyMedium,
    color: Colors.black,
  },
  simplifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  debtorName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.deepNavy,
    flex: 1,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
  },
  debtAmount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.mutedNavy,
  },
  creditorName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#059669',
    textAlign: 'right',
    flex: 1,
  },
  allSettledText: {
    ...Typography.Caption,
    color: '#059669',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    fontWeight: '600',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.black,
  },
  categoryScroll: {
    marginBottom: Spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  categoryChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.mutedNavy,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  historyCard: {
    paddingHorizontal: Spacing.md,
  },
  emptyExpenses: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.mutedNavy,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
