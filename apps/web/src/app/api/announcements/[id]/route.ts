import { NextResponse } from 'next/server';
import { db, announcements, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id } = await params;
  const [announcement] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id));

  if (!announcement) {
    return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
  }

  // Check membership and role (creator or admin)
  const [membership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, announcement.flatId), eq(flatMembers.userId, userSession.id)));

  if (!membership) {
    return forbiddenResponse('Not a member of this flat');
  }

  if (membership.role !== 'admin' && announcement.postedBy !== userSession.id) {
    return forbiddenResponse('Only admin or poster can delete this announcement');
  }

  await db.delete(announcements).where(eq(announcements.id, id));

  return NextResponse.json({ success: true });
}
