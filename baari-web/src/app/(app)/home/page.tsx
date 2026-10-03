"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "@/store/session";
import { useKaam } from "@/hooks/useKaam";
import { useChat } from "@/hooks/useChat";
import { useMembers } from "@/hooks/useMembers";
import { KaamTask } from "@/components/kaam/KaamCard";
import { CreateKaamModal } from "@/components/kaam/CreateKaamModal";
import { KaamDetailModal } from "@/components/kaam/KaamDetailModal";
import { api } from "@/lib/api";

import { HomeHeader } from "@/components/home/HomeHeader";
import { KaamSection } from "@/components/home/KaamSection";
import { ChatSection } from "@/components/home/ChatSection";

function formatDateDivider(isoString: string): string {
  try {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function HomePage() {
  const activeFlat = useSession((state) => state.activeFlat);
  const setActiveFlat = useSession((state) => state.setActiveFlat);
  const currentUser = useSession((state) => state.user);

  // 0 = Kaam, 1 = Chat
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [filter, setFilter] = useState<"today" | "upcoming" | "recurring">("today");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<KaamTask | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ flat: any }>("/api/flats/me")
      .then((res) => {
        if (res?.flat) {
          setActiveFlat(res.flat);
        }
      })
      .catch(() => {});
  }, [setActiveFlat]);

  // Hooks
  const {
    tasks,
    loading: kaamLoading,
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

  const { members } = useMembers();

  const memberCount = members.length > 0 ? members.length : activeFlat?.memberCount || 1;
  const memberCountText = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;

  useEffect(() => {
    if (messages.length > 0 && activeTab === 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id && !lastMsg.id.startsWith("temp-")) {
        markReadUpTo(lastMsg.id);
      }
    }
  }, [messages.length, activeTab, markReadUpTo]);

  const prevMessagesCountRef = useRef(0);

  const scrollToBottomInstant = useCallback(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop =
        chatScrollContainerRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "instant" as any });
  }, []);

  useLayoutEffect(() => {
    if (activeTab === 1) {
      scrollToBottomInstant();
      const rafId = requestAnimationFrame(() => {
        scrollToBottomInstant();
      });
      const timer = setTimeout(() => {
        scrollToBottomInstant();
      }, 50);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timer);
      };
    }
  }, [activeTab, scrollToBottomInstant]);

  useEffect(() => {
    if (activeTab === 1 && messages.length > 0) {
      if (prevMessagesCountRef.current === 0) {
        scrollToBottomInstant();
        const rafId = requestAnimationFrame(() => {
          scrollToBottomInstant();
        });
        const timer = setTimeout(() => {
          scrollToBottomInstant();
        }, 50);
        return () => {
          cancelAnimationFrame(rafId);
          clearTimeout(timer);
        };
      } else if (messages.length > prevMessagesCountRef.current) {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, activeTab, scrollToBottomInstant]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "today") {
        return t.recurrence === "daily" || t.recurrence === "once";
      }
      if (filter === "recurring") {
        return t.recurrence === "daily" || t.recurrence === "weekly";
      }
      return true;
    });
  }, [tasks, filter]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.recurrence === "daily" || t.recurrence === "once");
  }, [tasks]);

  const todayCompleted = useMemo(() => {
    return todayTasks.filter((t) => {
      const occ = t.currentOccurrence;
      if (!occ) return false;
      const occDateStr = String(occ.occurrenceDate).substring(0, 10);
      return occ.status === "done" || occDateStr > todayStr;
    }).length;
  }, [todayTasks, todayStr]);

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Header */}
      <HomeHeader
        activeFlat={activeFlat}
        memberCountText={memberCountText}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Tab Content */}
      <div className="p-4 flex-1 flex flex-col">
        {activeTab === 0 ? (
          <KaamSection
            flatId={activeFlat?.id}
            filter={filter}
            onFilterChange={setFilter}
            todayTasksCount={todayTasks.length}
            todayCompletedCount={todayCompleted}
            kaamLoading={kaamLoading}
            tasks={tasks}
            filteredTasks={filteredTasks}
            completingId={completingId}
            onSelectTask={setSelectedTaskDetail}
            onCompleteTask={completeTask}
            onDeleteTask={deleteTask}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <ChatSection
            chatLoading={chatLoading}
            messages={messages}
            chatScrollContainerRef={chatScrollContainerRef}
            chatEndRef={chatEndRef}
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
        )}
      </div>

      {/* Create Kaam Modal */}
      <CreateKaamModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createTask}
        members={members.map((m: any) => ({
          userId: m.userId,
          name: m.name,
          image: m.image,
          role: m.role || "member",
        }))}
        flatId={activeFlat?.id}
      />

      {/* Kaam Detail Modal */}
      <KaamDetailModal
        visible={!!selectedTaskDetail}
        taskId={selectedTaskDetail?.id || null}
        initialTask={selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
        onComplete={(occId) => {
          completeTask(occId);
          onKaamRefresh();
        }}
      />
    </div>
  );
}
