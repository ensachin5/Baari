import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Typography, Spacing } from '../../lib/theme';
import { useSession } from '../../store/session';
import { authClient, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';

import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileStatsSection } from '../../components/profile/ProfileStatsSection';
import { InviteCard } from '../../components/profile/InviteCard';
import { FlatMembersList, MemberItem } from '../../components/profile/FlatMembersList';
import { SettingsList } from '../../components/profile/SettingsList';
import { EditProfileModal } from '../../components/profile/EditProfileModal';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 16);
  const user = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const setActiveFlat = useSession((state) => state.setActiveFlat);

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editImage, setEditImage] = useState<string | null>(user?.image || null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const isAdmin = activeFlat?.role === 'admin';

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
        const res = await api.get<{ members: MemberItem[] }>(`/api/flats/${activeFlat.id}/members`);
        setMembers(res.members || []);
      } catch (_) {}
    }
  }, [activeFlat?.id]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: any }>('/api/profile/stats');
      if (res.stats) {
        setProfileStats(res.stats);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadMembers();
    loadStats();
  }, [loadMembers, loadStats]);

  // Copy Invite Code using expo-clipboard
  const handleCopyInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    await Clipboard.setStringAsync(activeFlat.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share Invite Code
  const handleShareInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    try {
      await Share.share({
        message: `Join our flat "${activeFlat.name}" on Baari! Use invite code: ${activeFlat.inviteCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // Pick Image via expo-image-picker
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      const imageStr = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setEditImage(imageStr);
    }
  };

  // Submit Profile Update
  const handleUpdateProfile = async () => {
    if (!editName.trim()) return;

    try {
      setUpdatingProfile(true);
      await api.patch('/api/profile', {
        name: editName.trim(),
        image: editImage,
      });
      await fetchUserProfile();
      setIsEditModalOpen(false);
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Admin Remove Member
  const handleRemoveMember = (targetMember: MemberItem) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${targetMember.name} from the flat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/flats/${activeFlat!.id}/members/${targetMember.userId}`);
              await loadMembers();
            } catch (err: any) {
              Alert.alert('Action Failed', err.message || 'Could not remove member');
            }
          },
        },
      ]
    );
  };

  // Leave Flat
  const handleLeaveFlat = () => {
    Alert.alert(
      'Leave Flat',
      `Are you sure you want to leave ${activeFlat?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Flat',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await api.post(`/api/flats/${activeFlat!.id}/leave`);
              setActiveFlat(null);
              router.replace('/(onboarding)/choose');
            } catch (err: any) {
              Alert.alert('Cannot Leave', err.message || 'Failed to leave flat');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Sign Out
  const handleLogout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
    } catch (error) {
      console.warn('authClient.signOut error:', error);
    } finally {
      await useSession.getState().logout();
      setLoading(false);
      router.replace('/(auth)/sign-in');
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <Text style={Typography.H1}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Header Card */}
        <ProfileHeader
          user={user}
          isAdmin={isAdmin}
          onEditPress={() => {
            setEditName(user?.name || '');
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

        {/* Settings & Sign Out */}
        <SettingsList
          notificationsEnabled={notificationsEnabled}
          onNotificationsChange={setNotificationsEnabled}
          activeFlat={activeFlat}
          onLeaveFlat={handleLeaveFlat}
          onLogout={handleLogout}
          loading={loading}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editName={editName}
        setEditName={setEditName}
        editImage={editImage}
        onPickImage={handlePickImage}
        onSave={handleUpdateProfile}
        updating={updatingProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
