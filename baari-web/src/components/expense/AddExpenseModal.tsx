"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Check } from "lucide-react";

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
}

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: string;
    splitType: "equal" | "exact";
    splits: { userId: string; amountOwed: number }[];
    isRecurring?: boolean;
    recurrenceInterval?: "weekly" | "monthly";
  }) => Promise<void>;
  members: FlatMember[];
  loading?: boolean;
}

const CATEGORIES = ["Groceries", "Utilities", "Wi-Fi", "Food", "General"];

/**
 * Mirrors baari-app/components/expense/AddExpenseModal.tsx exactly.
 */
export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  loading = false,
}) => {
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<"weekly" | "monthly">("monthly");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map((m) => m.userId)
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map((m) => m.userId));
    }
  }, [members, selectedMembers.length]);

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      if (selectedMembers.length === 1) return; // Keep at least one
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!title.trim()) {
      setError("Please enter what this expense was for");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("Please select at least one person to split with");
      return;
    }

    try {
      setError("");
      const perPerson =
        Math.round((amount / selectedMembers.length) * 100) / 100;
      const splits = selectedMembers.map((userId) => ({
        userId,
        amountOwed: perPerson,
      }));

      await onSubmit({
        title: title.trim(),
        amount,
        category,
        splitType: "equal",
        splits,
        isRecurring,
        recurrenceInterval: isRecurring ? recurrenceInterval : undefined,
      });

      // Reset
      setTitle("");
      setAmountStr("");
      setIsRecurring(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to add expense");
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add Expense">
      {/* Amount Input */}
      <div className="flex items-center justify-center gap-2 mb-4 bg-offWhite p-4 rounded-[10px] border border-border">
        <span className="text-[32px] font-bold text-navy">₹</span>
        <input
          type="number"
          step="any"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          autoFocus
          className="text-[32px] font-bold text-navy bg-transparent w-48 text-center focus:outline-none placeholder:text-grayBlack/40"
        />
      </div>

      {/* Title Input */}
      <Input
        label="Description"
        placeholder="e.g., Grocery shopping, Wi-Fi bill"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={error}
      />

      {/* Category Selection */}
      <div className="mb-4">
        <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
          Category
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-1.5 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-navy text-white border-navy"
                    : "bg-offWhite text-mutedNavy border-border hover:bg-border/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Participants */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[12px] font-semibold text-deepNavy uppercase tracking-wider">
            Split with Flatmates
          </span>
          <span className="text-[12px] text-grayBlack">
            {selectedMembers.length} people (₹
            {amountStr && !isNaN(parseFloat(amountStr))
              ? (parseFloat(amountStr) / (selectedMembers.length || 1)).toFixed(2)
              : "0.00"}{" "}
            each)
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {members.map((member) => {
            const isSelected = selectedMembers.includes(member.userId);
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => toggleMember(member.userId)}
                className={`w-full flex items-center justify-between p-2.5 rounded-[10px] border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-paleSky/70 border-navy"
                    : "bg-offWhite border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Avatar name={member.name} image={member.image} size="sm" />
                  <span className="text-[14px] font-medium text-black">
                    {member.name}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-colors ${
                    isSelected
                      ? "bg-navy border-navy"
                      : "bg-white border-border"
                  }`}
                >
                  {isSelected && (
                    <Check size={12} className="text-white" strokeWidth={3} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurring Option */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsRecurring(!isRecurring)}
          className="flex items-center gap-2 cursor-pointer mb-2"
        >
          <div
            className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-colors ${
              isRecurring
                ? "bg-navy border-navy"
                : "bg-white border-border"
            }`}
          >
            {isRecurring && (
              <Check size={12} className="text-white" strokeWidth={3} />
            )}
          </div>
          <span className="text-[14px] font-medium text-black">
            Repeat this expense
          </span>
        </button>

        {isRecurring && (
          <div className="flex gap-2 pl-7">
            {(["weekly", "monthly"] as const).map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => setRecurrenceInterval(interval)}
                className={`py-1 px-3 rounded-full text-[12px] font-semibold border transition-all cursor-pointer ${
                  recurrenceInterval === interval
                    ? "bg-navy text-white border-navy"
                    : "bg-offWhite text-mutedNavy border-border"
                }`}
              >
                {interval === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        )}
      </div>

      <Button
        title="Add Expense"
        onClick={handleSave}
        loading={loading}
        className="w-full"
      />
    </Modal>
  );
};
