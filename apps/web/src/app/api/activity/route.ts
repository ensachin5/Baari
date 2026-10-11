import { NextResponse } from 'next/server';
import { db, activityLog, flatMembers, user } from '@baari/db';
import { eq, and, desc } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const flatId = searchParams.get('flatId');
  if (!flatId) {
    return NextResponse.json({ error: 'flatId query param is required' }, { status: 400 });
  }

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const activities = await db
    .select({
      id: activityLog.id,
      flatId: activityLog.flatId,
      actorId: activityLog.actorId,
      type: activityLog.type,
      referenceId: activityLog.referenceId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      actorName: user.name,
      actorImage: user.image,
    })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.actorId, user.id))
    .where(eq(activityLog.flatId, flatId))
    .orderBy(desc(activityLog.createdAt))
    .limit(50);

  return NextResponse.json({ activities });
}
