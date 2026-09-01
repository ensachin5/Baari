import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ExpenseItem } from './ExpenseRow';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { Bell, MessageSquare, Send, Repeat, Clock } from 'lucide-react-native';

interface Comment {
  id: string;
  expenseId: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userImage?: string | null;
}

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  visible,
  expense,
  onClose,
  onRefresh,
}) => {
  const currentUserId = useSession((state) => state.user?.id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    if (!visible || !expense?.id) return;

    let mounted = true;
    setLoadingComments(true);
    api
      .get<{ comments: Comment[] }>(`/api/expenses/${expense.id}/comments`)
      .then((res) => {
        if (mounted) {
          setComments(res.comments || []);
          setLoadingComments(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingComments(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, expense?.id]);

  if (!expense) return null;

  const isPayer = expense.paidBy === currentUserId;
  const unsettledCount = expense.splits.filter((s) => !s.isSettled && s.userId !== expense.paidBy).length;

  const handleSendReminder = async () => {
    try {
      setReminding(true);
      const res = await api.post<{ message: string; remindedCount: number }>(
        `/api/expenses/${expense.id}/remind`
      );
      Alert.alert('Reminder Sent', `Sent a push reminder to ${res.remindedCount} flatmate(s).`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reminder');
    } finally {
      setReminding(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    try {
      setPostingComment(true);
      const res = await api.post<{ comment: Comment }>(`/api/expenses/${expense.id}/comments`, {
        content: commentText.trim(),
      });
      setComments((prev) => [...prev, res.comment]);
      setCommentText('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={expense.title}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {/* Header Info */}
          <View style={styles.amountContainer}>
            <Text style={[Typography.H1, styles.amountText]}>₹{parseFloat(expense.amount).toFixed(2)}</Text>
            <View style={styles.badgeRow}>
              {expense.category && <Badge label={expense.category} />}
              {expense.isRecurring && (
                <View style={styles.recurrencePill}>
                  <Repeat size={12} color={Colors.mutedNavy} />
                  <Text style={styles.recurrencePillText}>
                    Repeats {expense.recurrenceInterval || 'weekly'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Paid By */}
          <View style={styles.payerRow}>
            <Avatar name={expense.payerName} image={expense.payerImage} size="sm" />
            <Text style={styles.payerText}>
              <Text style={styles.boldText}>{isPayer ? 'You' : expense.payerName}</Text> paid on{' '}
              {formatDate(expense.createdAt)}
            </Text>
          </View>

          {expense.isEdited && (
            <View style={styles.editedRow}>
              <Clock size={12} color={Colors.grayBlack} />
              <Text style={styles.editedText}>Edited</Text>
            </View>
          )}

          {/* Splits Breakdown */}
          <Text style={[Typography.BodySmallMedium, styles.sectionTitle]}>Splits Breakdown</Text>
          <View style={styles.splitsCard}>
            {expense.splits.map((split) => (
              <View key={split.id} style={styles.splitRow}>
                <Text style={styles.splitUser}>{split.userName}</Text>
                <View style={styles.splitAmountCol}>
                  <Text style={styles.splitAmount}>₹{parseFloat(split.amountOwed).toFixed(2)}</Text>
                  <Text style={[styles.splitStatus, split.isSettled ? styles.settled : styles.pending]}>
                    {split.isSettled ? 'Settled' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Remind Button */}
          {isPayer && unsettledCount > 0 && (
            <TouchableOpacity
              style={styles.remindButton}
              onPress={handleSendReminder}
              disabled={reminding}
              activeOpacity={0.8}
            >
              <Bell size={16} color={Colors.white} />
              <Text style={styles.remindButtonText}>
                {reminding ? 'Sending...' : `Remind ${unsettledCount} flatmate(s) 💸`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Comments Section */}
          <View style={styles.commentsHeader}>
            <MessageSquare size={16} color={Colors.deepNavy} />
            <Text style={[Typography.BodySmallMedium, styles.sectionTitle, { marginBottom: 0 }]}>
              Activity & Comments ({comments.length})
            </Text>
          </View>

          <View style={styles.commentsList}>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar name={comment.userName} image={comment.userImage} size="sm" />
                <View style={styles.commentContent}>
                  <View style={styles.commentMeta}>
                    <Text style={styles.commentAuthor}>{comment.userName}</Text>
                    <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentBody}>{comment.content}</Text>
                </View>
              </View>
            ))}
            {comments.length === 0 && !loadingComments && (
              <Text style={styles.noCommentsText}>No comments yet. Leave a note below!</Text>
            )}
          </View>

          {/* New Comment Input */}
          <View style={styles.commentInputRow}>
            <Input
              placeholder="Add a comment or note..."
              value={commentText}
              onChangeText={setCommentText}
              style={styles.commentInput}
            />
            <TouchableOpacity
              style={[styles.postButton, !commentText.trim() && styles.postButtonDisabled]}
              onPress={handlePostComment}
              disabled={!commentText.trim() || postingComment}
            >
              <Send size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 500,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  amountText: {
    color: Colors.deepNavy,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recurrencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  recurrencePillText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  payerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.mutedNavy,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.deepNavy,
  },
  editedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  editedText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: Colors.deepNavy,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  splitsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  splitUser: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.deepNavy,
  },
  splitAmountCol: {
    alignItems: 'flex-end',
  },
  splitAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.deepNavy,
  },
  splitStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  settled: {
    color: '#059669',
  },
  pending: {
    color: '#D97706',
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navy,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  remindButtonText: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  commentsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.offWhite,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  commentContent: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  commentTime: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
  },
  commentBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.black,
  },
  noCommentsText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  commentInput: {
    flex: 1,
    marginBottom: 0,
  },
  postButton: {
    backgroundColor: Colors.navy,
    padding: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
