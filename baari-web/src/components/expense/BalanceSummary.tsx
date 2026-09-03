"use client";

import React from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ArrowUpRight, ArrowDownLeft, Plus, HandCoins } from "lucide-react";

interface BalanceSummaryProps {
  youAreOwed: number;
  youOwe: number;
  netBalance: number;
  onAddExpense: () => void;
  onSettleUp: () => void;
}

/**
 * Mirrors baari-app/components/expense/BalanceSummary.tsx exactly.
 */
export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  youAreOwed,
  youOwe,
  netBalance,
  onAddExpense,
  onSettleUp,
}) => {
  return (
    <Card variant="elevated" className="mb-4 p-4">
      <p className="text-[12px] leading-[16px] font-bold text-grayBlack tracking-wider uppercase mb-1">
        TOTAL BALANCE
      </p>

      {/* Net Balance Headline */}
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[32px] leading-[38px] font-bold text-black">
          ₹{Math.abs(netBalance).toFixed(0)}
        </span>
        <div
          className={`py-1 px-2.5 rounded-full border ${
            netBalance > 0
              ? "bg-paleSky border-transparent"
              : netBalance < 0
              ? "bg-offWhite border-navy"
              : "bg-offWhite border-border"
          }`}
        >
          <span
            className={`text-[12px] leading-[16px] font-bold ${
              netBalance > 0
                ? "text-deepNavy"
                : netBalance < 0
                ? "text-navy"
                : "text-grayBlack"
            }`}
          >
            {netBalance > 0
              ? "You are owed"
              : netBalance < 0
              ? "You owe"
              : "All settled"}
          </span>
        </div>
      </div>

      {/* Two Column Breakdown */}
      <div className="flex bg-offWhite rounded-[10px] p-3 mb-4">
        {/* You are owed */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center">
              <ArrowDownLeft size={13} className="text-[#059669]" strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-grayBlack">
              You are owed
            </span>
          </div>
          <span className="text-[18px] leading-[24px] font-semibold text-[#059669]">
            ₹{youAreOwed.toFixed(2)}
          </span>
        </div>

        <div className="w-[1px] bg-border my-1" />

        {/* You owe */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-[#FEF2F2] flex items-center justify-center">
              <ArrowUpRight size={13} className="text-[#DC2626]" strokeWidth={2.5} />
            </div>
            <span className="text-[12px] font-semibold text-grayBlack">
              You owe
            </span>
          </div>
          <span className="text-[18px] leading-[24px] font-semibold text-[#DC2626]">
            ₹{youOwe.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          title="Add Expense"
          onClick={onAddExpense}
          icon={<Plus size={16} className="text-white" strokeWidth={2.4} />}
          className="flex-1"
        />
        <Button
          title="Settle Up"
          variant="secondary"
          onClick={onSettleUp}
          icon={<HandCoins size={16} className="text-deepNavy" strokeWidth={2.2} />}
          className="flex-1"
        />
      </div>
    </Card>
  );
};
