import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';
import { RefreshCw } from 'lucide-react-native';

export interface ChatMessage {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
  reads?: any[];
  sender?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  showSenderHeader?: boolean;
  onRetry?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSenderHeader = true,
  onRetry,
}) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';

  // ── Current user's message (right-aligned) ──────────────────────────────
  if (isCurrentUser) {
    return (
      <View style={[styles.row, styles.rowRight, isSending && { opacity: 0.65 }]}>
        {isFailed && onRetry && (
          <TouchableOpacity
            onPress={() => onRetry(message)}
            style={styles.retryBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCw size={14} color="#DC2626" />
          </TouchableOpacity>
        )}
        <View style={[styles.bubble, styles.bubbleRight, isFailed && styles.failedBubble]}>
          <Text style={styles.textRight}>{message.content}</Text>
          <Text style={styles.timeRight}>
            {isSending ? 'Sending...' : isFailed ? 'Failed' : formatTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  // ── Other user's message (left-aligned) ─────────────────────────────────
  return (
    <View style={styles.row}>
      {/* Avatar column — 28px wide, always present so bubble doesn't jump */}
      <View style={styles.avatarCol}>
        {showSenderHeader ? (
          <Avatar
            name={message.sender?.name || 'Flatmate'}
            image={message.sender?.image}
            size="xs"
          />
        ) : null}
      </View>

      {/* Bubble column */}
      <View style={[styles.bubble, styles.bubbleLeft]}>
        {showSenderHeader && (
          <Text style={styles.senderName}>{message.sender?.name || 'Flatmate'}</Text>
        )}
        <Text style={styles.textLeft}>{message.content}</Text>
        <Text style={styles.timeLeft}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
};

const AVATAR_COL_WIDTH = 36;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
  },
  rowRight: {
    justifyContent: 'flex-end',
  },

  // Avatar column: fixed width, bottom-aligned
  avatarCol: {
    width: AVATAR_COL_WIDTH,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    marginRight: Spacing.xs,
  },

  bubble: {
    maxWidth: '75%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bubbleLeft: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
  },
  bubbleRight: {
    backgroundColor: Colors.sky,
    borderBottomRightRadius: 2,
  },
  failedBubble: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  senderName: {
    ...Typography.Caption,
    color: Colors.navy,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  textLeft: {
    ...Typography.Body,
    color: Colors.navy,
  },
  textRight: {
    ...Typography.Body,
    color: Colors.white,
  },
  timeLeft: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timeRight: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.paleSky,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  retryBtn: {
    marginRight: Spacing.xs,
    padding: Spacing.xs,
    alignSelf: 'center',
  },
});
