import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Users, Trash2 } from 'lucide-react-native';

export interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'admin' | 'member';
}

interface FlatMembersListProps {
  members: MemberItem[];
  currentUserId?: string;
  isAdmin: boolean;
  onRemoveMember: (member: MemberItem) => void;
}

export const FlatMembersList: React.FC<FlatMembersListProps> = React.memo(({
  members,
  currentUserId,
  isAdmin,
  onRemoveMember,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={Typography.H2}>Flatmates ({members.length})</Text>
        <Users size={18} color={Colors.navy} />
      </View>

      <Card variant="outlined" style={styles.membersCard}>
        {members.map((member, idx) => {
          const isSelf = member.userId === currentUserId;
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
                    onPress={() => onRemoveMember(member)}
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
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  membersCard: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
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
    fontSize: 11,
  },
  memberActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeMemberBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FEF2F2',
  },
});
