import { NextResponse } from 'next/server';
import { db, taskOccurrenceMembers, settlements } from '@baari/db';
import { eq, and, gte, or, count } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';
import { calculateUserStreak } from '@/lib/services/streaks';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || userSession.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [completedKaam] = await db
    .select({ count: count() })
    .from(taskOccurrenceMembers)
    .where(
      and(
        eq(taskOccurrenceMembers.userId, userId),
        eq(taskOccurrenceMembers.status, 'completed'),
        gte(taskOccurrenceMembers.completedAt, startOfMonth)
      )
    );

  const streak = await calculateUserStreak(userId);

  const confirmedSettlements = await db
    .select({
      amount: settlements.amount,
    })
    .from(settlements)
    .where(
      and(
        or(eq(settlements.paidBy, userId), eq(settlements.paidTo, userId)),
        eq(settlements.status, 'confirmed'),
        gte(settlements.confirmedAt, startOfMonth)
      )
    );

  const totalAmountSettled = confirmedSettlements.reduce(
    (sum, s) => sum + parseFloat(s.amount || '0'),
    0
  );

  return NextResponse.json({
    stats: {
      kaamCompletedThisMonth: completedKaam?.count || 0,
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      settlementsCountThisMonth: confirmedSettlements.length,
      amountSettledThisMonth: Math.round(totalAmountSettled * 100) / 100,
    },
  });
}
