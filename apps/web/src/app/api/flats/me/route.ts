import { NextResponse } from 'next/server';
import { db, flats, flatMembers } from '@baari/db';
import { eq, sql } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

interface CachedFlat {
  flat: any;
  expiresAt: number;
}

const flatCache = new Map<string, CachedFlat>();
const FLAT_CACHE_TTL_MS = 15 * 1000; // 15 seconds

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const now = Date.now();
  const cached = flatCache.get(user.id);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ flat: cached.flat });
  }

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
    flatCache.set(user.id, { flat: null, expiresAt: now + FLAT_CACHE_TTL_MS });
    return NextResponse.json({ flat: null });
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flatMembers)
    .where(eq(flatMembers.flatId, membership[0].id));

  const flatData = {
    ...membership[0],
    memberCount: Number(countRes?.count || 1),
  };

  flatCache.set(user.id, { flat: flatData, expiresAt: now + FLAT_CACHE_TTL_MS });

  return NextResponse.json({
    flat: flatData,
  });
}

