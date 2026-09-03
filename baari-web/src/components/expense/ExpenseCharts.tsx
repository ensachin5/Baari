"use client";

import React from "react";
import { Card } from "../ui/Card";
import { ExpenseItem } from "./ExpenseRow";

interface ExpenseChartsProps {
  expenses: ExpenseItem[];
}

/**
 * Mirrors baari-app/components/expense/ExpenseCharts.tsx exactly.
 */
export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ expenses }) => {
  if (!expenses || expenses.length === 0) return null;

  // Aggregate spending by category
  const categoryTotals: Record<string, number> = {};
  let totalSpending = 0;

  expenses.forEach((exp) => {
    const cat = exp.category || "General";
    const amt = parseFloat(exp.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    totalSpending += amt;
  });

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const categoryShades = [
    "#0A2540", // navy
    "#5AC8FA", // sky
    "#3C4E7A", // mutedNavy
    "#2E93C4", // deepSky
    "#DCEEF7", // paleSky
    "#061729", // deepNavy
  ];

  return (
    <Card variant="outlined" className="mb-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[18px] leading-[24px] font-semibold text-black">
          Category Breakdown
        </h2>
        <span className="text-[12px] leading-[16px] font-bold text-deepNavy">
          Total: ₹{totalSpending.toFixed(0)}
        </span>
      </div>

      {/* Progress Bar Breakdown */}
      <div className="flex h-3 rounded-full overflow-hidden bg-offWhite mb-3 w-full">
        {categories.map(([cat, amt], idx) => {
          const percent = totalSpending > 0 ? (amt / totalSpending) * 100 : 0;
          return (
            <div
              key={cat}
              style={{
                width: `${percent}%`,
                backgroundColor: categoryShades[idx % categoryShades.length],
              }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              title={`${cat}: ₹${amt.toFixed(0)} (${percent.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Category Legends */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        {categories.map(([cat, amt], idx) => {
          const percent =
            totalSpending > 0
              ? ((amt / totalSpending) * 100).toFixed(0)
              : "0";
          const shade = categoryShades[idx % categoryShades.length];
          return (
            <div key={cat} className="flex items-center min-w-0">
              <div
                style={{ backgroundColor: shade }}
                className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
              />
              <span className="text-[12px] leading-[16px] font-semibold text-black truncate mr-1">
                {cat}
              </span>
              <span className="text-[12px] leading-[16px] text-grayBlack flex-shrink-0">
                ₹{amt.toFixed(0)} ({percent}%)
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
