"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "outlined" | "muted";
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  variant = "outlined",
  onClick,
  ...props
}: CardProps) {
  // Direct translation of baari-app/components/ui/Card.tsx
  const variantStyles = {
    elevated:
      "bg-white shadow-[0_2px_8px_rgba(6,23,41,0.08)]",
    outlined:
      "bg-white border border-border",
    muted:
      "bg-offWhite border border-border",
  };

  const clickableStyles = onClick
    ? "cursor-pointer active:opacity-75 transition-opacity"
    : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] p-4 ${variantStyles[variant]} ${clickableStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
