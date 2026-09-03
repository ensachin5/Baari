"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Mirrors baari-app/components/ui/Modal.tsx adapted as a responsive bottom sheet/modal on web.
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) {
        onClose();
      }
    };
    if (visible) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(6,23,41,0.45)] backdrop-blur-xs p-0 sm:p-4">
      {/* Backdrop overlay click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div className="relative z-10 bg-white w-full max-w-lg rounded-t-[20px] sm:rounded-[20px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border bg-white flex-shrink-0">
          <h2 className="text-[18px] leading-[24px] font-semibold text-black">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-offWhite text-navy hover:bg-border transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} className="text-navy" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 pb-8 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
