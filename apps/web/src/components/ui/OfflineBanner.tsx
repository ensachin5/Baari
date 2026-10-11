"use client";

import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-navy text-white text-[12px] font-semibold flex items-center justify-center gap-2 py-1.5 px-4 sticky top-0 z-50 shadow-sm animate-fade-in select-none">
      <WifiOff size={14} className="text-white" strokeWidth={2.2} />
      <span>You&apos;re offline — changes will sync when reconnected</span>
    </div>
  );
};
