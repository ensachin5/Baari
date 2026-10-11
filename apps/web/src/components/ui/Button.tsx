"use client";

import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      title,
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      isLoading = false,
      icon,
      className = "",
      ...rest
    },
    ref
  ) => {
    const isBusy = loading || isLoading;

    // Direct translation of baari-app/components/ui/Button.tsx
    const baseStyle =
      "inline-flex items-center justify-center rounded-[10px] font-medium transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none";

    const sizeStyles = {
      sm: "py-2 px-3 text-[14px] leading-[20px]",
      md: "py-3 px-4 text-[16px] leading-[24px]",
      lg: "py-4 px-6 text-[18px] leading-[24px]",
    };

    const variantStyles = {
      primary:
        "bg-navy text-white hover:bg-deepNavy active:bg-deepNavy",
      secondary:
        "bg-paleSky text-deepNavy hover:bg-sky/40 active:bg-deepSky",
      outline:
        "bg-white text-navy border-[1.5px] border-navy hover:bg-offWhite active:bg-offWhite",
      ghost:
        "bg-transparent text-navy hover:bg-offWhite active:bg-offWhite",
    };

    const spinnerColor = variant === "primary" ? "text-white" : "text-navy";

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...rest}
      >
        {isBusy ? (
          <svg
            className={`animate-spin h-5 w-5 ${spinnerColor}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            {icon && <span className="inline-flex items-center">{icon}</span>}
            <span>{title || children}</span>
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
