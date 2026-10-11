import { NextResponse } from 'next/server';
import { db, flatMembers } from '@baari/db';
import { eq, and } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const { id: flatId } = await params;
  const currentUserId = userSession.id;

  const [currentMembership] = await db
    .select()
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, currentUserId)));

  if (!currentMembership) {
    return NextResponse.json({ error: 'You are not a member of this flat.' }, { status: 404 });
  }

  if (currentMembership.role === 'admin') {
    const allMembers = await db
      .select()
      .from(flatMembers)
      .where(eq(flatMembers.flatId, flatId));

    const otherAdmins = allMembers.filter((m) => m.role === 'admin' && m.userId !== currentUserId);
    const otherMembers = allMembers.filter((m) => m.userId !== currentUserId);

    if (otherAdmins.length === 0 && otherMembers.length > 0) {
      return NextResponse.json(
        { error: 'Please assign another admin before leaving the flat.' },
        { status: 400 }
      );
    }
  }

  await db
    .delete(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, currentUserId)));

  return NextResponse.json({ message: 'Successfully left the flat' });
}
