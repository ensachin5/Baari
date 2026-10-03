"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { InstallPwaCard } from "@/components/pwa/InstallPwaCard";
import { Bell, LogOut as LeaveIcon, LogOut } from "lucide-react";

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
      <div className="mb-6">
        <h2 className="text-[18px] font-semibold text-black mb-2">
          Settings & Preferences
        </h2>
        <Card variant="outlined" className="py-1">
          {/* Notification Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-navy" />
              <span className="text-[14px] font-medium text-black">
                Push Notifications
              </span>
            </div>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => onNotificationsChange(e.target.checked)}
              className="w-5 h-5 accent-navy cursor-pointer"
            />
          </div>

          <div className="h-[1px] bg-border" />

          {/* Leave Flat */}
          {activeFlat && (
            <button
              type="button"
              onClick={onLeaveFlat}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-offWhite transition-colors cursor-pointer"
            >
              <LeaveIcon size={20} className="text-deepNavy" />
              <span className="text-[14px] font-medium text-deepNavy">
                Leave Flat
              </span>
            </button>
          )}
        </Card>
      </div>

      {/* PWA Installation Card */}
      <div className="mb-6">
        <InstallPwaCard />
      </div>

      {/* Log Out Button */}
      <Button
        title="Sign Out"
        variant="outline"
        onClick={onLogout}
        loading={loading}
        icon={<LogOut size={18} className="text-navy" />}
        className="w-full mb-8"
      />
    </>
  );
});

SettingsList.displayName = "SettingsList";
