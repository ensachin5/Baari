"use client";

import React from "react";
import { Avatar } from "../ui/Avatar";
import { useSession } from "@/store/session";
import { Repeat } from "lucide-react";

export interface ExpenseItem {
  id: string;
  flatId: string;
  title: string;
  amount: string;
  paidBy: string;
  category?: string | null;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  createdAt: string;
  payerName: string;
  payerImage?: string | null;
  splits: {
    id: string;
    userId: string;
    amountOwed: string;
    isSettled: boolean;
    userName: string;
  }[];
}

interface ExpenseRowProps {
  expense: ExpenseItem;
  onPress?: (expense: ExpenseItem) => void;
}

/**
 * Mirrors baari-app/components/expense/ExpenseRow.tsx exactly.
 */
export const ExpenseRow: React.FC<ExpenseRowProps> = ({ expense, onPress }) => {
  const currentUserId = useSession((state) => state.user?.id);
  const isPayer = expense.paidBy === currentUserId;

  const mySplit = expense.splits?.find((s) => s.userId === currentUserId);
  const userShare = mySplit ? parseFloat(mySplit.amountOwed) : 0;
  const totalAmount = parseFloat(expense.amount);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const Content = (
    <div className="flex items-center py-3 border-b border-border transition-colors hover:bg-offWhite/50 px-2 rounded-[8px]">
      <Avatar
        name={expense.payerName}
        image={expense.payerImage}
        size="md"
        className="mr-3"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 mr-2">
            <span className="text-[16px] leading-[24px] font-medium text-black truncate">
              {expense.title}
            </span>
            {expense.isRecurring && (
              <div className="bg-offWhite p-[3px] rounded-[6px] flex items-center">
                <Repeat size={10} className="text-mutedNavy" />
              </div>
            )}
            {expense.isEdited && (
              <span className="text-[10px] text-grayBlack italic">(edited)</span>
            )}
          </div>
          <span className="text-[16px] leading-[24px] font-bold text-black flex-shrink-0">
            ₹{totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] leading-[16px] text-grayBlack truncate mr-2">
            {isPayer ? "You paid" : `${expense.payerName} paid`} •{" "}
            {formatDate(expense.createdAt)}
          </span>

          {/* User's individual share indication */}
          {isPayer ? (
            <span className="text-[12px] leading-[16px] text-deepNavy font-bold flex-shrink-0">
              lent ₹{(totalAmount - userShare).toFixed(2)}
            </span>
          ) : userShare > 0 ? (
            <span className="text-[12px] leading-[16px] text-mutedNavy font-bold flex-shrink-0">
              you owe ₹{userShare.toFixed(2)}
            </span>
          ) : (
            <span className="text-[12px] leading-[16px] text-grayBlack flex-shrink-0">
              not involved
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={() => onPress(expense)}
        className="w-full text-left cursor-pointer"
      >
        {Content}
      </button>
    );
  }

  return Content;
};
