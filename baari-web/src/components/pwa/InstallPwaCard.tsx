"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Download, Share, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "baari_pwa_install_dismissed_at";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const InstallPwaCard: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // default true to avoid SSR flash
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if already running in standalone PWA mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      return;
    }
    setIsInstalled(false);

    // 2. Check dismissal cooldown (7 days)
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < SEVEN_DAYS_MS) {
        setDismissed(true);
        return;
      }
    }
    setDismissed(false);

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isIosSafari =
      isIosDevice &&
      /safari/.test(ua) &&
      !/crios|fxios|edgios|opios/.test(ua);

    if (isIosSafari) {
      setIsIOS(true);
    }

    // 4. Listen for beforeinstallprompt on Android / Chromium / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (_) {
    } finally {
      setInstalling(false);
    }
  };

  // Do not show if already standalone, dismissed, or unsupported
  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <Card
      variant="outlined"
      className="p-4 bg-gradient-to-br from-[#F4F6F9] to-[#E9EFF7] border-border relative overflow-hidden"
    >
      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-full text-mutedNavy hover:text-black hover:bg-white/60 transition-colors cursor-pointer"
        title="Dismiss for 7 days"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Smartphone size={20} className="text-sky" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-[16px] leading-[22px] font-semibold text-black">
              Install Baari App
            </h3>
            <Sparkles size={14} className="text-deepSky" />
          </div>

          <p className="text-[13px] leading-[18px] text-grayBlack mb-3">
            Add Baari to your home screen for quick offline access, instant notifications, and a full-screen native experience.
          </p>

          {/* Android / Desktop Install Action */}
          {deferredPrompt && (
            <div className="flex items-center gap-2">
              <Button
                title={installing ? "Installing..." : "Install App"}
                variant="primary"
                onClick={handleInstallClick}
                disabled={installing}
                icon={<Download size={15} />}
                className="py-1.5 px-4 text-[13px] h-9"
              />
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[12px] font-medium text-mutedNavy hover:text-navy px-2 py-1.5 cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* iOS Safari Share Instructions */}
          {isIOS && !deferredPrompt && (
            <div className="bg-white/90 backdrop-blur-sm border border-border p-3 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-paleSky text-deepNavy flex items-center justify-center flex-shrink-0">
                <Share size={16} />
              </div>
              <div className="text-[12px] leading-[17px] text-black">
                Tap <span className="font-semibold text-deepNavy">Share</span> in Safari toolbar, then select{" "}
                <span className="font-semibold text-deepNavy">"Add to Home Screen"</span>.
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
