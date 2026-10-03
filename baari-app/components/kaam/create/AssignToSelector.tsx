import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Avatar } from '../../ui/Avatar';
import { RotateCcw, SlidersHorizontal, User, Users, Check } from 'lucide-react-native';

export interface FlatMember {
  userId: string;
  name: string;
  image?: string | null;
  role: 'admin' | 'member';
}

export type AssignmentMode = 'auto_rotate' | 'custom_rotation';

interface AssignToSelectorProps {
  assignmentMode: AssignmentMode;
  onSwitchAssignmentMode: (mode: AssignmentMode) => void;
  members: FlatMember[];
  selectedAssignees: string[];
  onMemberSelect: (userId: string) => void;
  groupSize: number;
  onGroupSizeChange: (size: number) => void;
  isSingleGroup: boolean;
  children?: React.ReactNode;
}

export const AssignToSelector: React.FC<AssignToSelectorProps> = React.memo(({
  assignmentMode,
  onSwitchAssignmentMode,
  members,
  selectedAssignees,
  onMemberSelect,
  groupSize,
  onGroupSizeChange,
  isSingleGroup,
  children,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ASSIGN TO</Text>

      {/* Mode Switcher Segmented Control */}
      <View style={styles.assignmentModeTabs}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSwitchAssignmentMode('auto_rotate')}
          style={[
            styles.assignmentModeTab,
            assignmentMode === 'auto_rotate' && styles.assignmentModeTabActive,
          ]}
        >
          <RotateCcw
            size={13}
            color={assignmentMode === 'auto_rotate' ? Colors.white : Colors.mutedNavy}
          />
          <Text
            style={[
              styles.assignmentModeTabText,
              assignmentMode === 'auto_rotate' && styles.assignmentModeTabTextActive,
            ]}
          >
            Auto-rotate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSwitchAssignmentMode('custom_rotation')}
          style={[
            styles.assignmentModeTab,
            assignmentMode === 'custom_rotation' && styles.assignmentModeTabActive,
          ]}
        >
          <SlidersHorizontal
            size={13}
            color={assignmentMode === 'custom_rotation' ? Colors.white : Colors.mutedNavy}
          />
          <Text
            style={[
              styles.assignmentModeTabText,
              assignmentMode === 'custom_rotation' && styles.assignmentModeTabTextActive,
            ]}
          >
            Custom Rotation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode 1: Auto-rotate Explanation Card */}
      {assignmentMode === 'auto_rotate' && (
        <View style={styles.autoRotateCard}>
          <View style={styles.autoRotateIconWrap}>
            <RotateCcw size={18} color={Colors.navy} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoRotateTitle}>Fair Round-Robin Rotation</Text>
            <Text style={styles.autoRotateDesc}>
              Turns rotate automatically across all flatmates in equal order each time it's completed.
            </Text>
          </View>
        </View>
      )}

      {/* Mode 2: Custom Rotation */}
      {assignmentMode === 'custom_rotation' && (
        <View>
          <Text style={styles.modeHelperText}>
            Select flatmate(s) for this Kaam ({selectedAssignees.length} selected):
          </Text>

          {/* Members horizontal selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.assigneesScroll}
          >
            {members.map((m) => {
              const isSelected = selectedAssignees.includes(m.userId);
              const firstName = m.name ? m.name.split(' ')[0] : 'Member';
              return (
                <TouchableOpacity
                  key={m.userId}
                  activeOpacity={0.7}
                  onPress={() => onMemberSelect(m.userId)}
                  style={[
                    styles.assigneeItem,
                    isSelected && styles.assigneeItemActive,
                  ]}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar name={m.name} image={m.image} size="md" />
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={10} color={Colors.white} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.assigneeName,
                      isSelected && styles.assigneeNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {firstName}
                  </Text>
                  <Text style={styles.assigneeSub}>{m.role}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Case A: Exactly 1 Person Selected */}
          {selectedAssignees.length === 1 && (
            <View style={styles.singlePersonCard}>
              <View style={styles.singlePersonIconWrap}>
                <User size={18} color={Colors.navy} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.singlePersonTitle}>
                  This Kaam is assigned to {members.find((m) => m.userId === selectedAssignees[0])?.name || 'Selected Member'}
                </Text>
                <Text style={styles.singlePersonDesc}>
                  Assigned to this person on every occurrence (no rotation).
                </Text>
              </View>
            </View>
          )}

          {/* Case B: Multiple People Selected */}
          {selectedAssignees.length > 1 && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={styles.subSectionLabel}>GROUP SIZE PER TURN</Text>
              <View style={styles.groupSizeRow}>
                {/* Individual (1 person per turn) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onGroupSizeChange(1)}
                  style={[
                    styles.groupSizeChip,
                    groupSize === 1 && styles.groupSizeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.groupSizeChipText,
                      groupSize === 1 && styles.groupSizeChipTextActive,
                    ]}
                  >
                    Individual (1)
                  </Text>
                </TouchableOpacity>

                {/* Pairs (2 per turn) */}
                {selectedAssignees.length >= 2 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onGroupSizeChange(2)}
                    style={[
                      styles.groupSizeChip,
                      groupSize === 2 && styles.groupSizeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupSizeChipText,
                        groupSize === 2 && styles.groupSizeChipTextActive,
                      ]}
                    >
                      Pairs (2)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Trios (3 per turn) */}
                {selectedAssignees.length >= 3 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onGroupSizeChange(3)}
                    style={[
                      styles.groupSizeChip,
                      groupSize === 3 && styles.groupSizeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupSizeChipText,
                        groupSize === 3 && styles.groupSizeChipTextActive,
                      ]}
                    >
                      Trios (3)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* All together */}
                {selectedAssignees.length > 2 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onGroupSizeChange(selectedAssignees.length)}
                    style={[
                      styles.groupSizeChip,
                      groupSize === selectedAssignees.length && styles.groupSizeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupSizeChipText,
                        groupSize === selectedAssignees.length && styles.groupSizeChipTextActive,
                      ]}
                    >
                      All Together ({selectedAssignees.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* If single group (All together) */}
              {isSingleGroup ? (
                <View style={styles.singlePersonCard}>
                  <View style={styles.singlePersonIconWrap}>
                    <Users size={18} color={Colors.navy} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.singlePersonTitle}>
                      Assigned to {selectedAssignees.map((id) => members.find((m) => m.userId === id)?.name?.split(' ')[0] || 'Member').join(', ')} together
                    </Text>
                    <Text style={styles.singlePersonDesc}>
                      All {selectedAssignees.length} flatmates are assigned together on every occurrence (no rotation).
                    </Text>
                  </View>
                </View>
              ) : (
                children
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    color: Colors.grayBlack,
    marginBottom: 4,
  },
  assignmentModeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  assignmentModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
  },
  assignmentModeTabActive: {
    backgroundColor: Colors.navy,
  },
  assignmentModeTabText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  assignmentModeTabTextActive: {
    color: Colors.white,
  },
  autoRotateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  autoRotateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoRotateTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  autoRotateDesc: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  modeHelperText: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
    marginBottom: Spacing.xs,
  },
  assigneesScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
    paddingBottom: Spacing.xs,
  },
  assigneeItem: {
    alignItems: 'center',
    width: 64,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.offWhite,
  },
  assigneeItemActive: {
    borderColor: Colors.navy,
    backgroundColor: '#F0F9FF',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  assigneeName: {
    ...Typography.Caption,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
    textAlign: 'center',
  },
  assigneeNameActive: {
    color: Colors.navy,
  },
  assigneeSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: Colors.mutedNavy,
    textTransform: 'capitalize',
  },
  singlePersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.xs,
  },
  singlePersonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  singlePersonTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  singlePersonDesc: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    marginTop: 2,
  },
  subSectionLabel: {
    ...Typography.Caption,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    color: Colors.mutedNavy,
    marginBottom: 6,
  },
  groupSizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  groupSizeChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupSizeChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  groupSizeChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  groupSizeChipTextActive: {
    color: Colors.white,
  },
});
