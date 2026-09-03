"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/store/session";
import { signOut, fetchUserProfile } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Copy,
  Share2,
  Users,
  LogOut,
  ShieldCheck,
  Check,
  Edit3,
  Camera,
  Flame,
  Bell,
  LogOut as LeaveIcon,
  Trash2,
  CheckCircle2,
  HandCoins,
} from "lucide-react";

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: "admin" | "member";
}

/**
 * Mirrors baari-app/app/(tabs)/profile.tsx exactly.
 */
export default function ProfilePage() {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const setActiveFlat = useSession((state) => state.setActiveFlat);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editImage, setEditImage] = useState<string | null>(user?.image || null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const isAdmin = activeFlat?.role === "admin";

  const [profileStats, setProfileStats] = useState({
    kaamCompletedThisMonth: 0,
    currentStreak: 0,
    longestStreak: 0,
    settlementsCountThisMonth: 0,
    amountSettledThisMonth: 0,
  });

  const loadMembers = async () => {
    if (activeFlat?.id) {
      try {
        const res = await api.get<{ members: MemberItem[] }>(
          `/api/flats/${activeFlat.id}/members`
        );
        setMembers(res.members || []);
      } catch (_) {}
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get<{ stats: any }>("/api/profile/stats");
      if (res?.stats) {
        setProfileStats(res.stats);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadMembers();
    loadStats();
  }, [activeFlat?.id]);

  // Copy Invite Code
  const handleCopyInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(activeFlat.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  // Share Invite Code (native share where available, fallback to copy)
  const handleShareInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    const shareData = {
      title: "Join our flat on Baari",
      text: `Join our flat "${activeFlat.name}" on Baari! Use invite code: ${activeFlat.inviteCode}`,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) {}
    } else {
      handleCopyInviteCode();
    }
  };

  // Pick Image File on Web
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Profile Update
  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editName.trim()) return;
    try {
      setUpdatingProfile(true);
      await api.patch("/api/profile", {
        name: editName.trim(),
        image: editImage,
      });
      await fetchUserProfile();
      setIsEditModalOpen(false);
    } catch (error: any) {
      alert(error?.message || "Could not update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Admin Remove Member
  const handleRemoveMember = async (targetMember: MemberItem) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${targetMember.name} from the flat?`
      )
    ) {
      try {
        await api.delete(
          `/api/flats/${activeFlat!.id}/members/${targetMember.userId}`
        );
        await loadMembers();
      } catch (err: any) {
        alert(err?.message || "Could not remove member");
      }
    }
  };

  // Leave Flat
  const handleLeaveFlat = async () => {
    if (
      window.confirm(`Are you sure you want to leave ${activeFlat?.name}?`)
    ) {
      try {
        setLoading(true);
        await api.post(`/api/flats/${activeFlat!.id}/leave`);
        setActiveFlat(null);
        router.replace("/choose");
      } catch (err: any) {
        alert(err?.message || "Failed to leave flat");
      } finally {
        setLoading(false);
      }
    }
  };

  // Sign Out
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.warn("authClient.signOut error:", error);
    } finally {
      await useSession.getState().logout();
      setLoading(false);
      router.replace("/sign-in");
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-4xl mx-auto w-full pb-20 md:pb-6">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-white sticky top-16 z-20">
        <h1 className="text-[22px] leading-[28px] font-semibold text-black">
          Profile & Settings
        </h1>
      </div>

      <div className="px-5 pt-3 space-y-4">
        {/* User Card matching baari-app styles.userCard */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name || "User"} image={user?.image} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-[18px] leading-[24px] font-semibold text-black truncate">
                  {user?.name || "Flatmate"}
                </h2>
                {profileStats.currentStreak > 0 && (
                  <div className="flex items-center bg-[#FFFBEB] px-1.5 py-0.5 rounded-[6px] gap-0.5 border border-[#FDE68A]">
                    <Flame size={14} className="text-[#D97706] fill-[#D97706]" />
                    <span className="text-[12px] font-bold text-[#D97706]">
                      {profileStats.currentStreak}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[14px] leading-[20px] text-grayBlack truncate my-0.5">
                {user?.email || ""}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge
                  label={isAdmin ? "Flat Admin" : "Member"}
                  status={isAdmin ? "done" : "pending"}
                  showIcon={false}
                />
                {profileStats.longestStreak > 0 && (
                  <span className="text-[12px] text-grayBlack">
                    Best streak: {profileStats.longestStreak}d
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditName(user?.name || "");
                setEditImage(user?.image || null);
                setIsEditModalOpen(true);
              }}
              className="p-2 rounded-full bg-offWhite text-navy hover:bg-border/60 transition-colors cursor-pointer flex-shrink-0"
              title="Edit Profile"
            >
              <Edit3 size={18} />
            </button>
          </div>
        </Card>

        {/* 3 Simple Stats Tiles */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Tile 1 */}
          <Card
            variant="outlined"
            className="p-3 flex flex-col items-center text-center bg-[#F8FAFC]"
          >
            <div className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-1">
              <CheckCircle2 size={16} className="text-[#059669]" strokeWidth={2.2} />
            </div>
            <span className="text-[18px] leading-[24px] font-bold text-deepNavy">
              {profileStats.kaamCompletedThisMonth}
            </span>
            <span className="text-[11px] font-semibold text-deepNavy mt-0.5">
              Kaam Done
            </span>
            <span className="text-[10px] text-grayBlack">this month</span>
          </Card>

          {/* Tile 2 */}
          <Card
            variant="outlined"
            className="p-3 flex flex-col items-center text-center bg-[#F8FAFC]"
          >
            <div className="w-7 h-7 rounded-full bg-[#FFFBEB] flex items-center justify-center mb-1">
              <Flame size={16} className="text-[#D97706] fill-[#FDE68A]" strokeWidth={2} />
            </div>
            <span className="text-[18px] leading-[24px] font-bold text-deepNavy">
              {profileStats.currentStreak}d
            </span>
            <span className="text-[11px] font-semibold text-deepNavy mt-0.5">
              On-Time Streak
            </span>
            <span className="text-[10px] text-grayBlack">
              best: {profileStats.longestStreak}d
            </span>
          </Card>

          {/* Tile 3 */}
          <Card
            variant="outlined"
            className="p-3 flex flex-col items-center text-center bg-[#F8FAFC]"
          >
            <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-1">
              <HandCoins size={16} className="text-[#2563EB]" strokeWidth={2.2} />
            </div>
            <span className="text-[18px] leading-[24px] font-bold text-deepNavy truncate max-w-full">
              ₹{profileStats.amountSettledThisMonth.toFixed(0)}
            </span>
            <span className="text-[11px] font-semibold text-deepNavy mt-0.5">
              Settled
            </span>
            <span className="text-[10px] text-grayBlack truncate">
              {profileStats.settlementsCountThisMonth} payments
            </span>
          </Card>
        </div>

        {/* Flat Details & Invite Code */}
        {activeFlat && (
          <Card
            variant="elevated"
            className="p-4 bg-paleSky border-paleSky"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] font-bold text-deepNavy tracking-wider uppercase mb-0.5">
                  CURRENT FLAT
                </p>
                <h2 className="text-[18px] leading-[24px] font-semibold text-black">
                  {activeFlat.name}
                </h2>
              </div>
              <ShieldCheck size={24} className="text-navy" />
            </div>

            {/* Invite Code Box */}
            <div className="flex items-center justify-between bg-white p-3 rounded-[10px] border border-border">
              <div>
                <span className="block text-[11px] font-semibold text-grayBlack uppercase tracking-wider">
                  FLAT INVITE CODE
                </span>
                <span className="text-[20px] font-mono tracking-widest font-bold text-navy">
                  {activeFlat.inviteCode}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyInviteCode}
                  className="p-2 rounded-[8px] bg-offWhite text-navy hover:bg-border/60 transition-colors cursor-pointer"
                  title="Copy Invite Code"
                >
                  {copied ? (
                    <Check size={18} className="text-deepNavy" />
                  ) : (
                    <Copy size={18} className="text-navy" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleShareInviteCode}
                  className="p-2 rounded-[8px] bg-offWhite text-navy hover:bg-border/60 transition-colors cursor-pointer"
                  title="Share Invite Code"
                >
                  <Share2 size={18} className="text-navy" />
                </button>
              </div>
            </div>
            {copied && (
              <p className="text-[12px] text-deepNavy font-semibold text-center mt-2">
                Copied to clipboard!
              </p>
            )}
          </Card>
        )}

        {/* Flat Members List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[18px] leading-[24px] font-semibold text-black">
              Flatmates ({members.length})
            </h2>
            <Users size={18} className="text-navy" />
          </div>

          <Card variant="outlined" className="p-3 divide-y divide-border">
            {members.map((member) => {
              const isSelf = member.userId === user?.id;
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
                    <Avatar name={member.name} image={member.image} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-black truncate">
                        {member.name} {isSelf && "(You)"}
                      </p>
                      <p className="text-[12px] text-grayBlack truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {member.role === "admin" && (
                      <Badge label="Admin" status="done" showIcon={false} />
                    )}

                    {/* Admin Remove Button */}
                    {isAdmin && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        className="p-1.5 rounded-[6px] text-deepNavy hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* Settings & Preferences */}
        <div>
          <h2 className="text-[18px] leading-[24px] font-semibold text-black mb-2">
            Settings & Preferences
          </h2>
          <Card variant="outlined" className="p-3 divide-y divide-border">
            {/* Notification Toggle */}
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <Bell size={20} className="text-navy" />
                <div>
                  <span className="text-[14px] font-medium text-black block">
                    Push Notifications
                  </span>
                  <span className="text-[11px] text-grayBlack block">
                    Web push notification availability depends on your browser
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-5 h-5 accent-navy cursor-pointer"
              />
            </div>

            {/* Leave Flat */}
            {activeFlat && (
              <button
                type="button"
                onClick={handleLeaveFlat}
                className="w-full flex items-center justify-between py-2.5 text-left cursor-pointer hover:opacity-80"
              >
                <div className="flex items-center gap-2.5">
                  <LeaveIcon size={20} className="text-deepNavy" />
                  <span className="text-[14px] font-medium text-deepNavy">
                    Leave Flat
                  </span>
                </div>
              </button>
            )}
          </Card>
        </div>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          variant="outline"
          onClick={handleLogout}
          loading={loading}
          icon={<LogOut size={18} className="text-navy" />}
          className="w-full"
        />
      </div>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex flex-col items-center justify-center my-2">
            <div className="relative">
              <Avatar
                name={editName || "User"}
                image={editImage}
                size="xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-navy text-white hover:bg-deepNavy shadow-md cursor-pointer"
                title="Change Photo"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <span className="text-[12px] text-grayBlack mt-2">
              Click camera icon to select a new avatar image
            </span>
          </div>

          <Input
            label="Full Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter your name"
            required
          />

          <Input
            label="Email Address"
            value={user?.email || ""}
            disabled
            className="opacity-60 cursor-not-allowed bg-offWhite"
          />

          <Button
            type="submit"
            title="Save Changes"
            loading={updatingProfile}
            className="w-full mt-2"
          />
        </form>
      </Modal>
    </div>
  );
}
