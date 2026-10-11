import { NextResponse } from 'next/server';
import { db, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: flatId, userId: targetUserId } = await params;
  const currentUserId = userSession.id;

  const [currentMembership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, currentUserId)));

  if (!currentMembership || currentMembership.role !== 'admin') {
    return forbiddenResponse('Forbidden. Only flat admins can remove members.');
  }

  await db
    .delete(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, targetUserId)));

  return NextResponse.json({ message: 'Member removed successfully' });
}
