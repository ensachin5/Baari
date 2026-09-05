"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "@/store/session";
import { useKaam } from "@/hooks/useKaam";
import { useChat } from "@/hooks/useChat";
import { useMembers } from "@/hooks/useMembers";
import { KaamCard, KaamTask } from "@/components/kaam/KaamCard";
import { CreateKaamModal } from "@/components/kaam/CreateKaamModal";
import { KaamDetailModal } from "@/components/kaam/KaamDetailModal";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";
import {
  Plus,
  MessageCircle,
  CheckSquare2,
  ClipboardCheck,
} from "lucide-react";
import { api } from "@/lib/api";

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

/**
 * Mirrors baari-app/app/(tabs)/home.tsx exactly.
 */
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

  // Ensure flat info is fresh
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

  const memberCount =
    members.length > 0 ? members.length : activeFlat?.memberCount || 1;
  const memberCountText = `${memberCount} ${
    memberCount === 1 ? "member" : "members"
  }`;

  // Mark latest message read when viewing chat tab
  useEffect(() => {
    if (messages.length > 0 && activeTab === 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id && !lastMsg.id.startsWith("temp-")) {
        markReadUpTo(lastMsg.id);
      }
    }
  }, [messages.length, activeTab, markReadUpTo]);

  // Auto scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (activeTab === 1) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "today") {
        return t.recurrence === "daily" || t.recurrence === "once";
      }
      if (filter === "recurring") {
        return t.recurrence === "daily" || t.recurrence === "weekly";
      }
      return true; // upcoming
    });
  }, [tasks, filter]);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.recurrence === "daily" || t.recurrence === "once"),
    [tasks]
  );
  const todayCompleted = useMemo(
    () => todayTasks.filter((t) => t.currentOccurrence?.status === "done").length,
    [todayTasks]
  );

  // Detect mobile virtual keyboard
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkViewport = () => {
      if (window.visualViewport) {
        const isKeyboard = window.visualViewport.height < window.innerHeight - 120;
        setIsKeyboardVisible(isKeyboard);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        window.innerWidth < 768
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null;
        if (
          !active ||
          (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")
        ) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", checkViewport);
      window.visualViewport.addEventListener("scroll", checkViewport);
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", checkViewport);
        window.visualViewport.removeEventListener("scroll", checkViewport);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return (
    <div
      className={`flex flex-col max-w-4xl mx-auto w-full min-h-0 flex-1 ${
        activeTab === 0
          ? "min-h-[calc(100vh-4rem)] pb-20 md:pb-6"
          : isKeyboardVisible
          ? "h-[calc(100dvh-4rem)] pb-0 md:pb-0"
          : "h-[calc(100dvh-4rem)] pb-16 has-[input:focus]:pb-0 md:pb-0"
      }`}
    >
      {/* Top Header Row matching baari-app styles.topHeader */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white sticky top-16 z-20 flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="text-[10px] leading-[14px] font-bold text-mutedNavy tracking-[1.2px] uppercase mb-[2px]">
            BAARI
          </p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <h1 className="text-[22px] leading-[28px] font-semibold text-black truncate">
              {activeFlat?.name || "My Flat"}
            </h1>
            <span className="text-[12px] leading-[16px] font-medium text-grayBlack">
              · {memberCountText}
            </span>
          </div>
        </div>

        {/* 2-Page Indicator Switcher matching styles.indicatorContainer */}
        <div className="flex items-center bg-offWhite rounded-full p-[3px] gap-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            className={`flex items-center gap-1.5 py-[5px] px-[10px] rounded-full text-[12px] leading-[16px] font-semibold transition-all cursor-pointer ${
              activeTab === 0
                ? "bg-navy text-white shadow-xs"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <CheckSquare2
              size={13}
              className={activeTab === 0 ? "text-white" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span>Kaam</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab(1)}
            className={`flex items-center gap-1.5 py-[5px] px-[10px] rounded-full text-[12px] leading-[16px] font-semibold transition-all cursor-pointer ${
              activeTab === 1
                ? "bg-navy text-white shadow-xs"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <MessageCircle
              size={13}
              className={activeTab === 1 ? "text-white" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* VIEW 0: KAAM LIST */}
      {activeTab === 0 && (
        <div className="relative flex-1 px-5 pt-3">
          {/* Filter Tabs */}
          <SegmentedControl
            options={[
              { label: "Today", value: "today" },
              { label: "Upcoming", value: "upcoming" },
              { label: "Recurring", value: "recurring" },
            ]}
            selected={filter}
            onSelect={(val) => setFilter(val as any)}
            className="mb-3"
          />

          {/* Today's Summary Card (when filter === 'today') */}
          {filter === "today" && (
            <Card
              className="mb-3 bg-paleSky border-paleSky p-4"
              variant="muted"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                    Today&apos;s Kaam
                  </h2>
                  <p className="text-[14px] leading-[20px] text-deepNavy mt-[2px]">
                    {todayCompleted} of {todayTasks.length} tasks completed
                  </p>
                </div>
                <div className="bg-deepNavy px-3 py-1 rounded-full">
                  <span className="text-[12px] leading-[16px] font-bold text-white">
                    {todayTasks.length > 0
                      ? `${Math.round(
                          (todayCompleted / todayTasks.length) * 100
                        )}%`
                      : "100%"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Kaam Cards */}
          {filteredTasks.length > 0 ? (
            <div className="flex flex-col gap-3 pb-[90px]">
              {filteredTasks.map((task) => (
                <KaamCard
                  key={task.id}
                  task={task}
                  onPress={(t) => {
                    console.log("[HomePage Web] Card clicked, setting selectedTaskDetail:", t.id, t.title);
                    setSelectedTaskDetail(t);
                  }}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                  loading={completingId === task.currentOccurrence?.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <ClipboardCheck
                size={40}
                className="text-sky"
                strokeWidth={1.8}
              />
              <h2 className="text-[18px] leading-[24px] font-semibold text-black mt-3 mb-1">
                No Kaam due in this view!
              </h2>
              <p className="text-[14px] leading-[20px] text-grayBlack max-w-[260px]">
                Tap the + button below to create a new shared household task.
              </p>
            </div>
          )}

          {/* Floating Action Button for Create Task */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="fixed bottom-20 md:bottom-5 right-5 flex items-center gap-1 bg-navy text-white py-3 px-4 rounded-full font-bold text-[16px] shadow-[0_4px_8px_rgba(6,23,41,0.25)] hover:bg-deepNavy active:bg-deepNavy transition-all cursor-pointer z-30"
          >
            <Plus size={20} className="text-white" strokeWidth={2.5} />
            <span>Create Kaam</span>
          </button>
        </div>
      )}

      {/* VIEW 1: REALTIME GROUP CHAT */}
      {activeTab === 1 && (
        <div className="flex-1 flex flex-col bg-white border-x border-border min-h-0 overflow-hidden">
          {/* Chat Header matching styles.chatHeader */}
          <div className="px-5 py-2 bg-offWhite border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                Flat Group Chat
              </h2>
              <p className="text-[12px] leading-[16px] text-grayBlack mt-[2px]">
                Realtime chat with flatmates
              </p>
            </div>
          </div>

          {/* Chat Messages List */}
          <div
            ref={chatScrollContainerRef}
            className="flex-1 overflow-y-auto px-3 py-2 min-h-0"
          >
            {hasMore && (
              <div className="text-center py-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-[12px] font-semibold text-navy hover:underline cursor-pointer"
                >
                  {loadingMore ? "Loading older messages..." : "Load older messages"}
                </button>
              </div>
            )}

            {messages.length === 0 && !chatLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle
                  size={44}
                  className="text-sky"
                  strokeWidth={1.75}
                />
                <h2 className="text-[18px] leading-[24px] font-semibold text-black mt-3 mb-1">
                  No messages yet
                </h2>
                <p className="text-[14px] leading-[20px] text-grayBlack max-w-[240px]">
                  Say hi to your flatmates to kick off the conversation!
                </p>
              </div>
            ) : (
              messages.map((item, index) => {
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isDifferentSender =
                  !prevMsg || prevMsg.senderId !== item.senderId;
                const currentDate = formatDateDivider(item.createdAt);
                const prevDate = prevMsg
                  ? formatDateDivider(prevMsg.createdAt)
                  : null;
                const showDateDivider =
                  currentDate && currentDate !== prevDate;

                return (
                  <div
                    key={item.id}
                    className={
                      showDateDivider
                        ? ""
                        : isDifferentSender
                        ? "mt-2"
                        : "mt-[2px]"
                    }
                  >
                    {showDateDivider && (
                      <div className="flex justify-center my-2">
                        <div className="bg-offWhite px-3 py-1 rounded-full border border-border">
                          <span className="text-[11px] font-semibold text-grayBlack">
                            {currentDate}
                          </span>
                        </div>
                      </div>
                    )}
                    <MessageBubble
                      message={item}
                      isCurrentUser={item.senderId === currentUser?.id}
                      showSenderHeader={isDifferentSender}
                      onRetry={retryMessage}
                      onEdit={editMessage}
                      onDelete={deleteMessage}
                    />
                  </div>
                );
              })
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-5 py-1 bg-white flex-shrink-0">
              <span className="text-[12px] italic text-mutedNavy">
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}

          {/* Sticky Chat Input pinned directly above the bottom navbar */}
          <div className="flex-shrink-0 bg-white">
            <ChatInput onSend={sendMessage} onTyping={emitTyping} />
          </div>
        </div>
      )}

      {/* Create Kaam Sheet / Dialog */}
      <CreateKaamModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createTask}
        members={members}
        flatId={activeFlat?.id}
      />

      {/* Kaam Detail & History Modal */}
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
