import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import {
  Plus,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Receipt,
  HandCoins,
  ShieldCheck,
  UserPlus,
} from 'lucide-react-native';

export interface ActivityEntry {
  id: string;
  flatId: string;
  actorId: string;
  type:
    | 'task_created'
    | 'task_completed'
    | 'task_missed'
    | 'task_skipped'
    | 'expense_added'
    | 'settlement'
    | 'settlement_confirmed'
    | 'member_joined';
  referenceId?: string | null;
  metadata?: any;
  createdAt: string;
  actorName: string;
  actorImage?: string | null;
}

interface ActivityItemProps {
  activity: ActivityEntry;
  onPress?: (activity: ActivityEntry) => void;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onPress }) => {
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getActivityDetails = () => {
    switch (activity.type) {
      case 'task_created':
        return {
          icon: <Plus size={13} color="#4F46E5" strokeWidth={2.5} />,
          bg: '#EEF2FF',
          border: '#C7D2FE',
          actionText: `created Kaam "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'task_completed':
        return {
          icon: <CheckCircle2 size={13} color="#059669" strokeWidth={2.2} />,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          actionText: activity.metadata?.isFullyDone
            ? `completed Kaam "${activity.metadata?.taskTitle || 'Task'}"`
            : `completed part of "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'task_skipped':
        return {
          icon: <SkipForward size={13} color="#0284C7" strokeWidth={2.2} />,
          bg: '#F0F9FF',
          border: '#BAE6FD',
          actionText: `passed turn for "${activity.metadata?.taskTitle || 'Task'}" to ${activity.metadata?.passedToName || 'flatmate'}`,
        };
      case 'task_missed':
        return {
          icon: <AlertTriangle size={13} color="#DC2626" strokeWidth={2.2} />,
          bg: '#FEF2F2',
          border: '#FECACA',
          actionText: `missed Kaam "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'expense_added':
        return {
          icon: <Receipt size={13} color="#D97706" strokeWidth={2.2} />,
          bg: '#FFFBEB',
          border: '#FDE68A',
          actionText: `added expense "${activity.metadata?.title || 'Expense'}" (₹${activity.metadata?.amount || ''})`,
        };
      case 'settlement':
        return {
          icon: <HandCoins size={13} color="#2563EB" strokeWidth={2.2} />,
          bg: '#EFF6FF',
          border: '#BFDBFE',
          actionText: `sent payment of ₹${activity.metadata?.amount || ''} to ${activity.metadata?.paidToName || 'Flatmate'}`,
        };
      case 'settlement_confirmed':
        return {
          icon: <ShieldCheck size={13} color="#059669" strokeWidth={2.2} />,
          bg: '#ECFDF5',
          border: '#A7F3D0',
          actionText: `confirmed ₹${activity.metadata?.amount || ''} payment from ${activity.metadata?.paidByName || 'Flatmate'}`,
        };
      case 'member_joined':
        return {
          icon: <UserPlus size={13} color="#9333EA" strokeWidth={2.2} />,
          bg: '#FAF5FF',
          border: '#E9D5FF',
          actionText: `joined the flat`,
        };
      default:
        return {
          icon: <Plus size={13} color={Colors.navy} strokeWidth={2.2} />,
          bg: Colors.paleSky,
          border: '#BAE6FD',
          actionText: 'performed an action',
        };
    }
  };

  const { icon, bg, border, actionText } = getActivityDetails();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(activity)}
      style={styles.container}
    >
      <View style={styles.avatarWrapper}>
        <Avatar name={activity.actorName} image={activity.actorImage} size="md" />
        <View style={[styles.typeIconBadge, { backgroundColor: bg, borderColor: border }]}>
          {icon}
        </View>
      </View>

      <View style={styles.contentCol}>
        <Text style={styles.messageText}>
          <Text style={styles.actorName}>{activity.actorName} </Text>
          <Text style={styles.actionText}>{actionText}</Text>
        </Text>
        <Text style={styles.timeText}>{formatTime(activity.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  contentCol: {
    flex: 1,
  },
  messageText: {
    ...Typography.BodySmall,
    color: Colors.black,
    lineHeight: 18,
  },
  actorName: {
    fontFamily: 'Inter_600SemiBold',
    color: Colors.deepNavy,
  },
  actionText: {
    fontFamily: 'Inter_400Regular',
    color: Colors.mutedNavy,
  },
  timeText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    marginTop: 2,
  },
});
