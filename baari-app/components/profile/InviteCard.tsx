import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Card } from '../ui/Card';
import { ShieldCheck, Copy, Check, Share2 } from 'lucide-react-native';

interface InviteCardProps {
  activeFlat: {
    name: string;
    inviteCode: string;
  } | null;
  copied: boolean;
  onCopyInviteCode: () => void;
  onShareInviteCode: () => void;
}

export const InviteCard: React.FC<InviteCardProps> = React.memo(({
  activeFlat,
  copied,
  onCopyInviteCode,
  onShareInviteCode,
}) => {
  if (!activeFlat) return null;

  return (
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
            onPress={onCopyInviteCode}
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
            onPress={onShareInviteCode}
            style={styles.actionIconBtn}
            activeOpacity={0.7}
          >
            <Share2 size={18} color={Colors.navy} />
          </TouchableOpacity>
        </View>
      </View>
      {copied && <Text style={styles.copiedText}>Copied to clipboard!</Text>}
    </Card>
  );
});

const styles = StyleSheet.create({
  flatCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  flatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  flatSub: {
    color: Colors.mutedNavy,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  inviteBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inviteLabel: {
    fontSize: 10,
    color: Colors.mutedNavy,
  },
  inviteCodeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.navy,
    letterSpacing: 2,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionIconBtn: {
    padding: Spacing.xs + 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copiedText: {
    ...Typography.Caption,
    color: Colors.navy,
    textAlign: 'right',
    marginTop: 4,
  },
});
