import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../../lib/theme';
import { Avatar } from '../../ui/Avatar';
import { FlatMember } from './AssignToSelector';
import {
  RotateCcw,
  Plus,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Shuffle,
} from 'lucide-react-native';

interface RotationGroupBuilderProps {
  customGroups: Array<{ id: string; userIds: string[] }>;
  members: FlatMember[];
  unassignedUserIds: string[];
  onDeleteGroup: (groupId: string) => void;
  onRemoveMemberFromGroup: (groupId: string, userId: string) => void;
  onAddMemberToGroup: (groupId: string, userId: string) => void;
  onAddNewEmptyGroup: () => void;
  onAutoDistribute: () => void;
  onCreateSoloGroup: (userId: string) => void;
  onMoveGroup: (index: number, direction: 'up' | 'down') => void;
  getGroupTypeLabel: (count: number) => string;
  getOrdinal: (n: number) => string;
}

export const RotationGroupBuilder: React.FC<RotationGroupBuilderProps> = React.memo(({
  customGroups,
  members,
  unassignedUserIds,
  onDeleteGroup,
  onRemoveMemberFromGroup,
  onAddMemberToGroup,
  onAddNewEmptyGroup,
  onAutoDistribute,
  onCreateSoloGroup,
  onMoveGroup,
  getGroupTypeLabel,
  getOrdinal,
}) => {
  return (
    <View style={styles.pairingFlowContainer}>
      {/* STEP 1: FORM ROTATION GROUPS (MANUAL PAIRING) */}
      <View style={styles.stepBlock}>
        <View style={styles.stepHeaderRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 1</Text>
          </View>
          <Text style={styles.stepTitle}>Manual Pairing & Group Slots</Text>
        </View>
        <Text style={styles.stepSubtitle}>
          Choose who belongs in each group. Tap ✕ to remove to unassigned pool.
        </Text>

        {/* List of formed groups */}
        <View style={styles.groupsList}>
          {customGroups.map((grp, gIdx) => {
            const groupMembers = grp.userIds.map(
              (id) => members.find((m) => m.userId === id) || { userId: id, name: 'Member', image: null, role: 'member' as const }
            );
            const typeLabel = getGroupTypeLabel(grp.userIds.length);

            return (
              <View key={grp.id || gIdx} style={styles.groupCard}>
                <View style={styles.groupCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.groupTagBadge}>
                      <Text style={styles.groupTagBadgeText}>Group {gIdx + 1}</Text>
                    </View>
                    <Text style={styles.groupTypeLabel}>{typeLabel}</Text>
                  </View>

                  {customGroups.length > 1 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => onDeleteGroup(grp.id)}
                      style={styles.deleteGroupBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={13} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Group Member Chips */}
                <View style={styles.groupMembersWrap}>
                  {groupMembers.length === 0 ? (
                    <Text style={styles.emptyGroupText}>No flatmates assigned yet</Text>
                  ) : (
                    groupMembers.map((m) => (
                      <View key={m.userId} style={styles.memberSlotChip}>
                        <Avatar name={m.name} image={m.image} size="sm" />
                        <Text style={styles.memberSlotName} numberOfLines={1}>
                          {m.name.split(' ')[0]}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onRemoveMemberFromGroup(grp.id, m.userId)}
                          style={styles.removeMemberBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <X size={11} color={Colors.mutedNavy} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>

                {/* If unassigned users exist, provide quick "+ Add" pill */}
                {unassignedUserIds.length > 0 && (
                  <View style={styles.addMemberToGroupRow}>
                    <Text style={styles.addMemberHelperText}>+ Add to Group {gIdx + 1}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                      {unassignedUserIds.map((uid) => {
                        const unassignedM = members.find((m) => m.userId === uid);
                        const name = unassignedM?.name ? unassignedM.name.split(' ')[0] : 'Member';
                        return (
                          <TouchableOpacity
                            key={uid}
                            activeOpacity={0.7}
                            onPress={() => onAddMemberToGroup(grp.id, uid)}
                            style={styles.quickAddMemberChip}
                          >
                            <Plus size={10} color={Colors.navy} strokeWidth={3} />
                            <Text style={styles.quickAddMemberText}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Step 1 Footer buttons: Add empty group & Auto-balance */}
        <View style={styles.pairingActionsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAddNewEmptyGroup}
            style={styles.secondaryActionBtn}
          >
            <Plus size={12} color={Colors.navy} strokeWidth={2.4} />
            <Text style={styles.secondaryActionText}>Add Group Slot</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAutoDistribute}
            style={styles.secondaryActionBtn}
          >
            <Shuffle size={12} color={Colors.navy} strokeWidth={2.4} />
            <Text style={styles.secondaryActionText}>Auto-Balance</Text>
          </TouchableOpacity>
        </View>

        {/* LEFTOVER / UNASSIGNED SECTION */}
        {unassignedUserIds.length > 0 && (
          <View style={styles.unassignedBanner}>
            <View style={styles.unassignedBannerHeader}>
              <AlertCircle size={15} color="#D97706" />
              <Text style={styles.unassignedBannerTitle}>
                Remaining Flatmates ({unassignedUserIds.length} Leftover)
              </Text>
            </View>
            <Text style={styles.unassignedBannerDesc}>
              Place leftover flatmate(s) into an existing group or create a solo turn:
            </Text>

            <View style={styles.unassignedList}>
              {unassignedUserIds.map((uid) => {
                const m = members.find((mem) => mem.userId === uid);
                const firstName = m?.name ? m.name.split(' ')[0] : 'Member';

                return (
                  <View key={uid} style={styles.unassignedRow}>
                    <View style={styles.unassignedMemberInfo}>
                      <Avatar name={m?.name || 'Member'} image={m?.image} size="sm" />
                      <Text style={styles.unassignedMemberName}>{firstName}</Text>
                    </View>

                    <View style={styles.unassignedActionButtons}>
                      {customGroups.map((grp, gIdx) => (
                        <TouchableOpacity
                          key={grp.id || gIdx}
                          activeOpacity={0.7}
                          onPress={() => onAddMemberToGroup(grp.id, uid)}
                          style={styles.placeInGroupBtn}
                        >
                          <Text style={styles.placeInGroupText}>+ Group {gIdx + 1}</Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onCreateSoloGroup(uid)}
                        style={styles.placeSoloBtn}
                      >
                        <Text style={styles.placeSoloText}>+ Solo Turn</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* STEP 2: EXPLICIT TURN ORDER SELECTION */}
      <View style={styles.stepBlock}>
        <View style={styles.stepHeaderRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 2</Text>
          </View>
          <Text style={styles.stepTitle}>Explicit Turn Order</Text>
        </View>
        <Text style={styles.stepSubtitle}>
          Use ▲ and ▼ to choose which group goes 1st, 2nd, 3rd, etc.
        </Text>

        <View style={styles.orderList}>
          {customGroups.map((grp, idx) => {
            const names = grp.userIds
              .map((id) => members.find((m) => m.userId === id)?.name?.split(' ')[0] || 'Member')
              .join(' & ');
            const typeLabel = getGroupTypeLabel(grp.userIds.length);

            return (
              <View key={grp.id || idx} style={styles.orderRowCard}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{getOrdinal(idx + 1)} Turn</Text>
                </View>

                <View style={{ flex: 1, marginHorizontal: Spacing.sm }}>
                  <Text style={styles.orderNamesText} numberOfLines={1}>
                    {names || 'Empty Group'}
                  </Text>
                  <Text style={styles.orderTypeSub}>
                    {grp.userIds.length} {grp.userIds.length === 1 ? 'person' : 'people'} ({typeLabel})
                  </Text>
                </View>

                <View style={styles.reorderArrowsWrap}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMoveGroup(idx, 'up')}
                    disabled={idx === 0}
                    style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
                  >
                    <ChevronUp
                      size={15}
                      color={idx === 0 ? '#CBD5E1' : Colors.navy}
                      strokeWidth={2.5}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onMoveGroup(idx, 'down')}
                    disabled={idx === customGroups.length - 1}
                    style={[
                      styles.arrowBtn,
                      idx === customGroups.length - 1 && styles.arrowBtnDisabled,
                    ]}
                  >
                    <ChevronDown
                      size={15}
                      color={idx === customGroups.length - 1 ? '#CBD5E1' : Colors.navy}
                      strokeWidth={2.5}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ROTATION CONFIRMATION PREVIEW */}
      <View style={styles.rotationPreviewCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <RotateCcw size={14} color={Colors.navy} />
          <Text style={styles.rotationPreviewTitle}>
            Rotation Sequence ({customGroups.filter((g) => g.userIds.length > 0).length} turns):
          </Text>
        </View>

        <View style={styles.rotationStepsWrap}>
          {customGroups
            .filter((g) => g.userIds.length > 0)
            .map((grp, idx, validArr) => {
              const names = grp.userIds
                .map((id) => members.find((m) => m.userId === id)?.name?.split(' ')[0] || 'Member')
                .join(' & ');
              const typeLabel = getGroupTypeLabel(grp.userIds.length);

              return (
                <View key={grp.id || idx} style={styles.rotationStepRow}>
                  <View style={styles.rotationStepBadge}>
                    <Text style={styles.rotationStepBadgeText}>{getOrdinal(idx + 1)}</Text>
                  </View>
                  <Text style={styles.rotationStepNames}>
                    {names} <Text style={{ fontSize: 10, color: Colors.mutedNavy }}>({typeLabel})</Text>
                  </Text>
                  {idx < validArr.length - 1 && (
                    <Text style={styles.rotationStepArrow}>→</Text>
                  )}
                </View>
              );
            })}
        </View>
        <Text style={styles.rotationPreviewDesc}>
          Rotates in this exact sequence. Group order is stored in rotation sequence.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pairingFlowContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  stepBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  stepBadge: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  stepBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  stepSubtitle: {
    ...Typography.Caption,
    fontSize: 11,
    color: Colors.mutedNavy,
    marginBottom: Spacing.xs,
  },
  groupsList: {
    gap: Spacing.xs,
  },
  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupTagBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  groupTagBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.navy,
  },
  groupTypeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  deleteGroupBtn: {
    padding: 2,
  },
  groupMembersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingVertical: 2,
  },
  emptyGroupText: {
    fontFamily: 'Inter_400Regular_Italic',
    fontSize: 11,
    color: Colors.mutedNavy,
    paddingVertical: 4,
  },
  memberSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.full,
  },
  memberSlotName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  removeMemberBtn: {
    padding: 2,
  },
  addMemberToGroupRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addMemberHelperText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  quickAddMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickAddMemberText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.navy,
  },
  pairingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.navy,
  },
  unassignedBanner: {
    marginTop: Spacing.xs,
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  unassignedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  unassignedBannerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#92400E',
  },
  unassignedBannerDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#B45309',
    marginBottom: 6,
  },
  unassignedList: {
    gap: 6,
  },
  unassignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 6,
    borderRadius: BorderRadius.xs,
  },
  unassignedMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unassignedMemberName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  unassignedActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeInGroupBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
  },
  placeInGroupText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.navy,
  },
  placeSoloBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
  },
  placeSoloText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.deepNavy,
  },
  orderList: {
    gap: 6,
    marginTop: 4,
  },
  orderRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  orderBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.navy,
  },
  orderNamesText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.deepNavy,
  },
  orderTypeSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  reorderArrowsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arrowBtnDisabled: {
    opacity: 0.4,
  },
  rotationPreviewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  rotationPreviewTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  rotationStepsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rotationStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rotationStepBadge: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.full,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotationStepBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.white,
  },
  rotationStepNames: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.deepNavy,
  },
  rotationStepArrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.mutedNavy,
    marginLeft: 2,
  },
  rotationPreviewDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.mutedNavy,
  },
});
