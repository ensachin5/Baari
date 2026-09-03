"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { useQuickPicks, QuickPickPreset } from "@/hooks/useQuickPicks";
import {
  Check,
  Plus,
  Minus,
  RotateCcw,
  User,
  Users,
  CheckCircle2,
  Repeat,
  Calendar,
  SlidersHorizontal,
  Zap,
  Droplets,
  Trash2,
  Wind,
  Bath,
  UtensilsCrossed,
  Shirt,
  ShoppingCart,
  LayoutGrid,
} from "lucide-react";

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
  role: "admin" | "member";
}

export type RecurrenceOption = "once" | "daily" | "weekly" | "custom";
export type CustomMode = "specific_days" | "interval";
export type AssignmentMode = "auto_rotate" | "one_person" | "multiple_people";

export type CustomRecurrenceConfig =
  | { type: "specific_days"; days: string[] }
  | { type: "interval"; everyNDays: number };

interface CreateKaamModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    category: "water" | "garbage" | "chore" | "custom";
    description?: string;
    recurrence: RecurrenceOption;
    customRecurrenceConfig?: CustomRecurrenceConfig | null;
    peopleRequired: number;
    assigneeIds: string[];
    occurrenceDate?: string;
  }) => Promise<void>;
  members: FlatMember[];
  flatId?: string | null;
  loading?: boolean;
}

const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function renderPresetIcon(iconName?: string | null, size = 15, color = "text-navy") {
  switch (iconName) {
    case "Droplet":
    case "Droplets":
      return <Droplets size={size} className={color} />;
    case "Trash2":
      return <Trash2 size={size} className={color} />;
    case "Wind":
      return <Wind size={size} className={color} />;
    case "Bath":
      return <Bath size={size} className={color} />;
    case "UtensilsCrossed":
      return <UtensilsCrossed size={size} className={color} />;
    case "Shirt":
      return <Shirt size={size} className={color} />;
    case "ShoppingCart":
      return <ShoppingCart size={size} className={color} />;
    default:
      return <LayoutGrid size={size} className={color} />;
  }
}

/**
 * Mirrors baari-app/components/kaam/CreateKaamModal.tsx exactly.
 */
