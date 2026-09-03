"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { FlatMember } from "./AddExpenseModal";
import { useSession } from "@/store/session";

interface SettleUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    paidTo: string;
    amount: number;
    note?: string;
  }) => Promise<void>;
  members: FlatMember[];
  suggestedDebts?: {
    toUserId: string;
    toUserName: string;
    amount: number;
  }[];
  loading?: boolean;
}

/**
 * Mirrors baari-app/components/expense/SettleUpModal.tsx exactly.
 */
export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  suggestedDebts = [],
  loading = false,
}) => {
  const currentUserId = useSession((state) => state.user?.id);
  const eligibleMembers = members.filter((m) => m.userId !== currentUserId);

  const [selectedPayeeId, setSelectedPayeeId] = useState<string>(
    suggestedDebts[0]?.toUserId || eligibleMembers[0]?.userId || ""
  );
  const [amountStr, setAmountStr] = useState<string>(
    suggestedDebts[0]?.amount ? suggestedDebts[0].amount.toString() : ""
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSelectDebt = (debt: { toUserId: string; amount: number }) => {
    setSelectedPayeeId(debt.toUserId);
    setAmountStr(debt.amount.toString());
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!selectedPayeeId) {
      setError("Please select who you paid");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setError("");
      await onSubmit({
        paidTo: selectedPayeeId,
        amount,
        note: note.trim() || undefined,
      });

      // Reset
      setAmountStr("");
      setNote("");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record settlement");
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Settle Up Payment">
      {/* Suggested Debts Quick Selection */}
      {suggestedDebts.length > 0 && (
        <div className="mb-4">
          <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
            Suggested Settlements
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedDebts.map((d) => {
              const isSelected = selectedPayeeId === d.toUserId;
              return (
                <button
                  key={d.toUserId}
                  type="button"
                  onClick={() => handleSelectDebt(d)}
                  className={`py-2 px-3 rounded-[10px] border text-[12px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-paleSky border-navy text-deepNavy font-bold"
                      : "bg-offWhite border-border text-black hover:bg-border/60"
                  }`}
                >
                  Pay {d.toUserName} ₹{d.amount}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Select Flatmate */}
      <div className="mb-4">
        <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
          Paid To
        </span>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {eligibleMembers.map((member) => {
            const isSelected = selectedPayeeId === member.userId;
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => setSelectedPayeeId(member.userId)}
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
                  className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                    isSelected ? "border-navy" : "border-mutedNavy"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-navy" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount Input */}
      <Input
        label="Amount (₹)"
        placeholder="0.00"
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        type="number"
        step="any"
        error={error}
      />

      {/* Note Input */}
      <Input
        label="Note (Optional)"
        placeholder="e.g., Paid via UPI / cash"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Button
        title="Record Settlement"
        onClick={handleSave}
        loading={loading}
        className="w-full mt-2"
      />
    </Modal>
  );
};
