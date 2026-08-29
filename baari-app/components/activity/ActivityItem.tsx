import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import {
  CheckCircle2,
  PlusCircle,
  CreditCard,
  UserPlus,
  AlertCircle,
  Receipt,
} from 'lucide-react-native';

export interface ActivityEntry {
  id: string;
  flatId: string;
  actorId: string;
  type:
    | 'task_created'
    | 'task_completed'
    | 'task_missed'
    | 'expense_added'
    | 'settlement'
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
          icon: <PlusCircle size={14} color={Colors.white} />,
          iconBg: Colors.navy,
          actionText: `created Kaam "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'task_completed':
        return {
          icon: <CheckCircle2 size={14} color={Colors.white} />,
          iconBg: Colors.deepNavy,
          actionText: activity.metadata?.isFullyDone
            ? `fully completed Kaam "${activity.metadata?.taskTitle || 'Task'}"`
            : `completed their part of "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'task_missed':
        return {
          icon: <AlertCircle size={14} color={Colors.white} />,
          iconBg: Colors.deepNavy,
          actionText: `missed Kaam "${activity.metadata?.taskTitle || 'Task'}"`,
        };
      case 'expense_added':
        return {
          icon: <Receipt size={14} color={Colors.white} />,
          iconBg: Colors.navy,
          actionText: `added expense "${activity.metadata?.title || 'Expense'}" of ₹${activity.metadata?.amount || ''}`,
        };
      case 'settlement':
        return {
          icon: <CreditCard size={14} color={Colors.white} />,
          iconBg: Colors.deepSky,
          actionText: `recorded payment of ₹${activity.metadata?.amount || ''} to ${activity.metadata?.paidToName || 'Flatmate'}`,
        };
      case 'member_joined':
        return {
          icon: <UserPlus size={14} color={Colors.white} />,
          iconBg: Colors.navy,
          actionText: `joined flat as ${activity.metadata?.role || 'member'}`,
        };
      default:
        return {
          icon: <PlusCircle size={14} color={Colors.white} />,
          iconBg: Colors.navy,
          actionText: 'performed an action',
        };
    }
  };

  const { icon, iconBg, actionText } = getActivityDetails();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress && onPress(activity)}
      style={styles.container}
    >
      <View style={styles.avatarWrapper}>
        <Avatar
          name={activity.actorName}
          image={activity.actorImage}
          size="md"
        />
        <View style={[styles.typeIconBadge, { backgroundColor: iconBg }]}>
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
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  contentCol: {
    flex: 1,
  },
  messageText: {
    ...Typography.BodySmall,
    color: Colors.black,
    lineHeight: 20,
    marginBottom: 2,
  },
  actorName: {
    fontWeight: '700',
    color: Colors.black,
  },
  actionText: {
    color: Colors.grayBlack,
  },
  timeText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    fontSize: 11,
  },
});
