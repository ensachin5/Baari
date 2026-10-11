import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { useActivity } from '../../hooks/useActivity';
import { useSession } from '../../store/session';
import { ActivityItem, ActivityEntry } from '../../components/activity/ActivityItem';
import { WeeklySummaryCard } from '../../components/kaam/WeeklySummaryCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Activity as ActivityIcon } from 'lucide-react-native';

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 16);
  const activeFlat = useSession((state) => state.activeFlat);
  const { activities, loading, refreshing, onRefresh, loadMore } = useActivity();

  const handleActivityPress = useCallback((activity: ActivityEntry) => {
    if (activity.type.startsWith('task_')) {
      router.push('/(tabs)/home');
    } else if (activity.type === 'expense_added' || activity.type === 'settlement') {
      router.push('/(tabs)/expense');
    }
  }, [router]);

  const renderItem = useCallback(({ item }: { item: ActivityEntry }) => (
    <ActivityItem activity={item} onPress={handleActivityPress} />
  ), [handleActivityPress]);

  return (
    <View style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <Text style={Typography.H1}>Flat Activity Feed</Text>
        <Text style={[Typography.Caption, styles.subHeader]}>
          Real-time updates of tasks, expenses & settlements
        </Text>
      </View>

      {loading && activities.length === 0 ? (
        <View style={{ paddingHorizontal: Spacing.xl }}>
          <CardSkeleton count={4} />
        </View>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<WeeklySummaryCard flatId={activeFlat?.id} />}
          renderItem={renderItem}
          removeClippedSubviews={Platform.OS !== 'web'}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.navy}
            />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.lg }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ActivityIcon size={40} color={Colors.sky} />
              <Text style={[Typography.H2, styles.emptyTitle]}>No activity yet</Text>
              <Text style={[Typography.BodySmall, styles.emptyText]}>
                Actions like completing tasks, adding expenses, or joining will appear here in real time.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  subHeader: {
    color: Colors.grayBlack,
    marginTop: 2,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.grayBlack,
    maxWidth: 280,
  },
});
