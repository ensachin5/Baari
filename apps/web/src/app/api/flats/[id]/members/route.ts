import { NextResponse } from 'next/server';
import { db, flatMembers, user, flats } from '@baari/db';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';
import { calculateUserStreak } from '@/lib/services/streaks';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: flatId } = await params;

  const [callerMembership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!callerMembership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const members = await db
    .select({
      id: flatMembers.id,
      flatId: flatMembers.flatId,
      userId: flatMembers.userId,
      role: flatMembers.role,
      joinedAt: flatMembers.joinedAt,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(flatMembers)
    .innerJoin(user, eq(flatMembers.userId, user.id))
    .where(eq(flatMembers.flatId, flatId))
    .orderBy(asc(flatMembers.joinedAt));

  const membersWithStreaks = await Promise.all(
    members.map(async (m) => {
      const streak = await calculateUserStreak(m.userId);
      return {
        ...m,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      };
    })
  );

  return NextResponse.json({ members: membersWithStreaks });
}
