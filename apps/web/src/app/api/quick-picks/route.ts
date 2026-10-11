import { NextResponse } from 'next/server';
import { db, quickPickPresets, flatMembers } from '@baari/db';
import { eq, and, asc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, user.id)));

  if (!membership) {
    return forbiddenResponse('Not a member of this flat');
  }

  const presets = await db
    .select()
    .from(quickPickPresets)
    .where(eq(quickPickPresets.flatId, flatId))
    .orderBy(asc(quickPickPresets.sortOrder));

  return NextResponse.json({ presets });
}
