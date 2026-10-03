import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Bell, LogOut as LeaveIcon, LogOut } from 'lucide-react-native';

interface SettingsListProps {
  notificationsEnabled: boolean;
  onNotificationsChange: (enabled: boolean) => void;
  activeFlat: any;
  onLeaveFlat: () => void;
  onLogout: () => void;
  loading: boolean;
}

export const SettingsList: React.FC<SettingsListProps> = React.memo(({
  notificationsEnabled,
  onNotificationsChange,
  activeFlat,
  onLeaveFlat,
  onLogout,
  loading,
}) => {
  return (
    <>
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
              onValueChange={onNotificationsChange}
              trackColor={{ false: Colors.border, true: Colors.paleSky }}
              thumbColor={notificationsEnabled ? Colors.navy : Colors.grayBlack}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Leave Flat */}
          {activeFlat && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onLeaveFlat}
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
        onPress={onLogout}
        loading={loading}
        icon={<LogOut size={18} color={Colors.navy} />}
        style={styles.logoutBtn}
      />
    </>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  settingsCard: {
    paddingVertical: Spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  logoutBtn: {
    marginBottom: Spacing.xxl,
  },
});
