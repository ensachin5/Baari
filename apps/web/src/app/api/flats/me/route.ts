import { NextResponse } from 'next/server';
import { db, flats, flatMembers } from '@baari/db';
import { eq, sql } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const membership = await db
    .select({
      id: flats.id,
      name: flats.name,
      type: flats.type,
      inviteCode: flats.inviteCode,
      createdBy: flats.createdBy,
      createdAt: flats.createdAt,
      role: flatMembers.role,
      joinedAt: flatMembers.joinedAt,
    })
    .from(flatMembers)
    .innerJoin(flats, eq(flatMembers.flatId, flats.id))
    .where(eq(flatMembers.userId, user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json({ flat: null });
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flatMembers)
    .where(eq(flatMembers.flatId, membership[0].id));

  return NextResponse.json({
    flat: {
      ...membership[0],
      memberCount: Number(countRes?.count || 1),
    },
  });
}
