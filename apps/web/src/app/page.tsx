"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { useSession } from "@/store/session";
import {
  ArrowRight,
  Download,
  CheckCircle2,
  Circle,
  Users,
  CheckSquare,
  Receipt,
  MessageSquare,
  Activity,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Zap,
  Smartphone,
  ExternalLink,
  Menu,
  X,
  RotateCw,
  Home,
  Check,
  IndianRupee,
} from "lucide-react";

// APK download artifact from verified EAS production/preview build
const APK_DOWNLOAD_URL =
  "https://expo.dev/artifacts/eas/7Gqyn0CAktWgIqO9PGcirnFs-33zaClCJNMtHjioyzA.apk";
const EAS_BUILD_LOGS_URL =
  "https://expo.dev/accounts/sachin5/projects/baari/builds/b5012eb0-9311-49c0-9423-a7da46353891";

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = useAuthSession();
  const { isHydrated, hydrate } = useSession();
  const storeUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);

  const currentUser = session?.user || storeUser;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<0 | 1 | 2>(0);

  // Interactive Kaam Demo State
  const [demoTasks, setDemoTasks] = useState([
    { id: 1, title: "Refill 20L Water Can", room: "Room 1 · Today", assignee: "Aryan", completed: true },
    { id: 2, title: "Take Out Wet & Dry Garbage", room: "Room 2 · Today", assignee: "Sachin", completed: false },
    { id: 3, title: "Deep Clean Kitchen Counter", room: "All · Tomorrow", assignee: "Rahul & Priya", completed: false },
  ]);

  // Interactive FAQ open state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const toggleTask = (id: number) => {
    setDemoTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAppLaunch = () => {
    if (currentUser) {
      if (activeFlat) {
        router.push("/home");
      } else {
        router.push("/choose");
      }
    } else {
      router.push("/sign-in");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#07194A] flex flex-col font-sans selection:bg-[#D4E8FF] selection:text-[#0866F5]">
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY TOP NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E8EFF8] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Tagline */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0866F5] to-[#258BFF] flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform overflow-hidden relative">
              <Image
                src="/baari-icon.png"
                alt="Baari Icon"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[22px] font-black tracking-tight leading-none text-[#07194A]">
                Baari
              </span>
              <span className="text-[11px] font-medium text-[#77839F] tracking-wide mt-0.5">
                Har Kaam Ki Apni Baari
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14.5px] font-semibold text-[#546282]">
            <a href="#features" className="hover:text-[#0866F5] transition-colors">
              Features
            </a>
            <a href="#kaam" className="hover:text-[#0866F5] transition-colors">
              Daily Kaam
            </a>
            <a href="#expenses" className="hover:text-[#0866F5] transition-colors">
              Expenses
            </a>
            <a href="#how-it-works" className="hover:text-[#0866F5] transition-colors">
              How It Works
            </a>
            <a href="#download" className="hover:text-[#0866F5] transition-colors flex items-center gap-1.5 text-[#0866F5]">
              <Download size={15} />
              Android APK
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={handleAppLaunch}
                className="h-10 px-5 rounded-full bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-bold text-[14px] flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Go to Flat Space</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="h-10 px-4 rounded-full text-[14px] font-bold text-[#546282] hover:text-[#07194A] hover:bg-[#F3F7FD] transition-colors flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-in"
                  className="h-10 px-5 rounded-full bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-bold text-[14px] flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <span>Open Web App</span>
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#546282] hover:bg-[#F3F7FD] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E8EFF8] px-4 pt-3 pb-6 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[15px] font-semibold text-[#546282] hover:text-[#0866F5] rounded-lg"
            >
              Features
            </a>
            <a
              href="#kaam"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[15px] font-semibold text-[#546282] hover:text-[#0866F5] rounded-lg"
            >
              Daily Kaam (Chores)
            </a>
            <a
              href="#expenses"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[15px] font-semibold text-[#546282] hover:text-[#0866F5] rounded-lg"
            >
              Split Expenses
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[15px] font-semibold text-[#546282] hover:text-[#0866F5] rounded-lg"
            >
              How It Works
            </a>
            <a
              href="#download"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[15px] font-semibold text-[#0866F5] flex items-center gap-2 rounded-lg bg-[#F0F7FF]"
            >
              <Download size={16} />
              Download Android APK
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAppLaunch();
                }}
                className="w-full h-11 rounded-xl bg-[#0866F5] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                <span>{currentUser ? "Go to Flat Space" : "Open Web App"}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Soft Background Radial Blurs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#EBF4FF] via-[#F4F9FF] to-transparent rounded-full blur-3xl -z-10 pointer-events-none opacity-80" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-[#DCEEF7]/50 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-[#E0EFFF]/50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Action */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDF6FF] border border-[#CCE3FD] text-[13px] font-bold text-[#0866F5] mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-[#0866F5] animate-pulse" />
                <span>Har Kaam Ki Apni Baari · Android & Web App Live</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-[#07194A] tracking-tight leading-[1.12]">
                Shared living, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0866F5] to-[#044BC4]">
                  without awkward reminders.
                </span>
              </h1>

              {/* Subheading */}
              <p className="mt-5 text-lg sm:text-xl text-[#546282] max-w-2xl font-normal leading-relaxed">
                The modern flatmate app for Indian apartments and hostels. Rotate daily chores fairly, split bills dispute-free, and coordinate in one stress-free space.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAppLaunch}
                  className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-extrabold text-[16px] flex items-center justify-center gap-3 shadow-xl shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>{currentUser ? "Go to Flat Space" : "Open Web App"}</span>
                  <ArrowRight size={20} strokeWidth={2.4} />
                </button>

                <a
                  href={APK_DOWNLOAD_URL}
                  download="baari-app.apk"
                  className="w-full sm:w-auto h-13 px-7 rounded-2xl bg-white hover:bg-[#F5FAFF] border-2 border-[#DCEBFA] hover:border-[#0866F5] active:scale-95 text-[#07194A] font-bold text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-sm group"
                >
                  <Download size={18} className="text-[#0866F5] group-hover:translate-y-0.5 transition-transform" />
                  <span>Download Android APK</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#EDF6FF] text-[#0866F5] font-black">
                    v1.0
                  </span>
                </a>
              </div>

              {/* Micro Trust Proof */}
              <div className="mt-8 pt-6 border-t border-[#EDF2F9] flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-[13px] font-semibold text-[#77839F]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#0866F5]" />
                  <span>100% Free & Open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={16} className="text-[#0866F5]" />
                  <span>1-Tap Google Sign-In</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-[#0866F5]" />
                  <span>Designed for 2 to 10+ Roommates</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Phone Mockup Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              {/* Tab Selector for Interactive Phone Preview */}
              <div className="bg-[#EDF5FF] p-1 rounded-2xl flex items-center gap-1 mb-5 border border-[#DCEBFA] shadow-inner">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab(0)}
                  className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                    activePreviewTab === 0
                      ? "bg-white text-[#0866F5] shadow-sm"
                      : "text-[#546282] hover:text-[#07194A]"
                  }`}
                >
                  Chores (Kaam)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab(1)}
                  className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                    activePreviewTab === 1
                      ? "bg-white text-[#0866F5] shadow-sm"
                      : "text-[#546282] hover:text-[#07194A]"
                  }`}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab(2)}
                  className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                    activePreviewTab === 2
                      ? "bg-white text-[#0866F5] shadow-sm"
                      : "text-[#546282] hover:text-[#07194A]"
                  }`}
                >
                  Home Space
                </button>
              </div>

              {/* Realistic Phone Container */}
              <div className="relative w-[300px] sm:w-[320px] aspect-[9/18.5] bg-[#07194A] rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(8,102,245,0.3)] border-4 border-[#0F286B]">
                {/* Dynamic Screen Artwork based on tab */}
                <div className="w-full h-full rounded-[38px] overflow-hidden bg-white relative">
                  <Image
                    src={
                      activePreviewTab === 0
                        ? "/phone2_full.png"
                        : activePreviewTab === 1
                        ? "/phone3_full.png"
                        : "/phone1_full.png"
                    }
                    alt="Baari App Screenshot"
                    fill
                    className="object-cover object-top transition-all duration-300"
                    priority
                  />
                </div>

                {/* Floating Notification Badge 1 */}
                <div className="absolute -left-6 top-20 bg-white/95 backdrop-blur-md border border-[#E0EEFA] p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-left duration-300">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F4FF] flex items-center justify-center text-[#0866F5] font-bold">
                    💧
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#07194A]">Water Tank Refilled</p>
                    <p className="text-[10.5px] text-[#77839F]">Aryan marked done · 5m ago</p>
                  </div>
                </div>

                {/* Floating Notification Badge 2 */}
                <div className="absolute -right-6 bottom-24 bg-white/95 backdrop-blur-md border border-[#E0EEFA] p-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300">
                  <div className="w-9 h-9 rounded-xl bg-[#E6F9F0] flex items-center justify-center text-[#10B981] font-bold">
                    ₹
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-[#07194A]">Wi-Fi & Groceries Split</p>
                    <p className="text-[10.5px] text-[#77839F]">You are owed ₹1,420</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. WHY BAARI? (PROBLEM vs SOLUTION)
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-[#F8FAFD] border-y border-[#E8EFF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[13px] font-black uppercase tracking-wider text-[#0866F5] bg-[#EAF2FF] px-3 py-1 rounded-full">
              Why We Built Baari
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#07194A] mt-4 tracking-tight">
              Shared household coordination without the tension.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#546282]">
              Living with 3, 5, or 8 flatmates is great until nobody refills the drinking water, everyone assumes someone else took out the garbage, and expense calculations turn into a brawl.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The WhatsApp Chaos */}
            <div className="p-8 rounded-3xl bg-white border border-[#EAEFF6] shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 font-bold flex items-center justify-center text-xl mb-6">
                  ❌
                </div>
                <h3 className="text-xl font-extrabold text-[#07194A]">
                  The WhatsApp Group Chaos
                </h3>
                <ul className="mt-6 space-y-4 text-[14.5px] text-[#546282]">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span>Reminders get drowned in memes, links, and chatter.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span>&ldquo;Whose turn is it?&rdquo; becomes a daily guessing game and blame-shifting.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span>Tasks needing 2 people stall because neither takes initiative.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span>Splitting milk, Wi-Fi, and maid expenses requires painful mental math.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100 text-[13px] font-medium text-red-600">
                Result: Forgotten chores, passive-aggressive notes, and friction.
              </div>
            </div>

            {/* The Baari Solution */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0866F5] to-[#044BC4] text-white shadow-xl shadow-blue-500/15 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white font-bold flex items-center justify-center text-xl mb-6">
                  ✨
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  The Baari Way
                </h3>
                <ul className="mt-6 space-y-4 text-[14.5px] text-blue-100">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />
                    <span><strong className="text-white">Automated Turn-Taking:</strong> Chores automatically rotate to the next flatmate upon completion.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />
                    <span><strong className="text-white">Multi-Assignee Accountability:</strong> Both roommates must mark their portion done for joint duties.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />
                    <span><strong className="text-white">Crystal-Clear ₹ Split:</strong> Transparent balances with one-tap &ldquo;Settle Up&rdquo;.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-white shrink-0 mt-0.5" />
                    <span><strong className="text-white">One Activity Feed:</strong> Real-time visibility into everything that gets done in the flat.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-white/20 text-[13px] font-semibold text-blue-100">
                Result: A peaceful, sparkling, organized home where everyone does their part.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. FEATURE 1: INTERACTIVE KAAM ROTATION DEMO
      ───────────────────────────────────────────────────────────── */}
      <section id="kaam" className="py-20 lg:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Interactive Demo Card */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCEBFA] shadow-[0_15px_40px_rgba(8,102,245,0.08)]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-lg font-black text-[#07194A]">Today&apos;s Baari</h4>
                    <p className="text-[12px] text-[#77839F]">Tap any task below to try the live checkmark:</p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EBF5FF] text-[#0866F5]">
                    Interactive Demo
                  </span>
                </div>

                {/* Demo Task List */}
                <div className="mt-5 space-y-3">
                  {demoTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group select-none ${
                        task.completed
                          ? "bg-[#F3F9FF] border-[#B9DCFF]"
                          : "bg-white border-[#E8EFF8] hover:border-[#0866F5]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            task.completed
                              ? "bg-[#0866F5] text-white"
                              : "border-2 border-[#CCD9EC] group-hover:border-[#0866F5]"
                          }`}
                        >
                          {task.completed && <Check size={16} strokeWidth={3} />}
                        </div>
                        <div>
                          <p
                            className={`text-[14.5px] font-bold transition-all ${
                              task.completed
                                ? "line-through text-[#77839F]"
                                : "text-[#07194A]"
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="text-[12px] text-[#8895B3] mt-0.5">
                            {task.room}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${
                            task.completed
                              ? "bg-green-100 text-green-700"
                              : "bg-[#EDF5FF] text-[#0866F5]"
                          }`}
                        >
                          {task.completed ? "Done" : task.assignee}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Helper hint */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] text-[#77839F]">
                  <span>Tasks auto-rotate to next flatmate once completed</span>
                  <span className="font-bold text-[#0866F5]">Auto-Rotation Enabled</span>
                </div>
              </div>
            </div>

            {/* Right: Copywriting */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="text-[13px] font-black uppercase tracking-wider text-[#0866F5] bg-[#EAF2FF] px-3 py-1 rounded-full">
                Core Feature 01
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#07194A] mt-4 tracking-tight leading-tight">
                Kaam (Tasks) with automatic turns & real accountability.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed text-[#546282]">
                Whether it is taking the water cans from the vendor, throwing out the daily trash, or cleaning the kitchen sink — create recurring duties that automatically cycle between flatmates.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] text-[#0866F5] flex items-center justify-center shrink-0 mt-0.5">
                    <RotateCw size={18} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-[#07194A]">Never Ask &ldquo;Whose Turn Is It?&rdquo;</h5>
                    <p className="text-[13.5px] text-[#546282] mt-0.5">
                      Baari advances the turn queue every time someone marks their chore as done.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E8F2FF] text-[#0866F5] flex items-center justify-center shrink-0 mt-0.5">
                    <Users size={18} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-[#07194A]">Multi-Person Verification</h5>
                    <p className="text-[13.5px] text-[#546282] mt-0.5">
                      Set chores to require 2 or 3 people. Each assignee marks their own portion independently.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. FEATURE 2: SPLIT EXPENSES IN ₹
      ───────────────────────────────────────────────────────────── */}
      <section id="expenses" className="py-20 bg-[#F8FAFD] border-y border-[#E8EFF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Copywriting */}
            <div className="lg:col-span-6">
              <span className="text-[13px] font-black uppercase tracking-wider text-[#0866F5] bg-[#EAF2FF] px-3 py-1 rounded-full">
                Core Feature 02
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-[#07194A] mt-4 tracking-tight leading-tight">
                Split bills transparently. Settle debts without awkwardness.
              </h3>
              <p className="mt-4 text-[16px] leading-relaxed text-[#546282]">
                Log groceries, cylinder refills, Wi-Fi bills, and maid payments in seconds. Baari calculates net balances across all flatmates so you never have to maintain messy spreadsheets.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E6F9F0] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-[#07194A]">Equal or Custom Splits</h5>
                    <p className="text-[13.5px] text-[#546282] mt-0.5">
                      Split equally among all flatmates or select only those who ate that late-night biryani.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E6F9F0] text-[#10B981] flex items-center justify-center shrink-0 mt-0.5">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-bold text-[#07194A]">Per-Member Balance Ledger</h5>
                    <p className="text-[13.5px] text-[#546282] mt-0.5">
                      Instantly see who owes you and who you need to pay, with 1-tap payment recording.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Graphic Expense Card */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCEBFA] shadow-[0_15px_40px_rgba(8,102,245,0.08)]">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-lg font-black text-[#07194A]">Flat Balances</h4>
                    <p className="text-[12px] text-[#77839F]">Summary for Green Glen Flat #302</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-[#E6F9F0] text-[#059669] font-extrabold text-[12px]">
                    You are owed ₹1,420
                  </div>
                </div>

                {/* Expense List items */}
                <div className="mt-5 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF6] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F4FF] flex items-center justify-center text-lg">
                        🛒
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#07194A]">Monthly Groceries</p>
                        <p className="text-[11.5px] text-[#77839F]">Paid by You · Split with 4 flatmates</p>
                      </div>
                    </div>
                    <span className="text-[15px] font-black text-[#0866F5]">+₹1,800</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF6] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-lg">
                        🔥
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#07194A]">HP Gas Cylinder</p>
                        <p className="text-[11.5px] text-[#77839F]">Paid by Sachin · Your share: ₹380</p>
                      </div>
                    </div>
                    <span className="text-[15px] font-black text-red-500">-₹380</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8FAFD] border border-[#EAEFF6] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg">
                        💧
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#07194A]">20L Drinking Water Cans</p>
                        <p className="text-[11.5px] text-[#77839F]">Paid by Priya · Split equally</p>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#059669] bg-green-50 px-2.5 py-1 rounded-full">
                      Settled Up
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[12px] text-[#77839F]">No complicated accounting · Clean ₹ breakdowns</span>
                  <button
                    type="button"
                    onClick={handleAppLaunch}
                    className="text-[12.5px] font-extrabold text-[#0866F5] hover:underline flex items-center gap-1"
                  >
                    <span>Try it in the app</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW IT WORKS (3 SIMPLE STEPS)
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[13px] font-black uppercase tracking-wider text-[#0866F5] bg-[#EAF2FF] px-3 py-1 rounded-full">
              Get Started In 60 Seconds
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#07194A] mt-4 tracking-tight">
              How Baari works for your flat.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#546282]">
              Zero complicated setup. One flatmate creates the space, everyone else joins via a 6-character code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-white border border-[#E8EFF8] shadow-sm relative group hover:border-[#0866F5] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#0866F5] font-black text-lg flex items-center justify-center mb-6">
                1
              </div>
              <h3 className="text-lg font-extrabold text-[#07194A]">
                Create Your Flat
              </h3>
              <p className="mt-2 text-[14.5px] text-[#546282] leading-relaxed">
                Sign in with Google in one tap. Give your home a name (e.g., &ldquo;B-404 Sunshine Palms&rdquo;) to generate your unique 6-character code.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-white border border-[#E8EFF8] shadow-sm relative group hover:border-[#0866F5] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#0866F5] font-black text-lg flex items-center justify-center mb-6">
                2
              </div>
              <h3 className="text-lg font-extrabold text-[#07194A]">
                Invite Your Roommates
              </h3>
              <p className="mt-2 text-[14.5px] text-[#546282] leading-relaxed">
                Share your invite code on WhatsApp. Your flatmates enter the code to instantly connect to your shared chore board and ledger.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-white border border-[#E8EFF8] shadow-sm relative group hover:border-[#0866F5] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF5FF] text-[#0866F5] font-black text-lg flex items-center justify-center mb-6">
                3
              </div>
              <h3 className="text-lg font-extrabold text-[#07194A]">
                Live in Clean Harmony
              </h3>
              <p className="mt-2 text-[14.5px] text-[#546282] leading-relaxed">
                Chores rotate smoothly, expenses stay balanced, and everyone knows what is happening without annoying WhatsApp tag spams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. DEDICATED ANDROID APK DOWNLOAD SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="download" className="py-20 bg-gradient-to-br from-[#061729] to-[#0A2540] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[13px] font-bold text-blue-200 mb-6 border border-white/10">
                <Smartphone size={16} />
                <span>Android App · Standalone APK v1.0.0</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Install Baari on your Android phone right now.
              </h2>
              <p className="mt-4 text-lg text-blue-100 max-w-2xl leading-relaxed">
                Get the full native mobile experience with 60fps gesture navigation, instant push notifications, swipe-to-chat, and haptic feedback.
              </p>

              {/* Download Buttons & EAS Link */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={APK_DOWNLOAD_URL}
                  download="baari-app.apk"
                  className="h-14 px-8 rounded-2xl bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-extrabold text-[16px] flex items-center gap-3 shadow-xl shadow-blue-500/30 transition-all cursor-pointer"
                >
                  <Download size={20} strokeWidth={2.5} />
                  <span>Download APK (Direct)</span>
                </a>

                <a
                  href={EAS_BUILD_LOGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-14 px-6 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 active:scale-95 text-white font-bold text-[14.5px] flex items-center gap-2 transition-all"
                >
                  <span>View EAS Build Certificate</span>
                  <ExternalLink size={16} />
                </a>
              </div>

              {/* 3-Step Install Guide */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/15 text-[13px]">
                <div>
                  <span className="font-extrabold text-blue-300 block mb-1">Step 1: Download</span>
                  <span className="text-slate-300">Tap the button above to download the APK (54 MB).</span>
                </div>
                <div>
                  <span className="font-extrabold text-blue-300 block mb-1">Step 2: Install</span>
                  <span className="text-slate-300">Open file & tap &ldquo;Install&rdquo; (allow unknown apps if prompted).</span>
                </div>
                <div>
                  <span className="font-extrabold text-blue-300 block mb-1">Step 3: Launch</span>
                  <span className="text-slate-300">Sign in with Google and join your flat in 10 seconds.</span>
                </div>
              </div>
            </div>

            {/* Right: Phone Art & QR Card */}
            <div className="lg:col-span-4 flex flex-col items-center">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-center flex flex-col items-center max-w-xs shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0866F5] to-[#258BFF] flex items-center justify-center mb-4 shadow-lg">
                  <Image
                    src="/baari-icon.png"
                    alt="Baari Icon"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <h4 className="text-xl font-bold text-white">Baari for Android</h4>
                <p className="text-[12.5px] text-blue-200 mt-1">
                  Built with React Native & Expo SDK 55 for butter-smooth performance.
                </p>
                <div className="mt-5 w-full pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[12px] font-semibold text-blue-200">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Verified Clean APK · No Ads</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. FAQ SECTION (ACCORDION)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-[13px] font-black uppercase tracking-wider text-[#0866F5] bg-[#EAF2FF] px-3 py-1 rounded-full">
              Got Questions?
            </span>
            <h2 className="text-3xl font-extrabold text-[#07194A] mt-3 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Can I use Baari on both my computer (Web) and my phone?",
                a: "Yes! Baari works seamlessly on modern web browsers (Chrome, Safari, Edge) on your laptop or tablet, as well as on your Android phone via our dedicated native APK.",
              },
              {
                q: "How does the Kaam (chore) turn-taking work?",
                a: "When you create a Kaam, you can set it to auto-rotate. Every time the assigned flatmate marks their duty as complete, Baari automatically advances the turn to the next roommate in line.",
              },
              {
                q: "How do multi-person chores work?",
                a: "For chores that need more than one person (e.g. cleaning the hall or buying weekly veggies), set people required to 2 or more. Each assignee marks their part done independently, so accountability is 100% clear.",
              },
              {
                q: "Is Baari completely free?",
                a: "Yes! Baari is completely free to use with no subscriptions, paywalls, or ads. We built it specifically to solve real roommate friction in shared apartments.",
              },
              {
                q: "How do flatmates join my space?",
                a: "After you create your flat, you'll receive a 6-character invite code (e.g. 7X9K2A). Share it on WhatsApp, and your roommates can enter the code to join in under 10 seconds.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="border border-[#E8EFF8] rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-[16px] text-[#07194A] flex items-center justify-between hover:bg-[#F9FBFE] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-[#77839F] transition-transform duration-200 shrink-0 ${
                      openFaq === idx ? "rotate-180 text-[#0866F5]" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-[14.5px] leading-relaxed text-[#546282] border-t border-slate-50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. CONVERSION BOTTOM BANNER
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#EDF6FF] border-t border-[#CCE3FD]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-[#07194A] tracking-tight">
            Make your shared home happy & dispute-free.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#546282] max-w-xl mx-auto">
            Get started in under a minute with 1-tap Google sign-in. Your roommates will thank you.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleAppLaunch}
              className="w-full sm:w-auto h-13 px-8 rounded-2xl bg-[#0866F5] hover:bg-[#0757D1] active:scale-95 text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span>{currentUser ? "Open Flat Space" : "Launch Web App Free"}</span>
              <ArrowRight size={18} />
            </button>
            <a
              href={APK_DOWNLOAD_URL}
              download="baari-app.apk"
              className="w-full sm:w-auto h-13 px-6 rounded-2xl bg-white border border-[#DCEBFA] hover:border-[#0866F5] active:scale-95 text-[#07194A] font-bold text-[14.5px] flex items-center justify-center gap-2 transition-all"
            >
              <Download size={18} className="text-[#0866F5]" />
              <span>Download Android APK</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#E8EFF8] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0866F5] flex items-center justify-center overflow-hidden">
              <Image
                src="/baari-icon.png"
                alt="Baari Icon"
                width={26}
                height={26}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-[16px] text-[#07194A]">Baari</span>
              <span className="text-[12px] text-[#77839F] ml-2">Har Kaam Ki Apni Baari</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[13px] font-medium text-[#77839F]">
            <Link href="/privacy" className="hover:text-[#0866F5] transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[#0866F5] transition-colors">
              Terms & Conditions
            </Link>
            <span>·</span>
            <Link href="/sign-in" className="hover:text-[#0866F5] transition-colors">
              Sign In
            </Link>
            <span>·</span>
            <a href={APK_DOWNLOAD_URL} className="hover:text-[#0866F5] transition-colors">
              Android APK
            </a>
          </div>

          <p className="text-[12.5px] text-[#8895B3]">
            © {new Date().getFullYear()} Baari. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
