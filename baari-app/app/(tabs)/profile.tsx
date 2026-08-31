import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  SafeAreaView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useSession } from '../../store/session';
import { authClient, fetchUserProfile } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
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
} from 'lucide-react-native';

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'admin' | 'member';
}

export default function ProfileScreen() {
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
  const [editName, setEditName] = useState(user?.name || '');
  const [editImage, setEditImage] = useState<string | null>(user?.image || null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const isAdmin = activeFlat?.role === 'admin';

  const loadMembers = async () => {
    if (activeFlat?.id) {
      try {
        const res = await api.get<{ members: MemberItem[] }>(`/api/flats/${activeFlat.id}/members`);
        setMembers(res.members || []);
      } catch (_) {}
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeFlat?.id]);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={Typography.H1}>Profile & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card variant="outlined" style={styles.userCard}>
          <View style={styles.userRow}>
            <Avatar name={user?.name || 'User'} image={user?.image} size="lg" />
            <View style={styles.userCol}>
              <View style={styles.userNameRow}>
                <Text style={Typography.H2}>{user?.name || 'Flatmate'}</Text>
                {typeof (user as any)?.currentStreak === 'number' && (user as any).currentStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <Flame size={14} color={Colors.sky} fill={Colors.sky} />
                    <Text style={styles.streakBadgeText}>{(user as any).currentStreak}</Text>
                  </View>
                )}
              </View>
              <Text style={[Typography.BodySmall, styles.userEmail]}>
                {user?.email || ''}
              </Text>
              <View style={styles.roleBadgeRow}>
                <Badge
                  label={isAdmin ? 'Flat Admin' : 'Member'}
                  status={isAdmin ? 'done' : 'pending'}
                  showIcon={false}
                />
                {typeof (user as any)?.longestStreak === 'number' && (user as any).longestStreak > 0 && (
                  <Text style={styles.longestStreakText}>
                    Best streak: {(user as any).longestStreak}d
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setEditName(user?.name || '');
                setEditImage(user?.image || null);
                setIsEditModalOpen(true);
              }}
              style={styles.editBtn}
            >
              <Edit3 size={18} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Flat Details & Invite Code */}
        {activeFlat && (
          <Card variant="elevated" style={styles.flatCard}>
            <View style={styles.flatHeader}>
              <View>
                <Text style={[Typography.Caption, styles.flatSub]}>CURRENT FLAT</Text>
                <Text style={Typography.H2}>{activeFlat.name}</Text>
              </View>
              <ShieldCheck size={24} color={Colors.navy} />
            </View>

            {/* Invite Code Box */}
            <View style={styles.inviteBox}>
              <View>
                <Text style={[Typography.Caption, styles.inviteLabel]}>
                  FLAT INVITE CODE
                </Text>
                <Text style={styles.inviteCodeText}>{activeFlat.inviteCode}</Text>
              </View>

              <View style={styles.inviteActions}>
                <TouchableOpacity
                  onPress={handleCopyInviteCode}
                  style={styles.actionIconBtn}
                  activeOpacity={0.7}
                >
                  {copied ? (
                    <Check size={18} color={Colors.deepNavy} />
                  ) : (
                    <Copy size={18} color={Colors.navy} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShareInviteCode}
                  style={styles.actionIconBtn}
                  activeOpacity={0.7}
                >
                  <Share2 size={18} color={Colors.navy} />
                </TouchableOpacity>
              </View>
            </View>
            {copied && <Text style={styles.copiedText}>Copied to clipboard!</Text>}
          </Card>
        )}

        {/* Flat Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.H2}>Flatmates ({members.length})</Text>
            <Users size={18} color={Colors.navy} />
          </View>

          <Card variant="outlined" style={styles.membersCard}>
            {members.map((member, idx) => {
              const isSelf = member.userId === user?.id;
              return (
                <View
                  key={member.userId || idx}
                  style={[
                    styles.memberRow,
                    idx !== members.length - 1 && styles.memberRowBorder,
                  ]}
                >
                  <Avatar name={member.name} image={member.image} size="sm" />
                  <View style={styles.memberTextCol}>
                    <Text style={Typography.BodySmallMedium}>
                      {member.name} {isSelf && '(You)'}
                    </Text>
                    <Text style={[Typography.Caption, styles.memberEmail]}>
                      {member.email}
                    </Text>
                  </View>

                  <View style={styles.memberActionsRight}>
                    {member.role === 'admin' && (
                      <Badge label="Admin" status="done" showIcon={false} />
                    )}

                    {/* Admin Remove Button (not shown for self) */}
                    {isAdmin && !isSelf && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleRemoveMember(member)}
                        style={styles.removeMemberBtn}
                      >
                        <Trash2 size={16} color={Colors.deepNavy} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </View>

        {/* Settings & Actions */}
        <View style={styles.section}>
          <Text style={[Typography.H2, styles.sectionTitle]}>Settings & Preferences</Text>
          <Card variant="outlined" style={styles.settingsCard}>
            {/* Notification Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Bell size={20} color={Colors.navy} />
                <Text style={Typography.BodySmallMedium}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.paleSky }}
                thumbColor={notificationsEnabled ? Colors.navy : Colors.grayBlack}
              />
            </View>

            <View style={styles.settingDivider} />

            {/* Leave Flat */}
            {activeFlat && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLeaveFlat}
                style={styles.settingRow}
              >
                <View style={styles.settingLeft}>
                  <LeaveIcon size={20} color={Colors.deepNavy} />
                  <Text style={[Typography.BodySmallMedium, { color: Colors.deepNavy }]}>
                    Leave Flat
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* Log Out Button */}
        <Button
          title="Sign Out"
          variant="outline"
          onPress={handleLogout}
          loading={loading}
          icon={<LogOut size={18} color={Colors.navy} />}
          style={styles.logoutBtn}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
      >
        <View style={styles.editAvatarContainer}>
          <Avatar name={editName || 'User'} image={editImage} size="xl" />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickImage}
            style={styles.cameraBadge}
          >
            <Camera size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <Input
          label="Full Name"
          value={editName}
          onChangeText={setEditName}
          placeholder="Enter your name"
        />

        <Input
          label="Email Address"
          value={user?.email || ''}
          editable={false}
          containerStyle={{ opacity: 0.6 }}
        />

        <Button
          title="Save Changes"
          onPress={handleUpdateProfile}
          loading={updatingProfile}
          style={{ marginTop: Spacing.md }}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  userCard: {
    marginBottom: Spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userCol: {
    flex: 1,
  },
  userEmail: {
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  roleBadgeContainer: {
    alignSelf: 'flex-start',
  },
  editBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.full,
  },
  flatCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.paleSky,
    borderColor: Colors.paleSky,
  },
  flatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  flatSub: {
    color: Colors.deepNavy,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inviteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inviteLabel: {
    color: Colors.grayBlack,
    letterSpacing: 0.5,
  },
  inviteCodeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.deepNavy,
    letterSpacing: 2,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedText: {
    ...Typography.Caption,
    color: Colors.deepNavy,
    marginTop: Spacing.xs,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  membersCard: {
    padding: Spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  memberTextCol: {
    flex: 1,
  },
  memberEmail: {
    color: Colors.grayBlack,
  },
  memberActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  removeMemberBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.xs,
  },
  settingsCard: {
    padding: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  logoutBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  editAvatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.navy,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paleSky,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 3,
  },
  streakBadgeText: {
    ...Typography.Caption,
    color: Colors.deepNavy,
    fontWeight: '700',
    fontSize: 12,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  longestStreakText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontSize: 11,
  },
});
