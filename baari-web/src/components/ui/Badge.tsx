"use client";

import React from "react";
import {
  Check,
  Clock,
  AlertCircle,
  Droplets,
  Trash2,
  Brush,
  LayoutGrid,
} from "lucide-react";

export type BadgeStatus = "done" | "pending" | "in_progress" | "overdue" | "custom" | string;

export interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  status?: BadgeStatus;
  variant?: string;
  category?: "water" | "garbage" | "chore" | "custom" | string;
  className?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

/**
 * Mirrors baari-app/components/ui/Badge.tsx exactly.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  status,
  variant,
  category,
  className = "",
  showIcon = true,
}) => {
  const displayLabel = label || (typeof children === "string" ? children : "");

  if (category) {
    const catLower = category.toLowerCase();
    let catConfig = {
      bg: "bg-paleSky",
      border: "border-[#BAE6FD]",
      color: "text-navy",
      icon: <LayoutGrid size={11} className="text-navy" strokeWidth={2.2} />,
    };

    if (catLower === "water") {
      catConfig = {
        bg: "bg-[#F0F9FF]",
        border: "border-[#BAE6FD]",
        color: "text-[#0284C7]",
        icon: <Droplets size={11} className="text-[#0284C7]" strokeWidth={2.2} />,
      };
    } else if (catLower === "garbage") {
      catConfig = {
        bg: "bg-[#FFFBEB]",
        border: "border-[#FDE68A]",
        color: "text-[#D97706]",
        icon: <Trash2 size={11} className="text-[#D97706]" strokeWidth={2.2} />,
      };
    } else if (catLower === "chore") {
      catConfig = {
        bg: "bg-[#ECFDF5]",
        border: "border-[#A7F3D0]",
        color: "text-[#059669]",
        icon: <Brush size={11} className="text-[#059669]" strokeWidth={2.2} />,
      };
    }

    return (
      <div
        className={`inline-flex items-center py-[3px] px-2 rounded-[6px] border ${catConfig.bg} ${catConfig.border} ${className}`}
      >
        {showIcon && <span className="mr-1 inline-flex">{catConfig.icon}</span>}
        <span
          className={`text-[11px] leading-[14px] font-semibold capitalize ${catConfig.color}`}
        >
          {displayLabel || children}
        </span>
      </div>
    );
  }

  const effectiveStatus = (status || variant || "pending") as string;

  const statusConfigs: Record<
    string,
    { bg: string; border: string; text: string; icon: React.ReactNode }
  > = {
    done: {
      bg: "bg-paleSky",
      border: "border-transparent",
      text: "text-deepNavy",
      icon: <Check size={11} className="text-deepNavy" strokeWidth={2.5} />,
    },
    pending: {
      bg: "bg-offWhite",
      border: "border-navy",
      text: "text-mutedNavy",
      icon: <Clock size={11} className="text-mutedNavy" strokeWidth={2} />,
    },
    in_progress: {
      bg: "bg-paleSky",
      border: "border-sky",
      text: "text-navy",
      icon: <Clock size={11} className="text-deepSky" strokeWidth={2} />,
    },
    overdue: {
      bg: "bg-deepNavy",
      border: "border-deepNavy",
      text: "text-white",
      icon: <AlertCircle size={11} className="text-white" strokeWidth={2.5} />,
    },
    sky: {
      bg: "bg-paleSky",
      border: "border-transparent",
      text: "text-deepNavy",
      icon: null,
    },
    navy: {
      bg: "bg-navy",
      border: "border-navy",
      text: "text-white",
      icon: null,
    },
    custom: {
      bg: "bg-offWhite",
      border: "border-border",
      text: "text-grayBlack",
      icon: null,
    },
  };

  const config = statusConfigs[effectiveStatus] || statusConfigs.pending;

  return (
    <div
      className={`inline-flex items-center py-[3px] px-[10px] rounded-full border ${config.bg} ${config.border} ${className}`}
    >
      {showIcon && config.icon && (
        <span className="mr-1 inline-flex">{config.icon}</span>
      )}
      <span
        className={`text-[11px] leading-[14px] font-semibold ${config.text}`}
      >
        {displayLabel || children}
      </span>
    </div>
  );
};
