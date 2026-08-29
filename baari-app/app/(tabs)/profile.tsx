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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { useSession } from '../../store/session';
import { authClient } from '../../lib/auth-client';
import { api } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Copy,
  Share2,
  Users,
  LogOut,
  ShieldCheck,
  Check,
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

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeFlat?.id) {
      api
        .get<{ members: MemberItem[] }>(`/api/flats/${activeFlat.id}/members`)
        .then((res) => setMembers(res.members || []))
        .catch(() => {});
    }
  }, [activeFlat?.id]);

  const handleCopyInviteCode = () => {
    if (!activeFlat?.inviteCode) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareInviteCode = async () => {
    if (!activeFlat?.inviteCode) return;
    try {
      await Share.share({
        message: `Join our flat "${activeFlat.name}" on Baari using invite code: ${activeFlat.inviteCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
              <Text style={Typography.H2}>{user?.name || 'Flatmate'}</Text>
              <Text style={[Typography.BodySmall, styles.userEmail]}>
                {user?.email || ''}
              </Text>
              <View style={styles.roleBadgeContainer}>
                <Badge
                  label={activeFlat?.role === 'admin' ? 'Flat Admin' : 'Member'}
                  status={activeFlat?.role === 'admin' ? 'done' : 'pending'}
                  showIcon={false}
                />
              </View>
            </View>
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
          </Card>
        )}

        {/* Flat Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={Typography.H2}>Flatmates ({members.length})</Text>
            <Users size={18} color={Colors.navy} />
          </View>

          <Card variant="outlined" style={styles.membersCard}>
            {members.map((member, idx) => (
              <View
                key={member.userId || idx}
                style={[
                  styles.memberRow,
                  idx !== members.length - 1 && styles.memberRowBorder,
                ]}
              >
                <Avatar name={member.name} image={member.image} size="sm" />
                <View style={styles.memberTextCol}>
                  <Text style={Typography.BodySmallMedium}>{member.name}</Text>
                  <Text style={[Typography.Caption, styles.memberEmail]}>
                    {member.email}
                  </Text>
                </View>
                {member.role === 'admin' && (
                  <Badge label="Admin" status="done" showIcon={false} />
                )}
              </View>
            ))}
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
  section: {
    marginBottom: Spacing.xl,
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
  logoutBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
