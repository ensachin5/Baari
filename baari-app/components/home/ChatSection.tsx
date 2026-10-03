import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { MessageBubble, ChatMessage } from '../chat/MessageBubble';
import { ChatInput } from '../chat/ChatInput';
import { MessageCircle } from 'lucide-react-native';
import { TypingUser } from '../../hooks/useChat';

interface ChatSectionProps {
  keyboardHeight: number;
  chatLoading: boolean;
  messages: ChatMessage[];
  reversedMessages: ChatMessage[];
  chatFlatListRef: React.RefObject<FlatList | null>;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  currentUser: { id: string } | null;
  retryMessage: (message: ChatMessage) => void;
  editMessage: (id: string, text: string) => void;
  deleteMessage: (id: string) => void;
  sendMessage: (text: string) => void;
  emitTyping: (isTyping: boolean) => void;
  typingUsers: TypingUser[];
  formatDateDivider: (isoString: string) => string;
}

export const ChatSection: React.FC<ChatSectionProps> = React.memo(({
  keyboardHeight,
  chatLoading,
  messages,
  reversedMessages,
  chatFlatListRef,
  hasMore,
  loadingMore,
  loadMore,
  currentUser,
  retryMessage,
  editMessage,
  deleteMessage,
  sendMessage,
  emitTyping,
  formatDateDivider,
}) => {
  return (
    <View
      style={[
        styles.page,
        { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.chatHeader}>
          <Text style={Typography.H2}>Flat Group Chat</Text>
          <Text style={[Typography.Caption, styles.chatSubtext]}>
            Realtime chat with flatmates
          </Text>
        </View>

        {chatLoading && messages.length === 0 ? (
          <View style={styles.chatLoadingContainer}>
            <ActivityIndicator size="large" color={Colors.navy} />
          </View>
        ) : (
          <FlatList
            ref={chatFlatListRef}
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            inverted={true}
            style={styles.chatFlatList}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            removeClippedSubviews={Platform.OS !== 'web'}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={9}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasMore && !loadingMore) {
                loadMore();
              }
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMoreIndicator}>
                  <ActivityIndicator size="small" color={Colors.navy} />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const nextOlderMsg = index < reversedMessages.length - 1 ? reversedMessages[index + 1] : null;
              const isDifferentSender = !nextOlderMsg || nextOlderMsg.senderId !== item.senderId;
              const currentDate = formatDateDivider(item.createdAt);
              const olderDate = nextOlderMsg ? formatDateDivider(nextOlderMsg.createdAt) : null;
              const showDateDivider = currentDate && currentDate !== olderDate;

              return (
                <View
                  key={item.id}
                  style={{
                    marginTop: showDateDivider ? 0 : isDifferentSender ? Spacing.sm : 2,
                  }}
                >
                  {showDateDivider && (
                    <View style={styles.dateDivider}>
                      <Text style={styles.dateDividerText}>{currentDate}</Text>
                    </View>
                  )}
                  <MessageBubble
                    message={item}
                    isCurrentUser={item.senderId === currentUser?.id}
                    showSenderHeader={isDifferentSender}
                    onRetry={retryMessage}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                  />
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MessageCircle size={44} color={Colors.sky} strokeWidth={1.75} />
                <Text style={[Typography.H2, styles.emptyChatTitle]}>
                  No messages yet
                </Text>
                <Text style={[Typography.BodySmall, styles.emptyChatSub]}>
                  Start the conversation with your flatmates!
                </Text>
              </View>
            }
          />
        )}

        <ChatInput
          onSend={sendMessage}
          onTyping={emitTyping}
        />
      </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chatSubtext: {
    color: Colors.mutedNavy,
    marginTop: 1,
  },
  chatLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatFlatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  loadMoreIndicator: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateDividerText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.mutedNavy,
    backgroundColor: Colors.paleSky,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    transform: [{ scaleY: -1 }], // inverted list
  },
  emptyChatTitle: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptyChatSub: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    color: Colors.grayBlack,
  },
});
