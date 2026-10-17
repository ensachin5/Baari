"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Wifi, Battery, Smartphone, Columns } from "lucide-react";

interface OnboardingSlideData {
  id: number;
  artwork: string;
  artworkAlt: string;
  title1: string;
  title2: string;
  description: string;
}

const SLIDES: OnboardingSlideData[] = [
  {
    id: 1,
    artwork: "/onboarding-art-1.png",
    artworkAlt: "Baari - A Happier Home Together",
    title1: "A Happier Home",
    title2: "Together.",
    description:
      "Track chores, split expenses, and stay connected with your roommates — all in one place.",
  },
  {
    id: 2,
    artwork: "/onboarding-art-2.png",
    artworkAlt: "Manage Daily Chores Effortlessly",
    title1: "Manage Daily Chores",
    title2: "Effortlessly.",
    description:
      "Assign tasks, track progress, and make sure everything gets done — without any confusion.",
  },
  {
    id: 3,
    artwork: "/onboarding-art-3.png",
    artworkAlt: "Split Expenses Fairly",
    title1: "Split Expenses",
    title2: "Fairly.",
    description:
      "Keep track of shared expenses and settle up easily with your roommates.",
  },
];

// Cellular Signal Icon matching Reference Status Bar
function SignalIcon({ className = "w-3.5 h-2.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="8" width="2.5" height="3" rx="0.6" fill="currentColor" />
      <rect x="4.5" y="5.5" width="2.5" height="5.5" rx="0.6" fill="currentColor" />
      <rect x="8.5" y="3" width="2.5" height="8" rx="0.6" fill="currentColor" />
      <rect x="12.5" y="0.5" width="2.5" height="10.5" rx="0.6" fill="currentColor" />
    </svg>
  );
}

