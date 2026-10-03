"use client";

import React from "react";
import { RecurrenceOption, CustomMode } from "../CreateKaamModal";
import { CheckCircle2, Repeat, Calendar, SlidersHorizontal, Plus, Minus } from "lucide-react";

interface RecurrencePickerProps {
  recurrence: RecurrenceOption;
  onSelectRecurrence: (recurrence: RecurrenceOption) => void;
  customMode: CustomMode;
  onSelectCustomMode: (mode: CustomMode) => void;
  selectedWeekdays: string[];
  onToggleWeekday: (dayKey: string) => void;
  everyNDays: number;
  onChangeEveryNDays: (n: number) => void;
  weekdays: Array<{ key: string; label: string }>;
}

export const RecurrencePicker: React.FC<RecurrencePickerProps> = React.memo(({
  recurrence,
  onSelectRecurrence,
  customMode,
  onSelectCustomMode,
  selectedWeekdays,
  onToggleWeekday,
  everyNDays,
  onChangeEveryNDays,
  weekdays,
}) => {
  return (
    <div className="mb-4">
      <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
        HOW OFTEN?
      </span>

      <div className="grid grid-cols-4 gap-2">
        {/* Once */}
        <button
          type="button"
          onClick={() => onSelectRecurrence("once")}
          className={`flex flex-col items-center p-2.5 rounded-[10px] border transition-all cursor-pointer text-center ${
            recurrence === "once"
              ? "bg-paleSky/70 border-navy text-navy"
              : "bg-offWhite border-border text-grayBlack hover:bg-border/60"
          }`}
        >
          <CheckCircle2
            size={18}
            className={recurrence === "once" ? "text-navy" : "text-grayBlack"}
          />
          <span className="text-[12px] font-semibold mt-1">Once</span>
          <span className="text-[10px] opacity-75">One time</span>
        </button>

        {/* Daily */}
        <button
          type="button"
          onClick={() => onSelectRecurrence("daily")}
          className={`flex flex-col items-center p-2.5 rounded-[10px] border transition-all cursor-pointer text-center ${
            recurrence === "daily"
              ? "bg-paleSky/70 border-navy text-navy"
              : "bg-offWhite border-border text-grayBlack hover:bg-border/60"
          }`}
        >
          <Repeat
            size={18}
            className={recurrence === "daily" ? "text-navy" : "text-grayBlack"}
          />
          <span className="text-[12px] font-semibold mt-1">Daily</span>
          <span className="text-[10px] opacity-75">Every day</span>
        </button>

        {/* Weekly */}
        <button
          type="button"
          onClick={() => onSelectRecurrence("weekly")}
          className={`flex flex-col items-center p-2.5 rounded-[10px] border transition-all cursor-pointer text-center ${
            recurrence === "weekly"
              ? "bg-paleSky/70 border-navy text-navy"
              : "bg-offWhite border-border text-grayBlack hover:bg-border/60"
          }`}
        >
          <Calendar
            size={18}
            className={recurrence === "weekly" ? "text-navy" : "text-grayBlack"}
          />
          <span className="text-[12px] font-semibold mt-1">Weekly</span>
          <span className="text-[10px] opacity-75">Every week</span>
        </button>

        {/* Custom */}
        <button
          type="button"
          onClick={() => onSelectRecurrence("custom")}
          className={`flex flex-col items-center p-2.5 rounded-[10px] border transition-all cursor-pointer text-center ${
            recurrence === "custom"
              ? "bg-paleSky/70 border-navy text-navy"
              : "bg-offWhite border-border text-grayBlack hover:bg-border/60"
          }`}
        >
          <SlidersHorizontal
            size={18}
            className={recurrence === "custom" ? "text-navy" : "text-grayBlack"}
          />
          <span className="text-[12px] font-semibold mt-1">Custom</span>
          <span className="text-[10px] opacity-75">Custom days</span>
        </button>
      </div>

      {/* Custom Sub-Picker */}
      {recurrence === "custom" && (
        <div className="mt-3 p-3 rounded-[10px] bg-offWhite border border-border">
          <div className="flex bg-white rounded-[6px] p-1 border border-border mb-3">
            <button
              type="button"
              onClick={() => onSelectCustomMode("specific_days")}
              className={`flex-1 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                customMode === "specific_days"
                  ? "bg-navy text-white"
                  : "text-mutedNavy hover:text-navy"
              }`}
            >
              Specific Weekdays
            </button>
            <button
              type="button"
              onClick={() => onSelectCustomMode("interval")}
              className={`flex-1 py-1.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                customMode === "interval"
                  ? "bg-navy text-white"
                  : "text-mutedNavy hover:text-navy"
              }`}
            >
              Every N Days
            </button>
          </div>

          {/* Mode A: Specific Weekdays */}
          {customMode === "specific_days" && (
            <div>
              <p className="text-[11px] text-mutedNavy mb-2">
                Select days to repeat on (e.g. Mon, Thu):
              </p>
              <div className="grid grid-cols-7 gap-1">
                {weekdays.map((day) => {
                  const isDaySelected = selectedWeekdays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => onToggleWeekday(day.key)}
                      className={`py-2 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                        isDaySelected
                          ? "bg-navy border-navy text-white"
                          : "bg-white border-border text-deepNavy hover:bg-offWhite"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-mutedNavy mt-2">
                Repeats every:{" "}
                <span className="font-semibold text-deepNavy">
                  {selectedWeekdays.map((d) => d.toUpperCase()).join(", ")}
                </span>
              </p>
            </div>
          )}

          {/* Mode B: Every N Days */}
          {customMode === "interval" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-mutedNavy">Repeat interval:</span>
                <div className="flex items-center gap-2 bg-white border border-border rounded-[6px] px-2 py-1">
                  <button
                    type="button"
                    onClick={() => onChangeEveryNDays(Math.max(1, everyNDays - 1))}
                    className="text-navy hover:text-deepNavy p-0.5 cursor-pointer"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-[12px] font-semibold text-deepNavy">
                    Every {everyNDays} days
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeEveryNDays(Math.min(90, everyNDays + 1))}
                    className="text-navy hover:text-deepNavy p-0.5 cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChangeEveryNDays(num)}
                    className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                      everyNDays === num
                        ? "bg-navy border-navy text-white"
                        : "bg-white border-border text-deepNavy hover:bg-offWhite"
                    }`}
                  >
                    {num}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

RecurrencePicker.displayName = "RecurrencePicker";
