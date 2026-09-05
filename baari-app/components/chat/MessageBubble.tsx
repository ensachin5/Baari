import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, BorderRadius, Spacing } from '../../lib/theme';
import { RefreshCw, Check, X } from 'lucide-react-native';

export interface ChatMessage {
  id: string;
  flatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
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
  onEdit?: (messageId: string, newContent: string) => Promise<void> | void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  showSenderHeader = true,
  onRetry,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

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
  const isDeleted = Boolean(message.deletedAt);
  const isEdited = Boolean(message.editedAt) && !isDeleted;

  const handleLongPress = () => {
    if (!isCurrentUser || isDeleted || isSending || isFailed) return;

    const confirmDelete = () => {
      Alert.alert(
        'Delete Message?',
        "Delete this message? This can't be undone.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDelete?.(message.id),
          },
        ]
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Message', 'Delete Message'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setEditContent(message.content);
            setIsEditing(true);
          } else if (buttonIndex === 2) {
            confirmDelete();
          }
        }
      );
    } else {
      Alert.alert('Message Options', undefined, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            setEditContent(message.content);
            setIsEditing(true);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]);
    }
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    if (trimmed === message.content) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    onEdit?.(message.id, trimmed);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

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

        {isEditing ? (
          <View style={[styles.bubble, styles.bubbleRight, styles.editingBubble]}>
            <TextInput
              value={editContent}
              onChangeText={setEditContent}
              style={styles.editInput}
              multiline
              autoFocus
              placeholder="Edit message..."
              placeholderTextColor={Colors.paleSky}
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.editCancelBtn}
                activeOpacity={0.8}
              >
                <X size={14} color={Colors.white} />
                <Text style={styles.editBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={styles.editSaveBtn}
                activeOpacity={0.8}
              >
                <Check size={14} color={Colors.navy} />
                <Text style={[styles.editBtnText, { color: Colors.navy }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={handleLongPress}
            delayLongPress={300}
            style={[
              styles.bubble,
              styles.bubbleRight,
              isFailed && styles.failedBubble,
              isDeleted && styles.deletedBubbleRight,
            ]}
          >
            <Text
              style={[
                styles.textRight,
                isFailed && styles.failedText,
                isDeleted && styles.deletedTextRight,
              ]}
            >
              {isDeleted ? 'This message was deleted' : message.content}
            </Text>
            <View style={styles.metaRowRight}>
              {isEdited && (
                <Text style={styles.editedLabelRight}>(edited)</Text>
              )}
              <Text
                style={[
                  styles.timeRight,
                  isFailed && styles.failedTime,
                  isDeleted && styles.deletedTimeRight,
                ]}
              >
                {isSending ? 'Sending...' : isFailed ? 'Failed' : formatTime(message.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── Other user's message (left-aligned) ─────────────────────────────────
  return (
    <View style={styles.row}>
      {/* Avatar column — fixed width, always present so bubble doesn't jump */}
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
      <View
        style={[
          styles.bubble,
          styles.bubbleLeft,
          isDeleted && styles.deletedBubbleLeft,
        ]}
      >
        {showSenderHeader && !isDeleted && (
          <Text style={styles.senderName}>{message.sender?.name || 'Flatmate'}</Text>
        )}
        <Text
          style={[
            styles.textLeft,
            isDeleted && styles.deletedTextLeft,
          ]}
        >
          {isDeleted ? 'This message was deleted' : message.content}
        </Text>
        <View style={styles.metaRowLeft}>
          {isEdited && (
            <Text style={styles.editedLabelLeft}>(edited)</Text>
          )}
          <Text style={styles.timeLeft}>{formatTime(message.createdAt)}</Text>
        </View>
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
  deletedBubbleRight: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedBubbleLeft: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedTextRight: {
    ...Typography.Body,
    color: Colors.grayBlack,
    fontStyle: 'italic',
  },
  deletedTextLeft: {
    ...Typography.Body,
    color: Colors.grayBlack,
    fontStyle: 'italic',
  },
  deletedTimeRight: {
    color: Colors.grayBlack,
  },

  editingBubble: {
    width: '80%',
    backgroundColor: Colors.navy,
  },
  editInput: {
    ...Typography.Body,
    color: Colors.white,
    minHeight: 40,
    maxHeight: 120,
    padding: 0,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  editCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.paleSky,
    gap: 4,
  },
  editBtnText: {
    ...Typography.Caption,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },

  failedBubble: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  failedText: {
    color: '#991B1B',
  },
  failedTime: {
    color: '#DC2626',
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
  metaRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  metaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  editedLabelRight: {
    ...Typography.Caption,
    fontSize: 9,
    color: Colors.paleSky,
    fontStyle: 'italic',
  },
  editedLabelLeft: {
    ...Typography.Caption,
    fontSize: 9,
    color: Colors.grayBlack,
    fontStyle: 'italic',
  },
  timeLeft: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.grayBlack,
    alignSelf: 'flex-end',
  },
  timeRight: {
    ...Typography.Caption,
    fontSize: 10,
    color: Colors.paleSky,
    alignSelf: 'flex-end',
  },
  retryBtn: {
    marginRight: Spacing.xs,
    padding: Spacing.xs,
    alignSelf: 'center',
  },
});
