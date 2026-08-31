import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../../lib/theme';
import { useActivity } from '../../hooks/useActivity';
import { useSession } from '../../store/session';
import { ActivityItem, ActivityEntry } from '../../components/activity/ActivityItem';
import { WeeklySummaryCard } from '../../components/kaam/WeeklySummaryCard';
import { Activity as ActivityIcon } from 'lucide-react-native';

export default function ActivityScreen() {
  const router = useRouter();
  const activeFlat = useSession((state) => state.activeFlat);
  const { activities, loading, refreshing, onRefresh, loadMore } = useActivity();

  const handleActivityPress = (activity: ActivityEntry) => {
    if (activity.type.startsWith('task_')) {
      router.push('/(tabs)/home');
    } else if (activity.type === 'expense_added' || activity.type === 'settlement') {
      router.push('/(tabs)/expense');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={Typography.H1}>Flat Activity Feed</Text>
        <Text style={[Typography.Caption, styles.subHeader]}>
          Real-time updates of tasks, expenses & settlements
        </Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<WeeklySummaryCard flatId={activeFlat?.id} />}
        renderItem={({ item }) => (
          <ActivityItem activity={item} onPress={handleActivityPress} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.navy}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIcon size={40} color={Colors.sky} />
              <Text style={[Typography.H2, styles.emptyTitle]}>No activity yet</Text>
              <Text style={[Typography.BodySmall, styles.emptyText]}>
                Actions like completing tasks, adding expenses, or joining will appear here in real time.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
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
