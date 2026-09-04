import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '../ui/Card';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Megaphone, Pin, X, Plus, ChevronRight } from 'lucide-react-native';
import { AnnouncementItem, AnnouncementsModal } from './AnnouncementsModal';
import { CreateAnnouncementModal } from './CreateAnnouncementModal';

interface AnnouncementBannerProps {
  flatId?: string | null;
}

const DISMISSED_STORAGE_KEY = 'baari_dismissed_announcements';

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ flatId }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadDismissed = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        setDismissedIds(new Set(parsed));
      }
    } catch (_) {}
  }, []);

  const loadAnnouncements = useCallback(async () => {
    if (!flatId) return;
    setLoading(true);
    try {
      const res = await api.get<{ announcements: AnnouncementItem[] }>(
        `/api/announcements?flatId=${flatId}`
      );
      setAnnouncements(res.announcements || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [flatId]);

  useEffect(() => {
    loadDismissed();
    loadAnnouncements();
  }, [loadDismissed, loadAnnouncements]);

  // Real-time socket listener
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAnnouncementUpdated = () => {
      loadAnnouncements();
    };

    socket.on('announcement_updated', handleAnnouncementUpdated);
    return () => {
      socket.off('announcement_updated', handleAnnouncementUpdated);
    };
  }, [loadAnnouncements]);

  const handleDismiss = async (id: string) => {
    const nextSet = new Set(dismissedIds);
    nextSet.add(id);
    setDismissedIds(nextSet);
    try {
      await AsyncStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(nextSet)));
    } catch (_) {}
  };

  // Find the top visible announcement (pinned first, non-dismissed)
  const visibleAnnouncement = announcements.find((a) => !dismissedIds.has(a.id));

  // If there are no announcements at all and none visible, show a subtle quick notice affordance or null
  if (!visibleAnnouncement && announcements.length === 0) {
    return (
      <>
        <CreateAnnouncementModal
          visible={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadAnnouncements}
        />
        <AnnouncementsModal
          visible={isAllModalOpen}
          onClose={() => setIsAllModalOpen(false)}
          announcements={announcements}
          loading={loading}
          onRefresh={loadAnnouncements}
        />
      </>
    );
  }

  // If user dismissed all notices, show a small collapsible bar with "View notices" + "+"
  if (!visibleAnnouncement && announcements.length > 0) {
    return (
      <View style={styles.collapsedBar}>
        <TouchableOpacity
          style={styles.collapsedBtn}
          onPress={() => setIsAllModalOpen(true)}
          activeOpacity={0.7}
        >
          <Megaphone size={14} color={Colors.mutedNavy} />
          <Text style={styles.collapsedText}>
            {announcements.length} {announcements.length === 1 ? 'notice' : 'notices'} posted
          </Text>
          <ChevronRight size={14} color={Colors.mutedNavy} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallPlusBtn}
          onPress={() => setIsCreateOpen(true)}
          activeOpacity={0.7}
        >
          <Plus size={14} color={Colors.navy} />
        </TouchableOpacity>

        <AnnouncementsModal
          visible={isAllModalOpen}
          onClose={() => setIsAllModalOpen(false)}
          announcements={announcements}
          loading={loading}
          onRefresh={loadAnnouncements}
        />
        <CreateAnnouncementModal
          visible={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={loadAnnouncements}
        />
      </View>
    );
  }

  if (!visibleAnnouncement) return null;

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.bannerCard}>
        {/* Banner Top Row */}
        <View style={styles.headerRow}>
          <View style={styles.labelGroup}>
            <View style={styles.megaphoneCircle}>
              <Megaphone size={12} color={Colors.navy} />
            </View>
            <Text style={styles.noticeLabel}>NOTICE</Text>
            {visibleAnnouncement.pinned && (
              <View style={styles.pinTag}>
                <Pin size={9} color={Colors.navy} />
                <Text style={styles.pinTagText}>PINNED</Text>
              </View>
            )}
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setIsCreateOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={14} color={Colors.navy} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => handleDismiss(visibleAnnouncement.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={Colors.mutedNavy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner Content */}
        <View style={styles.bodyGroup}>
          <Text style={styles.titleText} numberOfLines={1}>
            {visibleAnnouncement.title}
          </Text>
          <Text style={styles.bodyText} numberOfLines={2}>
            {visibleAnnouncement.body}
          </Text>
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          <Text style={styles.authorText}>
            By {visibleAnnouncement.authorName.split(' ')[0]}
          </Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => setIsAllModalOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>
              View all ({announcements.length})
            </Text>
            <ChevronRight size={12} color={Colors.navy} />
          </TouchableOpacity>
        </View>
      </Card>

      <AnnouncementsModal
        visible={isAllModalOpen}
        onClose={() => setIsAllModalOpen(false)}
        announcements={announcements}
        loading={loading}
        onRefresh={loadAnnouncements}
      />
      <CreateAnnouncementModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={loadAnnouncements}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  bannerCard: {
    backgroundColor: Colors.offWhite,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  megaphoneCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  pinTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.navy,
    letterSpacing: 0.4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 2,
  },
  bodyGroup: {
    gap: 2,
  },
  titleText: {
    ...Typography.Body,
    fontWeight: '700',
    color: Colors.grayBlack,
  },
  bodyText: {
    ...Typography.Caption,
    color: Colors.grayBlack,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  authorText: {
    fontSize: 11,
    color: Colors.mutedNavy,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.navy,
  },
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.offWhite,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collapsedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  collapsedText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '500',
  },
  smallPlusBtn: {
    padding: 4,
  },
});
