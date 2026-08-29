import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  FlatList,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useSession } from '../../store/session';
import { useKaam } from '../../hooks/useKaam';
import { useChat } from '../../hooks/useChat';
import { useExpenses } from '../../hooks/useExpenses';
import { KaamCard } from '../../components/kaam/KaamCard';
import { CreateKaamModal } from '../../components/kaam/CreateKaamModal';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Card } from '../../components/ui/Card';
import {
  Plus,
  MessageSquare,
  CheckSquare,
  Sparkles,
} from 'lucide-react-native';

export default function HomeScreen() {
  const activeFlat = useSession((state) => state.activeFlat);
  const currentUser = useSession((state) => state.user);

  const [activePage, setActivePage] = useState(0);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'recurring'>('today');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const chatFlatListRef = useRef<FlatList>(null);

  // Custom Hooks
  const {
    tasks,
    loading: kaamLoading,
    refreshing: kaamRefreshing,
    completingId,
    completeTask,
    createTask,
    onRefresh: onKaamRefresh,
  } = useKaam();

  const { messages, sendMessage } = useChat();
  const { members } = useExpenses();

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (messages.length > 0 && activePage === 1) {
      setTimeout(() => {
        chatFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, activePage]);

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
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar with Flat Title & Page Indicator */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[Typography.Caption, styles.topFlatLabel]}>ACTIVE FLAT</Text>
          <Text style={Typography.H1}>{activeFlat?.name || 'Baari Flat'}</Text>
        </View>

        {/* 2-Page Indicator Switcher */}
        <View style={styles.indicatorContainer}>
          <TouchableOpacity
            onPress={() => setActivePage(0)}
            style={[styles.indicatorDotBtn, activePage === 0 && styles.indicatorActive]}
          >
            <CheckSquare
              size={16}
              color={activePage === 0 ? Colors.white : Colors.mutedNavy}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActivePage(1)}
            style={[styles.indicatorDotBtn, activePage === 1 && styles.indicatorActive]}
          >
            <MessageSquare
              size={16}
              color={activePage === 1 ? Colors.white : Colors.mutedNavy}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* PAGE 0: KAAM LIST */}
      {activePage === 0 && (
        <View style={styles.page}>
          <ScrollView
            contentContainerStyle={styles.kaamScrollContent}
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
                  loading={completingId === task.currentOccurrence?.id}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Sparkles size={40} color={Colors.sky} />
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
      )}

      {/* PAGE 1: FLAT GROUP CHAT */}
      {activePage === 1 && (
        <View style={styles.page}>
          <View style={styles.chatHeader}>
            <Text style={Typography.H2}>Flat Group Chat</Text>
            <Text style={[Typography.Caption, styles.chatSubtext]}>
              Tap the task icon to return to Kaam list
            </Text>
          </View>

          <FlatList
            ref={chatFlatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isCurrentUser={item.senderId === currentUser?.id}
              />
            )}
            contentContainerStyle={styles.chatListContent}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MessageSquare size={36} color={Colors.sky} />
                <Text style={[Typography.BodyMedium, styles.emptyChatText]}>
                  No messages yet. Say hello to your flatmates!
                </Text>
              </View>
            }
          />

          <ChatInput onSend={sendMessage} />
        </View>
      )}

      {/* Create Kaam Sheet */}
      <CreateKaamModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createTask}
        members={members as any}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
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
  topFlatLabel: {
    color: Colors.grayBlack,
    letterSpacing: 1,
    fontWeight: '700',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  indicatorActive: {
    backgroundColor: Colors.navy,
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
  chatListContent: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyChatText: {
    marginTop: Spacing.md,
    color: Colors.grayBlack,
  },
});
