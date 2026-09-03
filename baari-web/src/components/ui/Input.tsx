"use client";

import React, { useState } from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  containerClassName?: string;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      containerClassName = "",
      isPassword = false,
      type = "text",
      className = "",
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(!isPassword);

    const actualType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`mb-3 ${containerClassName}`}>
        {label && (
          <label className="block text-[14px] leading-[20px] font-medium text-deepNavy mb-1">
            {label}
          </label>
        )}
        <div
          className={`flex items-center bg-white rounded-[10px] px-3 h-12 transition-colors ${
            error
              ? "border-2 border-deepNavy"
              : isFocused
              ? "border-[1.5px] border-navy"
              : "border-[1.5px] border-border"
          }`}
        >
          <input
            ref={ref}
            type={actualType}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            className={`flex-1 bg-transparent text-[16px] leading-[24px] text-black placeholder:text-grayBlack focus:outline-none h-full ${className}`}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-grayBlack hover:text-navy cursor-pointer"
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-[12px] leading-[16px] font-semibold text-deepNavy mt-1">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
