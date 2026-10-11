import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, BorderRadius } from '../../lib/theme';
import { Check } from 'lucide-react-native';

export interface AssigneeInfo {
  userId: string;
  userName: string;
  userImage?: string | null;
  status?: 'assigned' | 'completed';
}

interface AssigneeStackProps {
  assignees: AssigneeInfo[];
  maxVisible?: number;
}

export const AssigneeStack: React.FC<AssigneeStackProps> = ({
  assignees,
  maxVisible = 3,
}) => {
  if (!assignees || assignees.length === 0) return null;

  const visible = assignees.slice(0, maxVisible);
  const remaining = assignees.length - maxVisible;

  return (
    <View style={styles.container}>
      {visible.map((assignee, index) => {
        const isCompleted = assignee.status === 'completed';
        return (
          <View
            key={assignee.userId || index}
            style={[
              styles.avatarWrapper,
              { marginLeft: index === 0 ? 0 : -10, zIndex: 10 - index },
            ]}
          >
            <Avatar
              name={assignee.userName}
              image={assignee.userImage}
              size="sm"
              style={styles.avatarBorder}
            />
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Check size={8} color={Colors.white} strokeWidth={3} />
              </View>
            )}
          </View>
        );
      })}
      {remaining > 0 && (
        <View style={[styles.overflowBadge, { zIndex: 0 }]}>
          <Text style={styles.overflowText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: Colors.white,
  },
  completedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.deepNavy,
    borderRadius: BorderRadius.full,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  overflowBadge: {
    marginLeft: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.paleSky,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    ...Typography.Caption,
    color: Colors.deepNavy,
    fontWeight: '700',
  },
});
