"use client";

import React, { useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { BalanceSummary } from "@/components/expense/BalanceSummary";
import { ExpenseRow, ExpenseItem } from "@/components/expense/ExpenseRow";
import { ExpenseCharts } from "@/components/expense/ExpenseCharts";
import { AddExpenseModal } from "@/components/expense/AddExpenseModal";
import { SettleUpModal } from "@/components/expense/SettleUpModal";
import { ExpenseDetailModal } from "@/components/expense/ExpenseDetailModal";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import {
  Receipt,
  Search,
  ArrowRight,
  Check,
  X,
  SlidersHorizontal,
} from "lucide-react";

const CATEGORIES = ["All", "Groceries", "Utilities", "Wi-Fi", "Food", "General"];

/**
 * Mirrors baari-app/app/(tabs)/expense.tsx exactly.
 */
export default function ExpensePage() {
  const {
    expenses,
    balances,
    members,
    myDebts,
    pendingSettlements,
    search,
    category,
    loading,
    refreshing,
    setSearch,
    setCategory,
    addExpense,
    settleUp,
    confirmSettlement,
    rejectSettlement,
    onRefresh,
  } = useExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [showSimplifiedDebts, setShowSimplifiedDebts] = useState(false);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full pb-20 md:pb-6">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-white sticky top-16 z-20">
        <h1 className="text-[22px] leading-[28px] font-semibold text-black">
          Expenses & Balances
        </h1>
      </div>

      <div className="px-5 pt-3 space-y-4">
        {/* Pending Settlements Confirmation Banner */}
        {pendingSettlements.length > 0 && (
          <div>
            <h2 className="text-[18px] leading-[24px] font-semibold text-[#B45309] mb-2">
              Pending Settle-Ups ({pendingSettlements.length})
            </h2>
            <div className="space-y-2">
              {pendingSettlements.map((ps) => (
                <div
                  key={ps.id}
                  className="bg-[#FFFBEB] border border-[#FDE68A] p-3 rounded-[10px] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar name={ps.payerName} image={ps.payerImage} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#92400E] truncate">
                        <strong className="font-bold">{ps.payerName}</strong> sent ₹
                        {parseFloat(ps.amount).toFixed(2)}
                      </p>
                      {ps.note ? (
                        <p className="text-[11px] text-[#B45309] italic truncate">
                          &quot;{ps.note}&quot;
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => rejectSettlement(ps.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white border border-[#FCA5A5] text-[11px] font-semibold text-[#DC2626] hover:bg-red-50 cursor-pointer"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmSettlement(ps.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#059669] text-[11px] font-semibold text-white hover:bg-[#047857] shadow-xs cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Confirm</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Summary Header Card */}
        <BalanceSummary
          youAreOwed={balances.summary.youAreOwed}
          youOwe={balances.summary.youOwe}
          netBalance={balances.summary.netBalance}
          onAddExpense={() => setIsAddModalOpen(true)}
          onSettleUp={() => setIsSettleModalOpen(true)}
        />

        {/* Member Balances / Simplified Debts Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[18px] leading-[24px] font-semibold text-black">
              {showSimplifiedDebts ? "Simplified Debts" : "Flatmate Balances"}
            </h2>
            <button
              type="button"
              onClick={() => setShowSimplifiedDebts(!showSimplifiedDebts)}
              className="flex items-center gap-1 bg-[#F0F9FF] border border-[#BAE6FD] px-2 py-1 rounded-[6px] text-[11px] font-semibold text-navy hover:bg-sky-light/50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={12} className="text-navy" />
              <span>{showSimplifiedDebts ? "Show Balances" : "Simplify Debts"}</span>
            </button>
          </div>

          {showSimplifiedDebts ? (
            /* Simplified Debts Plan */
            <Card variant="outlined" className="p-3">
              {balances.simplifiedDebts.length > 0 ? (
                <div className="divide-y divide-border">
                  {balances.simplifiedDebts.map((debt, idx) => (
                    <div
                      key={`${debt.fromUserId}-${debt.toUserId}-${idx}`}
                      className="flex items-center justify-between py-2"
                    >
                      <span className="text-[13px] font-semibold text-deepNavy flex-1">
                        {debt.fromUserName}
                      </span>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-[12px] font-medium text-mutedNavy">
                          pays ₹{debt.amount.toFixed(2)}
                        </span>
                        <ArrowRight size={14} className="text-mutedNavy" />
                      </div>
                      <span className="text-[13px] font-semibold text-[#059669] flex-1 text-right">
                        {debt.toUserName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#059669] text-center font-semibold py-2">
                  All flat debts are settled!
                </p>
              )}
            </Card>
          ) : (
            /* Individual Net Balances */
            balances.memberBalances.length > 0 && (
              <Card variant="outlined" className="p-3">
                <div className="divide-y divide-border">
                  {balances.memberBalances.map((mb) => (
                    <div
                      key={mb.userId}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={mb.name} image={mb.image} size="sm" />
                        <span className="text-[14px] font-medium text-black">
                          {mb.name}
                        </span>
                      </div>
                      <span
                        className={`text-[14px] font-bold ${
                          mb.netBalance > 0
                            ? "text-deepNavy"
                            : mb.netBalance < 0
                            ? "text-mutedNavy"
                            : "text-grayBlack"
                        }`}
                      >
                        {mb.netBalance > 0
                          ? `+₹${mb.netBalance.toFixed(2)}`
                          : mb.netBalance < 0
                          ? `-₹${Math.abs(mb.netBalance).toFixed(2)}`
                          : "Settled"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          )}
        </div>

        {/* Category Breakdown Chart */}
        {expenses.length > 0 && <ExpenseCharts expenses={expenses} />}

        {/* Expense History List with Search & Category Filters */}
        <div>
          <h2 className="text-[18px] leading-[24px] font-semibold text-black mb-2">
            Expense History
          </h2>

          {/* Search Box */}
          <div className="flex items-center bg-offWhite border border-border rounded-[10px] px-3 py-2 mb-2">
            <Search size={16} className="text-grayBlack mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by description or merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-black placeholder:text-grayBlack focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-grayBlack hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-1.5 px-3 rounded-full text-[12px] font-medium border transition-all cursor-pointer whitespace-nowrap ${
                  category === cat
                    ? "bg-navy text-white border-navy shadow-xs"
                    : "bg-offWhite text-mutedNavy border-border hover:bg-border/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Expense Rows Card */}
          {expenses.length > 0 ? (
            <Card variant="outlined" className="p-3">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onPress={(exp) => setSelectedExpense(exp)}
                />
              ))}
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Receipt size={36} className="text-sky mb-2" />
              <p className="text-[14px] text-mutedNavy max-w-xs">
                {search || category !== "All"
                  ? "No matching expenses found."
                  : 'No expenses logged yet. Tap "Add Expense" to split bills.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={addExpense}
        members={members}
      />

      {/* Settle Up Modal */}
      <SettleUpModal
        visible={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        onSubmit={settleUp}
        members={members}
        suggestedDebts={myDebts}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        visible={Boolean(selectedExpense)}
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onRefresh={onRefresh}
      />
    </div>
  );
}
