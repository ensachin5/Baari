import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield, Lock, Eye, FileText, Database, Bell, UserCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Baari",
  description: "Learn how Baari collects, uses, and safeguards your personal information and living space data.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 15, 2026";

  return (
    <div className="min-h-screen bg-offWhite text-black flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-mutedNavy hover:text-navy transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back to Baari</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Image
              src="/baari-logo.png"
              alt="Baari"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="font-bold text-navy tracking-tight text-lg">Baari</span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-5 py-10 w-full flex-1">
        {/* Document Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paleSky text-deepNavy text-xs font-semibold uppercase tracking-wider mb-3">
            <Shield size={14} />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-grayBlack mt-2">
            Last Updated: <span className="font-medium text-black">{lastUpdated}</span>
          </p>
        </div>

        {/* Introduction Card */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 mb-8 shadow-xs leading-relaxed space-y-4">
          <p className="text-base text-black">
            Welcome to <strong>Baari</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). Baari is a shared living coordination platform designed to help roommates, flatmates, and hostel residents organize tasks (&ldquo;Kaam&rdquo;), split shared expenses, communicate, and manage household routines.
          </p>
          <p className="text-sm text-grayBlack">
            We value your trust and are committed to protecting your privacy. This Privacy Policy describes how we collect, use, store, and protect your information when you access or use our web application, mobile application, and related services (collectively, the &ldquo;Services&rdquo;).
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <Eye size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">1. Information We Collect</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>We collect only the information necessary to provide you with seamless shared living management:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-black">Google Account Data:</strong> When you sign in using Google OAuth, we receive your verified email address, full name, and avatar/profile picture. We do not receive or store your Google account password.
                </li>
                <li>
                  <strong className="text-black">Living Space & Membership Data:</strong> Information about the flat, PG, or living space you create or join, including flat name, invite codes, and your role (admin or member).
                </li>
                <li>
                  <strong className="text-black">Household Activity Data:</strong> Tasks and chores you assign, schedule, or complete; expense records and split amounts you log; and in-app chat messages exchanged within your flat room.
                </li>
                <li>
                  <strong className="text-black">Device & Push Notification Data:</strong> When push notifications are enabled, we store device push tokens to deliver reminders for chores, expenses, and announcements.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <FileText size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">2. How We Use Your Information</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>We use your information strictly for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Authenticating and verifying your identity via Google OAuth.</li>
                <li>Enabling shared chore rotation, scheduling, and completion tracking among your flatmates.</li>
                <li>Calculating shared expense splits and tracking settlements accurately.</li>
                <li>Delivering timely reminders and flat announcements via push notifications.</li>
                <li>Maintaining the security, performance, and integrity of our application.</li>
              </ul>
              <div className="mt-4 p-3.5 bg-paleSky/40 rounded-xl border border-border text-deepNavy text-xs font-medium">
                🔒 <strong>Zero Advertising / Data Selling:</strong> We do not sell, rent, or trade your personal data to any third-party advertisers or data brokers under any circumstances.
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <Database size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">3. Information Sharing & Disclosure</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>Your household data is shared strictly within your selected living space:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-black">With Your Flatmates:</strong> Members of your flat space can view your display name, avatar, assigned chores, expense shares, and messages posted to the flat chat.
                </li>
                <li>
                  <strong className="text-black">Infrastructure Providers:</strong> We use industry-standard cloud providers (such as Supabase PostgreSQL and Vercel hosting) to securely host our database and API services under strict data protection terms.
                </li>
                <li>
                  <strong className="text-black">Legal Compliance:</strong> We may disclose information if required to do so by applicable law, regulation, or valid legal process.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <Lock size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">4. Data Security & Retention</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>
                We implement robust security measures including Transport Layer Security (TLS/HTTPS) encryption in transit, encrypted database connections, and secure session management. Your information is retained for as long as your account is active and needed to provide the Services.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <UserCheck size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">5. Your Rights & Choices</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>You have full control over your information:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-black">Profile Updates:</strong> You can edit your display name and avatar at any time in the Profile tab.</li>
                <li><strong className="text-black">Leaving a Flat:</strong> You can leave any living space whenever you move or transition.</li>
                <li><strong className="text-black">Account Deletion:</strong> You can request full deletion of your account and personal records by contacting our support team.</li>
                <li><strong className="text-black">Notifications:</strong> You can enable or disable push notifications at any time in your device or browser settings.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <Bell size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">6. Contact Us</h2>
            </div>
            <div className="text-sm text-grayBlack leading-relaxed space-y-2">
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out to us:</p>
              <p className="font-semibold text-navy">Email: support@baari.app</p>
              <p>Web: <a href="https://baari-app.vercel.app" className="underline hover:text-navy">https://baari-app.vercel.app</a></p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-grayBlack">
          <p>&copy; {new Date().getFullYear()} Baari. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-navy hover:underline">
              Terms & Conditions
            </Link>
            <span>·</span>
            <Link href="/sign-in" className="hover:text-navy hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
