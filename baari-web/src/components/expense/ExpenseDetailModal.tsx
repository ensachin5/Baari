"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ExpenseItem } from "./ExpenseRow";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";
import { Bell, MessageSquare, Send, Repeat } from "lucide-react";

interface Comment {
  id: string;
  expenseId: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userImage?: string | null;
}

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
  onRefresh?: () => void;
}

/**
 * Mirrors baari-app/components/expense/ExpenseDetailModal.tsx exactly.
 */
export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  visible,
  expense,
  onClose,
  onRefresh,
}) => {
  const currentUserId = useSession((state) => state.user?.id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    if (!visible || !expense?.id) return;

    let mounted = true;
    setLoadingComments(true);
    api
      .get<{ comments: Comment[] }>(`/api/expenses/${expense.id}/comments`)
      .then((res) => {
        if (mounted) {
          setComments(res.comments || []);
          setLoadingComments(false);
        }
      })
      .catch(() => {
        if (mounted) setLoadingComments(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, expense?.id]);

  if (!expense) return null;

  const isPayer = expense.paidBy === currentUserId;
  const unsettledCount = expense.splits?.filter(
    (s) => !s.isSettled && s.userId !== expense.paidBy
  ).length || 0;

  const handleSendReminder = async () => {
    try {
      setReminding(true);
      const res = await api.post<{ message: string; remindedCount: number }>(
        `/api/expenses/${expense.id}/remind`
      );
      alert(`Reminder Sent: Sent a notification to ${res.remindedCount} flatmate(s).`);
    } catch (err: any) {
      alert(err?.message || "Failed to send reminder");
    } finally {
      setReminding(false);
    }
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setPostingComment(true);
      const res = await api.post<{ comment: Comment }>(
        `/api/expenses/${expense.id}/comments`,
        { content: commentText.trim() }
      );
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
    } catch (err: any) {
      alert(err?.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={expense.title}>
      <div className="space-y-4">
        {/* Header Info */}
        <div className="flex items-center justify-between bg-offWhite p-4 rounded-[10px] border border-border">
          <span className="text-[28px] font-bold text-black">
            ₹{parseFloat(expense.amount).toFixed(2)}
          </span>
          <div className="flex items-center gap-1.5">
            {expense.category && <Badge label={expense.category} />}
            {expense.isRecurring && (
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-[6px] border border-border text-[11px] font-medium text-mutedNavy">
                <Repeat size={12} />
                <span>Repeats {expense.recurrenceInterval || "weekly"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Paid By */}
        <div className="flex items-center gap-2">
          <Avatar name={expense.payerName} image={expense.payerImage} size="sm" />
          <span className="text-[13px] text-grayBlack">
            <strong className="text-black font-semibold">
              {isPayer ? "You" : expense.payerName}
            </strong>{" "}
            paid on {formatDate(expense.createdAt)}
          </span>
        </div>

        {/* Splits Breakdown */}
        <div>
          <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
            Split Breakdown
          </span>
          <div className="space-y-1.5 bg-offWhite p-3 rounded-[10px] border border-border">
            {expense.splits?.map((split) => (
              <div
                key={split.id}
                className="flex items-center justify-between text-[13px] py-1 border-b border-border/50 last:border-0"
              >
                <span className="font-medium text-black">{split.userName}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-black">
                    ₹{parseFloat(split.amountOwed).toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] ${
                      split.isSettled || split.userId === expense.paidBy
                        ? "bg-[#ECFDF5] text-[#059669]"
                        : "bg-[#FEF2F2] text-[#DC2626]"
                    }`}
                  >
                    {split.userId === expense.paidBy
                      ? "Paid"
                      : split.isSettled
                      ? "Settled"
                      : "Unsettled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reminder button if payer and unsettled splits exist */}
        {isPayer && unsettledCount > 0 && (
          <Button
            title={`Send Reminder to ${unsettledCount} Flatmate(s)`}
            variant="secondary"
            onClick={handleSendReminder}
            loading={reminding}
            icon={<Bell size={14} className="text-deepNavy" />}
            className="w-full text-[13px]"
          />
        )}

        {/* Comments Section */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={14} className="text-navy" />
            <span className="text-[12px] font-semibold text-deepNavy uppercase tracking-wider">
              Comments ({comments.length})
            </span>
          </div>

          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-[8px] bg-offWhite border border-border flex items-start gap-2"
              >
                <Avatar name={c.userName} image={c.userImage} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-navy">
                      {c.userName}
                    </span>
                    <span className="text-[10px] text-grayBlack">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-[13px] text-black mt-0.5 break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
            {comments.length === 0 && !loadingComments && (
              <p className="text-[12px] text-grayBlack italic text-center py-2">
                No comments yet. Leave a note for your flatmates below.
              </p>
            )}
          </div>

          {/* Post Comment Input */}
          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 px-3 py-2 text-[14px] rounded-[10px] border border-border bg-white text-black focus:outline-none focus:border-navy"
            />
            <Button
              type="submit"
              disabled={!commentText.trim() || postingComment}
              loading={postingComment}
              size="sm"
              icon={<Send size={14} />}
            >
              Post
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