export const CreateKaamModal: React.FC<CreateKaamModalProps> = ({
  visible,
  onClose,
  onSubmit,
  members,
  flatId,
  loading = false,
}) => {
  const { presets } = useQuickPicks(flatId);

  // Quick Pick & Title state
  const [selectedQuickPickId, setSelectedQuickPickId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"water" | "garbage" | "chore" | "custom">("water");

  // Assignment Mode
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>("auto_rotate");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrenceOption>("daily");
  const [customMode, setCustomMode] = useState<CustomMode>("specific_days");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(["mon", "thu"]);
  const [everyNDays, setEveryNDays] = useState(3);

  // Due Date (0 = today, 1 = tomorrow, 2 = in 2 days, 3 = in 3 days)
  const [dueOffsetDays, setDueOffsetDays] = useState(0);

  const [error, setError] = useState("");

  // Pre-fill first preset ("Water") by default when opened
  useEffect(() => {
    if (visible && presets.length > 0 && !title) {
      const firstPreset = presets[0];
      setSelectedQuickPickId(firstPreset.id);
      setTitle(firstPreset.title);
      setCategory(firstPreset.category);
    }
  }, [visible, presets, title]);

  const handleSelectQuickPick = (item: QuickPickPreset) => {
    setSelectedQuickPickId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setError("");
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setError("");
    const matched = presets.find(
      (q) => q.title.toLowerCase() === text.trim().toLowerCase()
    );
    if (matched) {
      setSelectedQuickPickId(matched.id);
      setCategory(matched.category);
    } else {
      setSelectedQuickPickId(null);
    }
  };

  const handleSwitchAssignmentMode = (mode: AssignmentMode) => {
    setAssignmentMode(mode);
    setError("");
    if (mode === "auto_rotate") {
      setSelectedAssignees([]);
    } else if (mode === "one_person") {
      if (selectedAssignees.length === 0 && members.length > 0) {
        setSelectedAssignees([members[0].userId]);
      } else if (selectedAssignees.length > 1) {
        setSelectedAssignees([selectedAssignees[0]]);
      }
    } else if (mode === "multiple_people") {
      if (selectedAssignees.length < 2 && members.length >= 2) {
        setSelectedAssignees([members[0].userId, members[1].userId]);
      }
    }
  };

  const handleMemberSelect = (userId: string) => {
    setError("");
    if (assignmentMode === "one_person") {
      setSelectedAssignees([userId]);
    } else if (assignmentMode === "multiple_people") {
      if (selectedAssignees.includes(userId)) {
        if (selectedAssignees.length <= 1) {
          setError("Multiple people mode requires at least 2 assignees");
          return;
        }
        setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
      } else {
        setSelectedAssignees([...selectedAssignees, userId]);
      }
    }
  };

  const toggleWeekday = (dayKey: string) => {
    if (selectedWeekdays.includes(dayKey)) {
      if (selectedWeekdays.length === 1) {
        setError("Select at least one day of the week");
        return;
      }
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== dayKey));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayKey]);
    }
    setError("");
  };

  const getFormattedDueDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const formatDateDisplay = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

    if (offsetDays === 0) {
      return { label: "Today", sub: `${dateStr} — due soon`, isToday: true };
    }
    if (offsetDays === 1) {
      return { label: "Tomorrow", sub: dateStr, isToday: false };
    }
    return { label: `In ${offsetDays} Days`, sub: dateStr, isToday: false };
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter or select a Kaam title");
      return;
    }

    let finalAssignees: string[] = [];
    let peopleReq = 1;

    if (assignmentMode === "auto_rotate") {
      finalAssignees = members.map((m) => m.userId);
      if (finalAssignees.length === 0) {
        setError("No flat members found in this flat");
        return;
      }
      peopleReq = 1;
    } else if (assignmentMode === "one_person") {
      if (selectedAssignees.length !== 1) {
        setError("Please select exactly 1 flatmate for this Kaam");
        return;
      }
      finalAssignees = selectedAssignees;
      peopleReq = 1;
    } else if (assignmentMode === "multiple_people") {
      if (selectedAssignees.length < 2) {
        setError("Please select at least 2 flatmates for multi-person Kaam");
        return;
      }
      finalAssignees = selectedAssignees;
      peopleReq = selectedAssignees.length;
    }

    let customConfig: CustomRecurrenceConfig | null = null;
    if (recurrence === "custom") {
      if (customMode === "specific_days") {
        if (selectedWeekdays.length === 0) {
          setError("Please select at least one day of the week");
          return;
        }
        customConfig = { type: "specific_days", days: selectedWeekdays };
      } else {
        customConfig = { type: "interval", everyNDays: Math.max(1, everyNDays) };
      }
    }

    try {
      setError("");
      await onSubmit({
        title: trimmedTitle,
        category,
        recurrence,
        customRecurrenceConfig: customConfig,
        peopleRequired: peopleReq,
        assigneeIds: finalAssignees,
        occurrenceDate: getFormattedDueDate(dueOffsetDays),
      });

      // Reset state & close
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create Kaam");
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Create Kaam">
      {error && (
        <div className="bg-[#FEF2F2] rounded-[6px] px-3 py-2 mb-4 border border-[#FECACA]">
          <p className="text-[13px] leading-[18px] font-medium text-[#DC2626] text-center">
            {error}
          </p>
        </div>
      )}

      {/* 1. QUICK PICK */}
      <div className="mb-4">
        <div className="flex items-center gap-1 mb-2">
          <Zap size={14} className="text-navy" />
          <span className="text-[12px] font-semibold text-deepNavy uppercase tracking-wider">
            QUICK PICK
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {presets.map((item) => {
            const isSelected = selectedQuickPickId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectQuickPick(item)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[10px] border whitespace-nowrap text-[13px] leading-[18px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-navy border-navy text-white shadow-xs"
                    : "bg-offWhite border-border text-navy hover:bg-border/60"
                }`}
              >
                {renderPresetIcon(
                  item.icon,
                  15,
                  isSelected ? "text-white" : "text-navy"
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CUSTOM TITLE INPUT */}
      <div className="mb-4">
        <label className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-1">
          KAAM TITLE
        </label>
        <input
          type="text"
          placeholder="e.g., Mop balcony, Clean ceiling fan..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full h-12 px-3 rounded-[10px] border-[1.5px] border-border bg-white text-black text-[16px] placeholder:text-grayBlack focus:outline-none focus:border-navy"
        />
      </div>

      {/* 3. ASSIGN TO (3 DISTINCT MODES) */}
      <div className="mb-4">
        <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
          ASSIGN TO
        </span>

        {/* Mode Switcher */}
        <div className="flex bg-offWhite rounded-[10px] p-[3px] border border-border mb-3">
          <button
            type="button"
            onClick={() => handleSwitchAssignmentMode("auto_rotate")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
              assignmentMode === "auto_rotate"
                ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <RotateCcw size={13} />
            <span>Auto-rotate</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchAssignmentMode("one_person")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
              assignmentMode === "one_person"
                ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <User size={13} />
            <span>One person</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchAssignmentMode("multiple_people")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
              assignmentMode === "multiple_people"
                ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <Users size={13} />
            <span>Multiple people</span>
          </button>
        </div>

        {/* Mode A: Auto-rotate Explanation Card */}
        {assignmentMode === "auto_rotate" && (
          <div className="flex items-center gap-3 p-3 rounded-[10px] bg-paleSky/50 border border-sky/30">
            <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
              <RotateCcw size={18} className="text-navy" strokeWidth={2.4} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-navy leading-tight">
                Fair Round-Robin Rotation
              </p>
              <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
                Turns rotate automatically across all flatmates in equal order each time it&apos;s completed.
              </p>
            </div>
          </div>
        )}

        {/* Mode B: One Person */}
        {assignmentMode === "one_person" && (
          <div>
            <p className="text-[12px] text-grayBlack mb-2">
              Tap 1 flatmate to assign (no rotation):
            </p>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {members.map((m) => {
                const isSelected = selectedAssignees.includes(m.userId);
                const firstName = m.name ? m.name.split(" ")[0] : "Member";
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => handleMemberSelect(m.userId)}
                    className={`flex flex-col items-center p-2 rounded-[10px] border transition-all cursor-pointer min-w-[70px] ${
                      isSelected
                        ? "bg-paleSky/70 border-navy"
                        : "bg-offWhite border-border"
                    }`}
                  >
                    <div className="relative mb-1">
                      <Avatar name={m.name} image={m.image} size="md" />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-deepNavy rounded-full w-4 h-4 flex items-center justify-center border border-white">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-black truncate max-w-[64px]">
                      {firstName}
                    </span>
                    <span className="text-[10px] text-grayBlack uppercase">
                      {m.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mode C: Multiple People */}
        {assignmentMode === "multiple_people" && (
          <div>
            <p className="text-[12px] text-grayBlack mb-2">
              Select 2 or more flatmates ({selectedAssignees.length} selected):
            </p>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {members.map((m) => {
                const isSelected = selectedAssignees.includes(m.userId);
                const firstName = m.name ? m.name.split(" ")[0] : "Member";
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => handleMemberSelect(m.userId)}
                    className={`flex flex-col items-center p-2 rounded-[10px] border transition-all cursor-pointer min-w-[70px] ${
                      isSelected
                        ? "bg-paleSky/70 border-navy"
                        : "bg-offWhite border-border"
                    }`}
                  >
                    <div className="relative mb-1">
                      <Avatar name={m.name} image={m.image} size="md" />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-deepNavy rounded-full w-4 h-4 flex items-center justify-center border border-white">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-black truncate max-w-[64px]">
                      {firstName}
                    </span>
                    <span className="text-[10px] text-grayBlack uppercase">
                      {m.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. HOW OFTEN? */}
      <div className="mb-4">
        <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
          HOW OFTEN?
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {/* Once */}
          <button
            type="button"
            onClick={() => setRecurrence("once")}
            className={`flex flex-col items-center justify-center p-3 rounded-[10px] border transition-all cursor-pointer ${
              recurrence === "once"
                ? "bg-paleSky/60 border-navy"
                : "bg-white border-border hover:bg-offWhite"
            }`}
          >
            <CheckCircle2
              size={18}
              className={recurrence === "once" ? "text-navy" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span className="text-[13px] font-semibold text-black mt-1">Once</span>
            <span className="text-[10px] text-grayBlack">One time</span>
          </button>

          {/* Daily */}
          <button
            type="button"
            onClick={() => setRecurrence("daily")}
            className={`flex flex-col items-center justify-center p-3 rounded-[10px] border transition-all cursor-pointer ${
              recurrence === "daily"
                ? "bg-paleSky/60 border-navy"
                : "bg-white border-border hover:bg-offWhite"
            }`}
          >
            <Repeat
              size={18}
              className={recurrence === "daily" ? "text-navy" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span className="text-[13px] font-semibold text-black mt-1">Daily</span>
            <span className="text-[10px] text-grayBlack">Every day</span>
          </button>

          {/* Weekly */}
          <button
            type="button"
            onClick={() => setRecurrence("weekly")}
            className={`flex flex-col items-center justify-center p-3 rounded-[10px] border transition-all cursor-pointer ${
              recurrence === "weekly"
                ? "bg-paleSky/60 border-navy"
                : "bg-white border-border hover:bg-offWhite"
            }`}
          >
            <Calendar
              size={18}
              className={recurrence === "weekly" ? "text-navy" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span className="text-[13px] font-semibold text-black mt-1">Weekly</span>
            <span className="text-[10px] text-grayBlack">Same day/wk</span>
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={() => setRecurrence("custom")}
            className={`flex flex-col items-center justify-center p-3 rounded-[10px] border transition-all cursor-pointer ${
              recurrence === "custom"
                ? "bg-paleSky/60 border-navy"
                : "bg-white border-border hover:bg-offWhite"
            }`}
          >
            <SlidersHorizontal
              size={18}
              className={recurrence === "custom" ? "text-navy" : "text-mutedNavy"}
              strokeWidth={2.2}
            />
            <span className="text-[13px] font-semibold text-black mt-1">Custom</span>
            <span className="text-[10px] text-grayBlack">Days / Interval</span>
          </button>
        </div>

        {/* Custom Sub-options */}
        {recurrence === "custom" && (
          <div className="p-3 rounded-[10px] bg-offWhite border border-border space-y-3">
            <div className="flex bg-white rounded-[8px] p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setCustomMode("specific_days")}
                className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-semibold transition-all cursor-pointer ${
                  customMode === "specific_days"
                    ? "bg-navy text-white shadow-xs"
                    : "text-grayBlack"
                }`}
              >
                Days of Week
              </button>
              <button
                type="button"
                onClick={() => setCustomMode("interval")}
                className={`flex-1 py-1.5 rounded-[6px] text-[11px] font-semibold transition-all cursor-pointer ${
                  customMode === "interval"
                    ? "bg-navy text-white shadow-xs"
                    : "text-grayBlack"
                }`}
              >
                Every N Days
              </button>
            </div>

            {customMode === "specific_days" ? (
              <div className="flex items-center justify-between gap-1">
                {WEEKDAYS.map((d) => {
                  const isDaySelected = selectedWeekdays.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleWeekday(d.key)}
                      className={`flex-1 py-2 rounded-[8px] text-[12px] font-bold transition-all cursor-pointer border ${
                        isDaySelected
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-grayBlack border-border hover:border-navy/40"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 py-1">
                <button
                  type="button"
                  onClick={() => setEveryNDays((n) => Math.max(1, n - 1))}
                  className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-navy hover:bg-border cursor-pointer"
                >
                  <Minus size={16} />
                </button>
                <span className="text-[15px] font-bold text-navy min-w-[120px] text-center">
                  Every {everyNDays} {everyNDays === 1 ? "day" : "days"}
                </span>
                <button
                  type="button"
                  onClick={() => setEveryNDays((n) => n + 1)}
                  className="w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center text-navy hover:bg-border cursor-pointer"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. DUE DATE */}
      <div className="mb-6">
        <span className="block text-[12px] font-semibold text-deepNavy uppercase tracking-wider mb-2">
          DUE DATE
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((offset) => {
            const isSelected = dueOffsetDays === offset;
            const display = formatDateDisplay(offset);
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setDueOffsetDays(offset)}
                className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-paleSky/60 border-navy"
                    : "bg-white border-border hover:bg-offWhite"
                }`}
              >
                <p className="text-[13px] font-semibold text-black leading-tight">
                  {display.label}
                </p>
                <p className="text-[10px] text-grayBlack truncate mt-0.5">
                  {display.sub}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <Button
        title="Create Kaam"
        onClick={handleSave}
        loading={loading}
        className="w-full"
      />
    </Modal>
  );
};
