import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';

export interface ChatMessage {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
}) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (isCurrentUser) {
    return (
      <View style={[styles.container, styles.currentUserContainer]}>
        <View style={[styles.bubble, styles.currentUserBubble]}>
          <Text style={styles.currentUserText}>{message.content}</Text>
          <Text style={styles.currentUserTime}>{formatTime(message.createdAt)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.otherUserContainer]}>
      <Avatar
        name={message.sender?.name || 'Flatmate'}
        image={message.sender?.image}
        size="xs"
        style={styles.avatar}
      />
      <View style={[styles.bubble, styles.otherUserBubble]}>
        <Text style={styles.senderName}>{message.sender?.name || 'Flatmate'}</Text>
        <Text style={styles.otherUserText}>{message.content}</Text>
        <Text style={styles.otherUserTime}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
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
  bubble: {
    maxWidth: '78%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  currentUserBubble: {
    backgroundColor: Colors.paleSky,
    borderBottomRightRadius: 2,
  },
  otherUserBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
  },
  senderName: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '700',
    marginBottom: 2,
  },
  currentUserText: {
    ...Typography.Body,
    color: Colors.deepNavy,
  },
  otherUserText: {
    ...Typography.Body,
    color: Colors.black,
  },
  currentUserTime: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.mutedNavy,
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
});
