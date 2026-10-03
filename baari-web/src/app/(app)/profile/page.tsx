"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/store/session";
import { signOut, fetchUserProfile } from "@/lib/auth-client";
import { api } from "@/lib/api";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStatsSection } from "@/components/profile/ProfileStatsSection";
import { InviteCard } from "@/components/profile/InviteCard";
import { FlatMembersList, MemberItem } from "@/components/profile/FlatMembersList";
import { SettingsList } from "@/components/profile/SettingsList";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

export default function ProfilePage() {
  const router = useRouter();
  const user = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const setActiveFlat = useSession((state) => state.setActiveFlat);

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

  const loadMembers = useCallback(async () => {
    if (activeFlat?.id) {
      try {
        const res = await api.get<{ members: MemberItem[] }>(
          `/api/flats/${activeFlat.id}/members`
        );
        setMembers(res.members || []);
      } catch (_) {}
    }
  }, [activeFlat?.id]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: any }>("/api/profile/stats");
      if (res?.stats) {
        setProfileStats(res.stats);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadMembers();
    loadStats();
  }, [loadMembers, loadStats]);

  // Copy Invite Code
  const handleCopyInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(activeFlat.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  // Share Invite Code
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
  const handleRemoveMember = (targetMember: MemberItem) => {
    if (
      confirm(`Are you sure you want to remove ${targetMember.name} from the flat?`)
    ) {
      api
        .delete(`/api/flats/${activeFlat!.id}/members/${targetMember.userId}`)
        .then(() => loadMembers())
        .catch((err) => alert(err?.message || "Could not remove member"));
    }
  };

  // Leave Flat
  const handleLeaveFlat = () => {
    if (confirm(`Are you sure you want to leave ${activeFlat?.name}?`)) {
      setLoading(true);
      api
        .post(`/api/flats/${activeFlat!.id}/leave`)
        .then(() => {
          setActiveFlat(null);
          router.replace("/choose");
        })
        .catch((err) => alert(err?.message || "Failed to leave flat"))
        .finally(() => setLoading(false));
    }
  };

  // Sign Out
  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.warn("signOut error:", error);
    } finally {
      await useSession.getState().logout();
      setLoading(false);
      router.replace("/sign-in");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-black">Profile & Settings</h1>
      </div>

      {/* User Header */}
      <ProfileHeader
        user={user}
        isAdmin={isAdmin}
        onEditPress={() => {
          setEditName(user?.name || "");
          setEditImage(user?.image || null);
          setIsEditModalOpen(true);
        }}
      />

      {/* Stats Tiles */}
      <ProfileStatsSection stats={profileStats} />

      {/* Flat Details & Invite Code */}
      <InviteCard
        activeFlat={activeFlat}
        copied={copied}
        onCopyInviteCode={handleCopyInviteCode}
        onShareInviteCode={handleShareInviteCode}
      />

      {/* Flat Members List */}
      <FlatMembersList
        members={members}
        currentUserId={user?.id}
        isAdmin={isAdmin}
        onRemoveMember={handleRemoveMember}
      />

      {/* Settings List */}
      <SettingsList
        notificationsEnabled={notificationsEnabled}
        onNotificationsChange={setNotificationsEnabled}
        activeFlat={activeFlat}
        onLeaveFlat={handleLeaveFlat}
        onLogout={handleLogout}
        loading={loading}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editName={editName}
        setEditName={setEditName}
        editImage={editImage}
        onFileChange={handleFileChange}
        onSave={handleUpdateProfile}
        updating={updatingProfile}
      />
    </div>
  );
}
