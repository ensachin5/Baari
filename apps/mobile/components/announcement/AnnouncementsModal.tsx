import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../lib/theme';
import { api } from '../../lib/api';
import { useSession } from '../../store/session';
import { Pin, Trash2, Plus, Megaphone } from 'lucide-react-native';
import { CreateAnnouncementModal } from './CreateAnnouncementModal';

export interface AnnouncementItem {
  id: string;
  flatId: string;
  postedBy: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  authorName: string;
  authorImage?: string | null;
}

interface AnnouncementsModalProps {
  visible: boolean;
  onClose: () => void;
  announcements: AnnouncementItem[];
  loading: boolean;
  onRefresh: () => void;
}

export const AnnouncementsModal: React.FC<AnnouncementsModalProps> = ({
  visible,
  onClose,
  announcements,
  loading,
  onRefresh,
}) => {
  const currentUser = useSession((state) => state.user);
  const activeFlat = useSession((state) => state.activeFlat);
  const isAdmin = activeFlat?.role === 'admin';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (item: AnnouncementItem) => {
    Alert.alert(
      'Delete Notice',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await api.delete(`/api/announcements/${item.id}`);
              onRefresh();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete announcement');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  return (
    <>
      <Modal visible={visible} onClose={onClose} title="Notice Board">
        <View style={styles.container}>
          {/* Header Action Bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarCount}>
              {announcements.length} {announcements.length === 1 ? 'Notice' : 'Notices'}
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setIsCreateOpen(true)}
              activeOpacity={0.7}
            >
              <Plus size={14} color={Colors.white} />
              <Text style={styles.addBtnText}>New Notice</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.navy} />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Megaphone size={32} color={Colors.mutedNavy} />
              <Text style={styles.emptyTitle}>No notices yet</Text>
              <Text style={styles.emptySub}>
                Post important updates here so flatmates never miss them in chat.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
              {announcements.map((item) => {
                const canDelete = item.postedBy === currentUser?.id || isAdmin;
                return (
                  <Card key={item.id} variant="outlined" style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.titleRow}>
                        {item.pinned && (
                          <View style={styles.pinBadge}>
                            <Pin size={10} color={Colors.navy} />
                            <Text style={styles.pinBadgeText}>Pinned</Text>
                          </View>
                        )}
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </View>
                      {canDelete && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                        >
                          <Trash2 size={14} color={Colors.mutedNavy} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.cardBody}>{item.body}</Text>

                    <View style={styles.cardFooter}>
                      <View style={styles.authorRow}>
                        <Avatar name={item.authorName} image={item.authorImage} size="xs" />
                        <Text style={styles.authorName}>{item.authorName}</Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>

      <CreateAnnouncementModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
    gap: Spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarCount: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  addBtnText: {
    ...Typography.Caption,
    color: Colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.Body,
    fontWeight: '600',
    color: Colors.grayBlack,
  },
  emptySub: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  scrollList: {
    maxHeight: 440,
  },
  scrollContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  card: {
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  titleRow: {
    flex: 1,
    gap: 4,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  pinBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.navy,
  },
  cardTitle: {
    ...Typography.H3,
    color: Colors.grayBlack,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  cardBody: {
    ...Typography.Body,
    color: Colors.grayBlack,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  authorName: {
    ...Typography.Caption,
    fontWeight: '500',
    color: Colors.grayBlack,
  },
  dateText: {
    ...Typography.Caption,
    color: Colors.mutedNavy,
  },
});