// Single Phone Screen Component (Used for desktop side-by-side gallery)
function PhoneScreen({
  slide,
  index,
  totalSlides,
  onNext,
  onSkip,
  onDotClick,
  isInteractive = true,
}: {
  slide: OnboardingSlideData;
  index: number;
  totalSlides: number;
  onNext?: () => void;
  onSkip?: () => void;
  onDotClick?: (idx: number) => void;
  isInteractive?: boolean;
}) {
  const isLast = index === totalSlides - 1;

  return (
    <div className="w-full h-full bg-white flex flex-col justify-between select-none relative overflow-hidden">
      {/* 1. Mobile Status Bar */}
      <div className="w-full flex items-center justify-between text-black pt-3 pb-1 px-6 shrink-0 relative z-20 bg-white">
        <span className="text-[13.5px] font-semibold tracking-tight">9:41</span>
        <div className="flex items-center gap-1.5 text-black">
          <SignalIcon className="w-3.5 h-2.5 text-black" />
          <Wifi size={13} strokeWidth={2.4} className="text-black" />
          <div className="flex items-center">
            <Battery size={17} strokeWidth={2.2} className="text-black" />
          </div>
        </div>
      </div>

      {/* 2. Full-Bleed Artwork Image taken as it is */}
      <div className="w-full relative aspect-[285/428] shrink-0 bg-white">
        <Image
          src={slide.artwork}
          alt={slide.artworkAlt}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 420px"
          className="object-contain object-top pointer-events-none select-none"
        />
      </div>

      {/* 3. Text Section */}
      <div className="flex-1 flex flex-col justify-between px-6 pt-1 pb-6 bg-white z-10">
        <div className="text-center pt-1">
          <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-[1.18]">
            <span className="block text-[#07194A]">{slide.title1}</span>
            <span className="block text-[#0878F9]">{slide.title2}</span>
          </h1>
          <p className="text-[13.5px] sm:text-[14px] leading-[21px] sm:leading-[22px] text-[#77839F] font-normal mt-2.5 max-w-[310px] mx-auto">
            {slide.description}
          </p>
        </div>

        {/* 4. Bottom Navigation (Non-overlapping, cleanly spaced) */}
        <div className="w-full flex items-center justify-between pt-4 relative min-h-[56px]">
          {/* Skip Button Slot */}
          <div className="w-[65px] flex items-center justify-start shrink-0">
            <button
              type="button"
              onClick={onSkip}
              disabled={!isInteractive || isLast}
              className={`text-[15px] font-medium text-[#77839F] hover:text-[#07194A] active:scale-95 transition-all duration-300 py-1 ${
                !isLast ? "opacity-100 cursor-pointer" : "opacity-0 pointer-events-none cursor-default"
              }`}
            >
              Skip
            </button>
          </div>

          {/* Pagination Dots (3 clean circular dots, zero overlap) */}
          <div className="flex-1 flex items-center justify-center gap-2 shrink-0">
            {Array.from({ length: totalSlides }).map((_, dotIdx) => {
              const isActive = dotIdx === index;
              return (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => onDotClick?.(dotIdx)}
                  disabled={!isInteractive}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-[#0878F9] scale-110 shadow-[0_2px_6px_rgba(8,120,249,0.4)]"
                      : "bg-[#D4E8FF] hover:bg-[#B8DCFF] scale-95"
                  }`}
                />
              );
            })}
          </div>

          {/* Action Button */}
          <div className="min-w-[65px] flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onNext}
              disabled={!isInteractive}
              aria-label={isLast ? "Get Started" : "Next slide"}
              className={`h-[48px] rounded-full bg-[#0878F9] hover:bg-[#0066E6] active:scale-95 text-white font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(8,120,249,0.35)] cursor-pointer whitespace-nowrap overflow-hidden transition-all duration-300 ease-out select-none shrink-0 ${
                isLast ? "px-5 w-auto" : "w-[48px] px-0"
              }`}
            >
              <span
                className={`overflow-hidden transition-all duration-300 ease-out flex items-center whitespace-nowrap ${
                  isLast
                    ? "max-w-[110px] opacity-100 mr-2 text-[15px]"
                    : "max-w-0 opacity-0 mr-0 text-[0px]"
                }`}
              >
                Get Started
              </span>
              <ArrowRight
                size={isLast ? 18 : 22}
                strokeWidth={2.4}
                className="shrink-0 transition-transform duration-300 ease-out"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SplashOnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [desktopViewMode, setDesktopViewMode] = useState<"single" | "all">("single");

  // Touch & Pointer Gesture Tracking for smooth swiping
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isPointerDownRef = useRef(false);

  // Live active dot index moving synchronously with hand swipe
  const activeDotIndex = (() => {
    if (!isDragging) return currentSlide;
    if (dragOffset < -30 && currentSlide < SLIDES.length - 1) return currentSlide + 1;
    if (dragOffset > 30 && currentSlide > 0) return currentSlide - 1;
    return currentSlide;
  })();

  const isCurrentLast = activeDotIndex === SLIDES.length - 1;

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(SLIDES.length - 1, index)));
  }, []);

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("baari_onboarded", "true");
      }
      router.push("/sign-in");
    }
  }, [currentSlide, router]);

  const handleSkip = useCallback(() => {
    setCurrentSlide(SLIDES.length - 1);
  }, []);

  // Gesture Start
  const handleStart = (clientX: number) => {
    isPointerDownRef.current = true;
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  // Gesture Move with boundary resistance
  const handleMove = (clientX: number) => {
    if (!isPointerDownRef.current) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;

    // Apply soft rubber-band resistance at edges
    if (
      (currentSlide === 0 && diff > 0) ||
      (currentSlide === SLIDES.length - 1 && diff < 0)
    ) {
      setDragOffset(diff * 0.28);
    } else {
      setDragOffset(diff);
    }
  };

  // Gesture End: Evaluate Swipe Threshold
  const handleEnd = useCallback(() => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    const diff = currentXRef.current - startXRef.current;
    const swipeThreshold = 40; // 40px drag triggers slide transition

    if (diff < -swipeThreshold && currentSlide < SLIDES.length - 1) {
      // Swiped right-to-left: move 1 -> 2 or 2 -> 3
      setCurrentSlide((prev) => prev + 1);
    } else if (diff > swipeThreshold && currentSlide > 0) {
      // Swiped left-to-right: move 3 -> 2 or 2 -> 1
      setCurrentSlide((prev) => prev - 1);
    }
    setDragOffset(0);
  }, [currentSlide]);

  // Window pointerup listener to prevent stuck drag states
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        handleEnd();
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [handleEnd]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        handleNext();
      } else if (e.key === "ArrowLeft" && currentSlide > 0) {
        setCurrentSlide((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, currentSlide]);

  return (
    <main className="min-h-[100dvh] w-full bg-[#F3F8FF] flex flex-col items-center justify-center p-0 sm:p-6 relative selection:bg-blue-100 overflow-x-hidden">
      {/* Background ambient lighting for desktop */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-[#E1EFFF] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-[#E8F4FF] rounded-full blur-3xl pointer-events-none opacity-60" />

      {/* Desktop Preview Mode Toggle Bar (Visible on desktop screens only) */}
      <div className="hidden lg:flex items-center gap-3 mb-5 z-20 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#DCEBFA] shadow-xs">
        <span className="text-[13px] font-semibold text-[#07194A] mr-1">View Mode:</span>
        <button
          type="button"
          onClick={() => setDesktopViewMode("single")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${
            desktopViewMode === "single"
              ? "bg-[#0878F9] text-white shadow-xs"
              : "text-[#77839F] hover:text-[#07194A]"
          }`}
        >
          <Smartphone size={15} />
          <span>Interactive Mobile</span>
        </button>
        <button
          type="button"
          onClick={() => setDesktopViewMode("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all cursor-pointer ${
            desktopViewMode === "all"
              ? "bg-[#0878F9] text-white shadow-xs"
              : "text-[#77839F] hover:text-[#07194A]"
          }`}
        >
          <Columns size={15} />
          <span>All 3 Screens Preview</span>
        </button>
      </div>

      {/* ── Mode A: Side-by-Side 3-Screen Preview (Matches Reference Image) ── */}
      {desktopViewMode === "all" ? (
        <div className="hidden lg:flex items-center justify-center gap-8 w-full max-w-7xl z-10 py-4 animate-in fade-in duration-300">
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className="relative w-[360px] h-[750px] bg-black rounded-[48px] p-3 shadow-[0_25px_60px_rgba(7,25,74,0.18)] border-4 border-[#1A1A1A]"
            >
              <div className="w-full h-full rounded-[38px] overflow-hidden bg-white">
                <PhoneScreen
                  slide={slide}
                  index={idx}
                  totalSlides={SLIDES.length}
                  isInteractive={false}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Mode B: Interactive Single Screen (Mobile full-screen + Desktop phone frame) ── */}
      <div
        className={`${
          desktopViewMode === "all" ? "lg:hidden" : "flex"
        } w-full min-h-[100dvh] sm:min-h-0 sm:w-[390px] sm:h-[780px] sm:rounded-[44px] sm:p-2.5 sm:bg-black sm:shadow-[0_25px_60px_rgba(7,25,74,0.16)] sm:border-4 sm:border-[#1E1E1E] z-10 transition-all select-none`}
      >
        {/* Inner screen container with smooth swiping carousel */}
        <div className="w-full h-full bg-white sm:rounded-[36px] overflow-hidden flex flex-col justify-between relative select-none">
          
          {/* 1. Mobile Status Bar (Fixed at top) */}
          <div className="w-full flex items-center justify-between text-black pt-3 pb-1 px-6 shrink-0 relative z-30 bg-white">
            <span className="text-[13.5px] font-semibold tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5 text-black">
              <SignalIcon className="w-3.5 h-2.5 text-black" />
              <Wifi size={13} strokeWidth={2.4} className="text-black" />
              <div className="flex items-center">
                <Battery size={17} strokeWidth={2.2} className="text-black" />
              </div>
            </div>
          </div>

          {/* 2. Interactive Sliding Carousel Track (Slides 1 ↔ 2 ↔ 3) */}
          <div
            className="flex-1 w-full overflow-hidden relative cursor-grab active:cursor-grabbing touch-pan-y"
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
          >
            <div
              className="flex h-full"
              style={{
                width: "300%",
                transform: `translateX(calc(-${currentSlide * (100 / 3)}% + ${dragOffset}px))`,
                transition: isDragging
                  ? "none"
                  : "transform 350ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "transform",
              }}
            >
              {SLIDES.map((slide) => (
                <div
                  key={slide.id}
                  style={{ width: "33.333333%" }}
                  className="h-full flex flex-col justify-between shrink-0 px-0 bg-white"
                >
                  {/* Artwork Image */}
                  <div className="w-full relative aspect-[285/428] shrink-0 bg-white">
                    <Image
                      src={slide.artwork}
                      alt={slide.artworkAlt}
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, 420px"
                      className="object-contain object-top pointer-events-none select-none"
                    />
                  </div>

                  {/* Headline & Description */}
                  <div className="flex-1 flex flex-col justify-center px-6 pt-1 pb-4 bg-white text-center">
                    <h1 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight leading-[1.18]">
                      <span className="block text-[#07194A]">{slide.title1}</span>
                      <span className="block text-[#0878F9]">{slide.title2}</span>
                    </h1>
                    <p className="text-[13.5px] sm:text-[14px] leading-[21px] sm:leading-[22px] text-[#77839F] font-normal mt-2.5 max-w-[310px] mx-auto">
                      {slide.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Bottom Navigation Bar (Non-overlapping, cleanly spaced) */}
          <div className="w-full flex items-center justify-between pt-2 pb-6 px-6 bg-white shrink-0 relative z-30 min-h-[76px]">
            {/* Skip Button Slot */}
            <div className="w-[65px] flex items-center justify-start shrink-0">
              <button
                type="button"
                onClick={handleSkip}
                className={`text-[15px] font-medium text-[#77839F] hover:text-[#07194A] active:scale-95 py-1 transition-opacity duration-300 ${
                  !isCurrentLast
                    ? "opacity-100 cursor-pointer"
                    : "opacity-0 pointer-events-none cursor-default"
                }`}
              >
                Skip
              </button>
            </div>

            {/* Pagination Dots (3 clean circular dots matching reference design) */}
            <div className="flex-1 flex items-center justify-center gap-2.5 shrink-0">
              {SLIDES.map((_, dotIdx) => {
                const isActive = dotIdx === activeDotIndex;
                return (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => goToSlide(dotIdx)}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300 ease-out ${
                      isActive
                        ? "bg-[#0878F9] scale-110 shadow-[0_2px_6px_rgba(8,120,249,0.4)]"
                        : "bg-[#D4E8FF] hover:bg-[#B8DCFF] scale-95"
                    }`}
                  />
                );
              })}
            </div>

            {/* Action Button: Smooth unified morphing button */}
            <div className="min-w-[65px] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={handleNext}
                aria-label={isCurrentLast ? "Get Started" : "Next slide"}
                className={`h-[48px] rounded-full bg-[#0878F9] hover:bg-[#0066E6] active:scale-95 text-white font-bold flex items-center justify-center shadow-[0_8px_20px_rgba(8,120,249,0.35)] cursor-pointer whitespace-nowrap overflow-hidden transition-all duration-300 ease-out select-none shrink-0 ${
                  isCurrentLast
                    ? "px-5 w-auto"
                    : "w-[48px] px-0"
                }`}
              >
                <span
                  className={`overflow-hidden transition-all duration-300 ease-out flex items-center whitespace-nowrap ${
                    isCurrentLast
                      ? "max-w-[110px] opacity-100 mr-2 text-[15px]"
                      : "max-w-0 opacity-0 mr-0 text-[0px]"
                  }`}
                >
                  Get Started
                </span>
                <ArrowRight
                  size={isCurrentLast ? 18 : 22}
                  strokeWidth={2.4}
                  className="shrink-0 transition-transform duration-300 ease-out"
                />
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
