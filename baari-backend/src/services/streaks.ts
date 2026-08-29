import { db } from '../db/index.js';
import { taskOccurrenceMembers, taskOccurrences } from '../db/schema.js';
import { eq, and, isNotNull, desc } from 'drizzle-orm';

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

export async function calculateUserStreak(userId: string): Promise<StreakResult> {
  const completedOccurrences = await db
    .select({
      occurrenceDate: taskOccurrences.occurrenceDate,
      completedAt: taskOccurrenceMembers.completedAt,
    })
    .from(taskOccurrenceMembers)
    .innerJoin(taskOccurrences, eq(taskOccurrenceMembers.occurrenceId, taskOccurrences.id))
    .where(
      and(
        eq(taskOccurrenceMembers.userId, userId),
        eq(taskOccurrenceMembers.status, 'completed'),
        isNotNull(taskOccurrenceMembers.completedAt)
      )
    )
    .orderBy(desc(taskOccurrences.occurrenceDate));

  if (completedOccurrences.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Filter on-time completions (completedAt date <= occurrenceDate)
  const onTimeDatesSet = new Set<string>();
  completedOccurrences.forEach((item) => {
    if (item.completedAt && item.occurrenceDate) {
      const completedDateStr = new Date(item.completedAt).toISOString().split('T')[0];
      const targetDateStr = String(item.occurrenceDate);
      if (completedDateStr <= targetDateStr) {
        onTimeDatesSet.add(targetDateStr);
      }
    }
  });

  const sortedDates = Array.from(onTimeDatesSet).sort((a, b) => (a < b ? 1 : -1));
  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  let currentStreak = 0;
  let checkDate = new Date();

  // If not completed today, start checking from yesterday
  if (!onTimeDatesSet.has(todayStr)) {
    if (onTimeDatesSet.has(yesterdayStr)) {
      checkDate = yesterdayDate;
    } else {
      currentStreak = 0;
    }
  }

  if (onTimeDatesSet.has(todayStr) || onTimeDatesSet.has(yesterdayStr)) {
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (onTimeDatesSet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  const ascDates = Array.from(onTimeDatesSet).sort();
  ascDates.forEach((dStr) => {
    const curr = new Date(dStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffMs = curr.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = curr;
  });

  return { currentStreak, longestStreak };
}
