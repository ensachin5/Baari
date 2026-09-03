import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { useKaam } from '../../hooks/useKaam';
import { useChat } from '../../hooks/useChat';
import { useExpenses } from '../../hooks/useExpenses';
import { KaamCard } from '../../components/kaam/KaamCard';
import { CreateKaamModal } from '../../components/kaam/CreateKaamModal';
import { SkipTurnModal } from '../../components/kaam/SkipTurnModal';
import { MessageBubble, ChatMessage } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Card } from '../../components/ui/Card';
import {
  Plus,
  MessageCircle,
  CheckSquare2,
  ClipboardCheck,
} from 'lucide-react-native';

function formatDateDivider(isoString: string): string {
  try {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function HomeScreen() {
  const activeFlat = useSession((state) => state.activeFlat);
  const setActiveFlat = useSession((state) => state.setActiveFlat);
  const currentUser = useSession((state) => state.user);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 16);

  const [activePage, setActivePage] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'recurring'>('today');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [skipModalState, setSkipModalState] = useState<{
    visible: boolean;
    occId: string;
    taskTitle: string;
  }>({
    visible: false,
    occId: '',
    taskTitle: '',
  });

  const chatFlatListRef = useRef<FlatList>(null);

  const handleSwitchPage = (pageIndex: number) => {
    setActivePage(pageIndex);
    pagerRef.current?.setPage(pageIndex);
  };

  // Ensure activeFlat is fresh and contains accurate database name and memberCount
  useEffect(() => {
    api
      .get<{ flat: any }>('/api/flats/me')
      .then((res) => {
        if (res?.flat) {
          setActiveFlat({
            id: res.flat.id,
            name: res.flat.name,
            inviteCode: res.flat.inviteCode,
            role: res.flat.role,
            memberCount: res.flat.memberCount,
          });
        }
      })
      .catch(() => {});
  }, [setActiveFlat]);

  // Custom Hooks
  const {
    tasks,
    loading: kaamLoading,
    refreshing: kaamRefreshing,
    completingId,
    completeTask,
    createTask,
    deleteTask,
    onRefresh: onKaamRefresh,
  } = useKaam();

  const {
    messages,
    loading: chatLoading,
    loadingMore,
    hasMore,
    typingUsers,
    sendMessage,
    retryMessage,
    emitTyping,
    markReadUpTo,
    loadMore,
  } = useChat();
  const { members } = useExpenses();

  const memberCount = members.length > 0 ? members.length : (activeFlat?.memberCount || 1);
  const memberCountText = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

  // Scroll chat to bottom on new messages and mark read
  useEffect(() => {
    if (messages.length > 0 && activePage === 1) {
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id) {
        markReadUpTo(lastMsg.id);
      }
    }
  }, [messages.length, activePage, markReadUpTo]);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'today') {
      return t.recurrence === 'daily' || t.recurrence === 'once';
    }
    if (filter === 'recurring') {
      return t.recurrence === 'daily' || t.recurrence === 'weekly';
    }
    return true; // upcoming
  });

  const todayTasks = tasks.filter((t) => t.recurrence === 'daily' || t.recurrence === 'once');
  const todayCompleted = todayTasks.filter((t) => t.currentOccurrence?.status === 'done').length;

  return (
    <View style={styles.safeArea}>
      {/* Top Bar with Flat Title & Page Indicator */}
      <View style={[styles.topHeader, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.topFlatLabel}>Baari</Text>
          {activeFlat?.name ? (
            <View style={styles.flatTitleRow}>
              <Text style={[Typography.H1, styles.flatNameText]} numberOfLines={1}>
                {activeFlat.name}
              </Text>
              <Text style={[Typography.Caption, styles.memberCountText]}>
                · {memberCountText}
              </Text>
            </View>
          ) : (
            <View style={styles.headerSkeleton} />
          )}
        </View>

        {/* 2-Page Indicator Switcher */}
        <View style={styles.indicatorContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSwitchPage(0)}
            style={[styles.indicatorDotBtn, activePage === 0 && styles.indicatorActive]}
          >
            <CheckSquare2
              size={13}
              color={activePage === 0 ? Colors.white : Colors.mutedNavy}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.indicatorText,
                activePage === 0 && styles.indicatorTextActive,
              ]}
            >
              Kaam
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSwitchPage(1)}
            style={[styles.indicatorDotBtn, activePage === 1 && styles.indicatorActive]}
          >
            <MessageCircle
              size={13}
              color={activePage === 1 ? Colors.white : Colors.mutedNavy}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.indicatorText,
                activePage === 1 && styles.indicatorTextActive,
              ]}
            >
              Chat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2-Page Horizontal PagerView */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setActivePage(e.nativeEvent.position)}
      >
        {/* PAGE 0: KAAM LIST */}
        <View key="0" style={styles.page}>
          <ScrollView
            contentContainerStyle={styles.kaamScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={kaamRefreshing}
                onRefresh={onKaamRefresh}
                tintColor={Colors.navy}
              />
            }
          >
            {/* Filter Tabs */}
            <SegmentedControl
              options={[
                { label: 'Today', value: 'today' },
                { label: 'Upcoming', value: 'upcoming' },
                { label: 'Recurring', value: 'recurring' },
              ]}
              selected={filter}
              onSelect={(val) => setFilter(val as any)}
              style={styles.filterControl}
            />

            {/* Today's Summary Card */}
            {filter === 'today' && (
              <Card style={styles.summaryCard} variant="muted">
                <View style={styles.summaryRow}>
                  <View>
                    <Text style={Typography.H2}>Today's Kaam</Text>
                    <Text style={[Typography.BodySmall, styles.summarySubtitle]}>
                      {todayCompleted} of {todayTasks.length} tasks completed
                    </Text>
                  </View>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>
                      {todayTasks.length > 0
                        ? `${Math.round((todayCompleted / todayTasks.length) * 100)}%`
                        : '100%'}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Kaam Cards */}
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <KaamCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                  onSkipTurn={(occId, taskTitle) =>
                    setSkipModalState({ visible: true, occId, taskTitle })
                  }
                  loading={completingId === task.currentOccurrence?.id}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <ClipboardCheck size={40} color={Colors.sky} strokeWidth={1.8} />
                <Text style={[Typography.H2, styles.emptyTitle]}>
                  No Kaam due in this view!
                </Text>
                <Text style={[Typography.BodySmall, styles.emptyText]}>
                  Tap the + button below to create a new shared household task.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Floating Action Button for Create Task */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setIsCreateModalOpen(true)}
            style={styles.fab}
          >
            <Plus size={24} color={Colors.white} />
            <Text style={styles.fabText}>Create Kaam</Text>
          </TouchableOpacity>
        </View>

        {/* PAGE 1: REALTIME GROUP CHAT */}
        <View key="1" style={styles.page}>
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
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatListContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (messages.length > 0) {
                    chatFlatListRef.current?.scrollToEnd({ animated: true });
                  }
                }}
                onLayout={() => {
                  if (messages.length > 0) {
                    chatFlatListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onScroll={({ nativeEvent }) => {
                  // Fetch older messages when scrolled near top
                  if (nativeEvent.contentOffset.y < 40 && hasMore && !loadingMore) {
                    loadMore();
                  }
                }}
                scrollEventThrottle={200}
                ListHeaderComponent={
                  loadingMore ? (
                    <View style={styles.loadMoreIndicator}>
                      <ActivityIndicator size="small" color={Colors.navy} />
                    </View>
                  ) : null
                }
                renderItem={({ item, index }) => {
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isDifferentSender = !prevMsg || prevMsg.senderId !== item.senderId;
                  const currentDate = formatDateDivider(item.createdAt);
                  const prevDate = prevMsg ? formatDateDivider(prevMsg.createdAt) : null;
                  const showDateDivider = currentDate && currentDate !== prevDate;

                  return (
                    <View key={item.id}>
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
                    <Text style={[Typography.BodySmall, styles.emptyChatText]}>
                      Say hi to your flatmates to kick off the conversation!
                    </Text>
                  </View>
                }
              />
            )}

            {/* Typing Indicator Bar */}
            {typingUsers.length > 0 && (
              <View style={styles.typingBar}>
                <Text style={styles.typingText}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].userName} is typing...`
                    : typingUsers.length === 2
                    ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
                    : `${typingUsers.length} people are typing...`}
                </Text>
              </View>
            )}

            <ChatInput onSend={sendMessage} onTyping={emitTyping} />
          </KeyboardAvoidingView>
        </View>
      </PagerView>

      {/* Create Kaam Sheet */}
      <CreateKaamModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createTask}
        members={members as any}
        flatId={activeFlat?.id}
      />

      {/* Skip Turn Sheet */}
      <SkipTurnModal
        visible={skipModalState.visible}
        taskTitle={skipModalState.taskTitle}
        occurrenceId={skipModalState.occId}
        onClose={() => setSkipModalState((s) => ({ ...s, visible: false }))}
        onSuccess={() => onKaamRefresh()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  topFlatLabel: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  flatTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  flatNameText: {
    flexShrink: 1,
  },
  memberCountText: {
    color: Colors.grayBlack,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  headerSkeleton: {
    width: 110,
    height: 22,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  indicatorContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.full,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  indicatorDotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  indicatorActive: {
    backgroundColor: Colors.navy,
  },
  indicatorText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.mutedNavy,
  },
  indicatorTextActive: {
    color: Colors.white,
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  kaamScrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 90,
  },
  filterControl: {
    marginBottom: Spacing.md,
  },
  summaryCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.paleSky,
    borderColor: Colors.paleSky,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summarySubtitle: {
    marginTop: 2,
    color: Colors.deepNavy,
  },
  summaryBadge: {
    backgroundColor: Colors.deepNavy,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  summaryBadgeText: {
    ...Typography.Caption,
    color: Colors.white,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    shadowColor: Colors.deepNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    ...Typography.BodyMedium,
    color: Colors.white,
    fontWeight: '700',
  },
  chatHeader: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatSubtext: {
    color: Colors.grayBlack,
    marginTop: 2,
  },
  chatLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreIndicator: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  chatListContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  dateDivider: {
    alignSelf: 'center',
    backgroundColor: Colors.offWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateDividerText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyChatTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyChatText: {
    textAlign: 'center',
    color: Colors.grayBlack,
    maxWidth: 240,
  },
  typingBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 4,
    backgroundColor: Colors.white,
  },
  typingText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontStyle: 'italic',
  },
});
