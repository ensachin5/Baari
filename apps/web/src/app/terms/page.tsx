import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, FileText, CheckCircle2, AlertCircle, Scale, ShieldAlert, LifeBuoy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Baari",
  description: "Terms and conditions governing the use of the Baari flat and shared living management platform.",
};

export default function TermsAndConditionsPage() {
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
            <FileText size={14} />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-black tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-sm text-grayBlack mt-2">
            Last Updated: <span className="font-medium text-black">{lastUpdated}</span>
          </p>
        </div>

        {/* Introduction Card */}
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 mb-8 shadow-xs leading-relaxed space-y-4">
          <p className="text-base text-black">
            These Terms & Conditions (&ldquo;Terms&rdquo;) govern your access to and use of <strong>Baari</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), including our website, mobile applications, and all related shared living coordination tools (collectively, the &ldquo;Services&rdquo;).
          </p>
          <p className="text-sm text-grayBlack">
            By creating an account, signing in through Google OAuth, or using any part of the Services, you agree to be bound by these Terms. If you do not agree, please do not access or use Baari.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">1. Eligibility & Accounts</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-black">Age Requirement:</strong> You must be at least 13 years old (or the legal age of majority in your jurisdiction) to use the Services.
                </li>
                <li>
                  <strong className="text-black">Account Verification:</strong> Authentication is handled via Google OAuth. You are responsible for maintaining the security of your Google account and credentials.
                </li>
                <li>
                  <strong className="text-black">Account Responsibility:</strong> You agree that all actions taken under your account are your responsibility. Notify us immediately if you suspect unauthorized use of your account.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <Scale size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">2. Scope of Services & Living Spaces</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>Baari provides tools to coordinate everyday shared living responsibilities:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-black">Living Space Administration:</strong> Users may create flats, hostels, or PGs, share invite codes, and assign administrative or member roles.
                </li>
                <li>
                  <strong className="text-black">Chore Management (&ldquo;Kaam&rdquo;):</strong> Users can create, assign, rotate, and mark household tasks as complete.
                </li>
                <li>
                  <strong className="text-black">Household Communication:</strong> Flatmates can post announcements, exchange chat messages, and send chore reminders.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">3. Expense Tracking Disclaimer</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>
                Baari provides an expense tracking and balance calculation calculator for flatmates.
              </p>
              <div className="p-4 bg-paleSky/50 rounded-xl border border-border text-deepNavy text-xs font-medium space-y-2">
                <p>
                  ⚠️ <strong>Important Financial Notice:</strong> Baari is <em>not</em> a bank, financial institution, money transmitter, or payment processor.
                </p>
                <p>
                  All monetary calculations displayed in Baari are informational estimates based on user-entered data. Actual transfers and settlements of funds occur externally between roommates through their own chosen payment methods (e.g., cash or external UPI/banking apps).
                </p>
              </div>
              <p>
                We are not responsible for any disputes, inaccuracies in user-entered amounts, or failed private financial settlements between roommates.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">4. Acceptable Use & Conduct</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>You agree not to use the Services to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Harass, abuse, impersonate, or threaten other roommates or users.</li>
                <li>Upload defamatory, obscene, fraudulent, or unlawful content.</li>
                <li>Interfere with or disrupt the integrity or performance of the servers, networks, or database.</li>
                <li>Attempt to gain unauthorized access to any living space or user account that you do not have permission to join.</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <LifeBuoy size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">5. Termination & Changes to Terms</h2>
            </div>
            <div className="space-y-3 text-sm text-grayBlack leading-relaxed">
              <p>
                We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent or abusive behavior. We may update these Terms periodically, and will indicate the date of the latest revisions at the top of this document. Continued use of the Services after updates constitutes acceptance of the modified Terms.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-paleSky text-navy flex items-center justify-center flex-shrink-0">
                <FileText size={18} />
              </div>
              <h2 className="text-xl font-bold text-black">6. Contact Information</h2>
            </div>
            <div className="text-sm text-grayBlack leading-relaxed space-y-2">
              <p>If you have any questions regarding these Terms & Conditions, please contact us:</p>
              <p className="font-semibold text-navy">Email: support@baari.app</p>
              <p>Website: <a href="https://baari-app.vercel.app" className="underline hover:text-navy">https://baari-app.vercel.app</a></p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-grayBlack">
          <p>&copy; {new Date().getFullYear()} Baari. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-navy hover:underline">
              Privacy Policy
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
