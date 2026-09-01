import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useSession } from '../../store/session';
import { Repeat } from 'lucide-react-native';

export interface ExpenseItem {
  id: string;
  flatId: string;
  title: string;
  amount: string;
  paidBy: string;
  category?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
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
  onPress?: (expense: ExpenseItem) => void;
}

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, onPress }) => {
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

  const Content = (
    <View style={styles.container}>
      <Avatar
        name={expense.payerName}
        image={expense.payerImage}
        size="md"
        style={styles.avatar}
      />

      <View style={styles.contentCol}>
        <View style={styles.titleRow}>
          <View style={styles.titleWithBadges}>
            <Text style={[Typography.BodyMedium, styles.title]} numberOfLines={1}>
              {expense.title}
            </Text>
            {expense.isRecurring && (
              <View style={styles.repeatBadge}>
                <Repeat size={10} color={Colors.mutedNavy} />
              </View>
            )}
            {expense.isEdited && (
              <Text style={styles.editedText}>(edited)</Text>
            )}
          </View>
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

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(expense)}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
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
  titleWithBadges: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: Spacing.sm,
  },
  title: {
    color: Colors.black,
  },
  repeatBadge: {
    backgroundColor: Colors.offWhite,
    padding: 3,
    borderRadius: BorderRadius.sm,
  },
  editedText: {
    fontSize: 10,
    color: Colors.grayBlack,
    fontStyle: 'italic',
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
