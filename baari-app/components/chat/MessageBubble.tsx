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

  if (isCurrentUser) {
    return (
      <View style={[styles.container, styles.currentUserContainer, isSending && { opacity: 0.65 }]}>
        {isFailed && onRetry && (
          <TouchableOpacity
            onPress={() => onRetry(message)}
            style={styles.retryBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCw size={14} color="#DC2626" />
          </TouchableOpacity>
        )}
        <View style={[styles.bubble, styles.currentUserBubble, isFailed && styles.failedBubble]}>
          <Text style={styles.currentUserText}>{message.content}</Text>
          <Text style={styles.currentUserTime}>
            {isSending ? 'Sending...' : isFailed ? 'Failed' : formatTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.otherUserContainer]}>
      {showSenderHeader ? (
        <Avatar
          name={message.sender?.name || 'Flatmate'}
          image={message.sender?.image}
          size="xs"
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={[styles.bubble, styles.otherUserBubble]}>
        {showSenderHeader && (
          <Text style={styles.senderName}>{message.sender?.name || 'Flatmate'}</Text>
        )}
        <Text style={styles.otherUserText}>{message.content}</Text>
        <Text style={styles.otherUserTime}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 3,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  avatar: {
    marginRight: Spacing.xs,
    marginBottom: 2,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: Spacing.xs,
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  currentUserBubble: {
    backgroundColor: Colors.sky,
    borderBottomRightRadius: 2,
  },
  otherUserBubble: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
  },
  failedBubble: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  senderName: {
    ...Typography.Caption,
    color: Colors.navy,
    fontWeight: '700',
    marginBottom: 2,
  },
  currentUserText: {
    ...Typography.Body,
    color: Colors.white,
  },
  otherUserText: {
    ...Typography.Body,
    color: Colors.navy,
  },
  currentUserTime: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.paleSky,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  otherUserTime: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  retryBtn: {
    marginRight: Spacing.xs,
    padding: Spacing.xs,
  },
});
