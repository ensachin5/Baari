import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { PagerViewWrapper } from '../../components/ui/PagerViewWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { useKaam } from '../../hooks/useKaam';
import { useChat } from '../../hooks/useChat';
import { useExpenses } from '../../hooks/useExpenses';
import { KaamTask } from '../../components/kaam/KaamCard';
import { CreateKaamModal } from '../../components/kaam/CreateKaamModal';
import { KaamDetailModal } from '../../components/kaam/KaamDetailModal';
import { SkipTurnModal } from '../../components/kaam/SkipTurnModal';
import { triggerHaptic } from '../../lib/haptics';

import { HomeHeader } from '../../components/home/HomeHeader';
import { KaamSection } from '../../components/home/KaamSection';
import { ChatSection } from '../../components/home/ChatSection';

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
  const pagerRef = useRef<any>(null);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'recurring'>('today');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KaamTask | null>(null);
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSwitchPage = useCallback((pageIndex: number) => {
    setActivePage(pageIndex);
    pagerRef.current?.setPage(pageIndex);
  }, []);

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
    editMessage,
    deleteMessage,
    emitTyping,
    markReadUpTo,
    loadMore,
  } = useChat();
  const { members } = useExpenses();

  const memberCount = members.length > 0 ? members.length : (activeFlat?.memberCount || 1);
  const memberCountText = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

  const reversedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && activePage === 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id) {
        markReadUpTo(lastMsg.id);
      }
    }
  }, [messages.length, activePage, markReadUpTo]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'today') {
        return t.recurrence === 'daily' || t.recurrence === 'once';
      }
      if (filter === 'recurring') {
        return t.recurrence === 'daily' || t.recurrence === 'weekly';
      }
      return true;
    });
  }, [tasks, filter]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.recurrence === 'daily' || t.recurrence === 'once');
  }, [tasks]);

  const todayCompleted = useMemo(() => {
    return todayTasks.filter((t) => {
      const occ = t.currentOccurrence;
      if (!occ) return false;
      const occDateStr = String(occ.occurrenceDate).substring(0, 10);
      return occ.status === 'done' || occDateStr > todayStr;
    }).length;
  }, [todayTasks, todayStr]);

  const handleCompleteTask = useCallback((occId: string) => {
    triggerHaptic('success');
    completeTask(occId);
  }, [completeTask]);

  const handleSkipTurn = useCallback((occId: string, taskTitle: string) => {
    setSkipModalState({ visible: true, occId, taskTitle });
  }, []);

  return (
    <View style={styles.safeArea}>
      {/* Top Header */}
      <HomeHeader
        topInset={topInset}
        activeFlat={activeFlat}
        memberCountText={memberCountText}
        activePage={activePage}
        onSwitchPage={handleSwitchPage}
      />

      {/* 2-Page Horizontal PagerView */}
      <PagerViewWrapper
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e: any) => setActivePage(e.nativeEvent.position)}
      >
        {/* PAGE 0: KAAM LIST */}
        <KaamSection
          key="0"
          flatId={activeFlat?.id}
          filter={filter}
          onFilterChange={setFilter}
          todayTasksCount={todayTasks.length}
          todayCompletedCount={todayCompleted}
          kaamLoading={kaamLoading}
          kaamRefreshing={kaamRefreshing}
          onKaamRefresh={onKaamRefresh}
          tasks={tasks}
          filteredTasks={filteredTasks}
          completingId={completingId}
          onSelectTask={setSelectedTaskDetail}
          onCompleteTask={handleCompleteTask}
          onDeleteTask={deleteTask}
          onSkipTurn={handleSkipTurn}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />

        {/* PAGE 1: REALTIME GROUP CHAT */}
        <ChatSection
          key="1"
          keyboardHeight={keyboardHeight}
          chatLoading={chatLoading}
          messages={messages}
          reversedMessages={reversedMessages}
          chatFlatListRef={chatFlatListRef}
          hasMore={hasMore}
          loadingMore={loadingMore}
          loadMore={loadMore}
          currentUser={currentUser}
          retryMessage={retryMessage}
          editMessage={editMessage}
          deleteMessage={deleteMessage}
          sendMessage={sendMessage}
          emitTyping={emitTyping}
          typingUsers={typingUsers}
          formatDateDivider={formatDateDivider}
        />
      </PagerViewWrapper>

      {/* Create Kaam Modal */}
      <CreateKaamModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createTask}
        members={members.map((m: any) => ({
          userId: m.userId,
          name: m.name,
          image: m.image,
          role: (m.role as 'admin' | 'member') || 'member',
        }))}
        flatId={activeFlat?.id}
      />

      {/* Kaam Detail Modal */}
      <KaamDetailModal
        visible={!!selectedTaskDetail}
        taskId={selectedTaskDetail?.id || null}
        initialTask={selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        onComplete={completeTask}
      />

      {/* Skip Turn Confirmation Modal */}
      <SkipTurnModal
        visible={skipModalState.visible}
        onClose={() => setSkipModalState({ visible: false, occId: '', taskTitle: '' })}
        occurrenceId={skipModalState.occId}
        taskTitle={skipModalState.taskTitle}
        onSuccess={() => onKaamRefresh()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pagerView: {
    flex: 1,
  },
});
