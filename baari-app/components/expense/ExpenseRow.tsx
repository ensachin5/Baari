import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useSession } from '../../store/session';

export interface ExpenseItem {
  id: string;
  flatId: string;
  title: string;
  amount: string;
  paidBy: string;
  category?: string | null;
  createdAt: string;
  payerName: string;
  payerImage?: string | null;
  splits: {
    id: string;
    userId: string;
    amountOwed: string;
    isSettled: boolean;
    userName: string;
  }[];
}

interface ExpenseRowProps {
  expense: ExpenseItem;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense }) => {
  const currentUserId = useSession((state) => state.user?.id);
  const isPayer = expense.paidBy === currentUserId;

  const mySplit = expense.splits.find((s) => s.userId === currentUserId);
  const userShare = mySplit ? parseFloat(mySplit.amountOwed) : 0;
  const totalAmount = parseFloat(expense.amount);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Avatar
        name={expense.payerName}
        image={expense.payerImage}
        size="md"
        style={styles.avatar}
      />

      <View style={styles.contentCol}>
        <View style={styles.titleRow}>
          <Text style={[Typography.BodyMedium, styles.title]} numberOfLines={1}>
            {expense.title}
          </Text>
          <Text style={[Typography.BodyMedium, styles.totalAmount]}>
            ₹{totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[Typography.Caption, styles.paidByText]}>
            {isPayer ? 'You paid' : `${expense.payerName} paid`} • {formatDate(expense.createdAt)}
          </Text>

          {/* User's individual share indication */}
          {isPayer ? (
            <Text style={[Typography.Caption, styles.lentText]}>
              lent ₹{(totalAmount - userShare).toFixed(2)}
            </Text>
          ) : userShare > 0 ? (
            <Text style={[Typography.Caption, styles.borrowedText]}>
              you owe ₹{userShare.toFixed(2)}
            </Text>
          ) : (
            <Text style={[Typography.Caption, styles.notInvolvedText]}>not involved</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    marginRight: Spacing.md,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    flex: 1,
    marginRight: Spacing.sm,
    color: Colors.black,
  },
  totalAmount: {
    fontWeight: '700',
    color: Colors.black,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paidByText: {
    color: Colors.grayBlack,
  },
  lentText: {
    color: Colors.deepNavy,
    fontWeight: '700',
  },
  borrowedText: {
    color: Colors.mutedNavy,
    fontWeight: '700',
  },
  notInvolvedText: {
    color: Colors.grayBlack,
  },
});
