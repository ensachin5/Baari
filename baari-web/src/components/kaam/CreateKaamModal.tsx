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
export type AssignmentMode = "auto_rotate" | "custom_rotation";

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
    assignmentMode?: "auto_rotate" | "custom_rotation";
    customRotationPool?: string[] | null;
    customRotationGroupSize?: number;
    customRotationGroups?: Array<{ groupOrder: number; userIds: string[] }> | null;
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
  const [groupSize, setGroupSize] = useState<number>(1);

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

  // Compute rotation groups based on selectedAssignees and groupSize
  const rotationGroups = React.useMemo(() => {
    if (assignmentMode !== "custom_rotation" || selectedAssignees.length === 0) return [];
    if (selectedAssignees.length === 1) {
      return [{ groupOrder: 1, userIds: [selectedAssignees[0]] }];
    }
    const effectiveSize = Math.min(Math.max(1, groupSize), selectedAssignees.length);
    const groups: Array<{ groupOrder: number; userIds: string[] }> = [];
    let order = 1;
    for (let i = 0; i < selectedAssignees.length; i += effectiveSize) {
      const chunk = selectedAssignees.slice(i, i + effectiveSize);
      groups.push({ groupOrder: order++, userIds: chunk });
    }
    return groups;
  }, [assignmentMode, selectedAssignees, groupSize]);

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
    } else if (mode === "custom_rotation") {
      if (selectedAssignees.length === 0 && members.length > 0) {
        setSelectedAssignees([members[0].userId]);
      }
    }
  };

  const handleMemberSelect = (userId: string) => {
    setError("");
    if (selectedAssignees.includes(userId)) {
      if (selectedAssignees.length === 1) {
        setError("Custom rotation requires at least 1 person selected");
        return;
      }
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
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
    let finalGroups: Array<{ groupOrder: number; userIds: string[] }> | null = null;
    let finalGroupSize = 1;

    if (assignmentMode === "auto_rotate") {
      finalAssignees = members.map((m) => m.userId);
      if (finalAssignees.length === 0) {
        setError("No flat members found in this flat");
        return;
      }
      peopleReq = 1;
    } else if (assignmentMode === "custom_rotation") {
      if (selectedAssignees.length === 0) {
        setError("Please select at least 1 flatmate for custom rotation");
        return;
      }
      if (rotationGroups.length === 0) {
        setError("Could not build rotation groups");
        return;
      }
      finalGroups = rotationGroups;
      finalGroupSize = selectedAssignees.length === 1 ? 1 : Math.min(groupSize, selectedAssignees.length);
      finalAssignees = rotationGroups[0].userIds;
      peopleReq = finalAssignees.length;
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
        assignmentMode,
        customRotationPool: assignmentMode === "custom_rotation" ? selectedAssignees : null,
        customRotationGroupSize: finalGroupSize,
        customRotationGroups: finalGroups,
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

      {/* 3. ASSIGN TO (2 MODES: AUTO-ROTATE & CUSTOM ROTATION) */}
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
            onClick={() => handleSwitchAssignmentMode("custom_rotation")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 rounded-[6px] text-[12px] font-semibold transition-all cursor-pointer ${
              assignmentMode === "custom_rotation"
                ? "bg-navy text-white shadow-[0_1px_2px_rgba(6,23,41,0.15)]"
                : "text-mutedNavy hover:text-navy"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Custom Rotation</span>
          </button>
        </div>

        {/* Mode 1: Auto-rotate Explanation Card */}
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

        {/* Mode 2: Custom Rotation */}
        {assignmentMode === "custom_rotation" && (
          <div>
            <p className="text-[12px] text-grayBlack mb-2">
              Select flatmate(s) for this Kaam ({selectedAssignees.length} selected):
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

            {/* Case A: Exactly 1 Person Selected -> Skip Group Size & Show Direct Assignment Card */}
            {selectedAssignees.length === 1 && (
              <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] mt-3">
                <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-navy" strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-navy leading-tight">
                    This Kaam is assigned to {members.find((m) => m.userId === selectedAssignees[0])?.name || "Selected Member"}
                  </p>
                  <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
                    Assigned to this person on every occurrence (no rotation).
                  </p>
                </div>
              </div>
            )}

            {/* Case B: Multiple People Selected -> Group Size Selector & Rotation Preview */}
            {selectedAssignees.length > 1 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold tracking-wider text-grayBlack uppercase mb-1.5">
                  GROUP SIZE PER TURN
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setGroupSize(1)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                      groupSize === 1
                        ? "bg-navy border-navy text-white shadow-xs"
                        : "bg-offWhite border-border text-navy hover:bg-border/60"
                    }`}
                  >
                    Individual (1)
                  </button>

                  {selectedAssignees.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setGroupSize(2)}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                        groupSize === 2
                          ? "bg-navy border-navy text-white shadow-xs"
                          : "bg-offWhite border-border text-navy hover:bg-border/60"
                      }`}
                    >
                      Pairs (2)
                    </button>
                  )}

                  {selectedAssignees.length >= 3 && (
                    <button
                      type="button"
                      onClick={() => setGroupSize(3)}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                        groupSize === 3
                          ? "bg-navy border-navy text-white shadow-xs"
                          : "bg-offWhite border-border text-navy hover:bg-border/60"
                      }`}
                    >
                      Trios (3)
                    </button>
                  )}

                  {selectedAssignees.length > 2 && groupSize !== selectedAssignees.length && (
                    <button
                      type="button"
                      onClick={() => setGroupSize(selectedAssignees.length)}
                      className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all cursor-pointer ${
                        groupSize === selectedAssignees.length
                          ? "bg-navy border-navy text-white shadow-xs"
                          : "bg-offWhite border-border text-navy hover:bg-border/60"
                      }`}
                    >
                      All Together ({selectedAssignees.length})
                    </button>
                  )}
                </div>

                {/* Confirmation / Rotation Preview */}
                {rotationGroups.length === 1 ? (
                  <div className="flex items-center gap-3 p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="w-9 h-9 rounded-full bg-paleSky flex items-center justify-center flex-shrink-0">
                      <Users size={18} className="text-navy" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-navy leading-tight">
                        Assigned to {selectedAssignees.map((id) => members.find((m) => m.userId === id)?.name?.split(" ")[0] || "Member").join(", ")} together
                      </p>
                      <p className="text-[12px] text-mutedNavy leading-normal mt-0.5">
                        All {selectedAssignees.length} flatmates are assigned together on every occurrence (no rotation).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-[10px] bg-paleSky/50 border border-sky/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <RotateCcw size={14} className="text-navy" />
                      <p className="text-[12px] font-semibold text-navy">
                        Rotation Order ({rotationGroups.length} turns):
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {rotationGroups.map((grp, idx) => {
                        const names = grp.userIds
                          .map((id) => members.find((m) => m.userId === id)?.name?.split(" ")[0] || "Member")
                          .join(" & ");
                        return (
                          <div key={grp.groupOrder} className="flex items-center gap-1.5">
                            <span className="bg-navy text-white text-[10px] font-semibold px-2 py-0.5 rounded-[4px]">
                              Turn {grp.groupOrder}
                            </span>
                            <span className="text-[12px] font-semibold text-navy">
                              {names}
                            </span>
                            {idx < rotationGroups.length - 1 && (
                              <span className="text-mutedNavy text-[12px]">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-mutedNavy">
                      Turns rotate automatically across these groups on completion.
                    </p>
                  </div>
                )}
              </div>
            )}
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
