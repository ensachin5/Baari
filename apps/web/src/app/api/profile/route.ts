import { NextResponse } from 'next/server';
import { db, user, flats, flatMembers } from '@baari/db';
import { eq } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userSession.id));

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const membership = await db
    .select({
      id: flats.id,
      flatId: flats.id,
      name: flats.name,
      flatName: flats.name,
      type: flats.type,
      inviteCode: flats.inviteCode,
      role: flatMembers.role,
      joinedAt: flatMembers.joinedAt,
    })
    .from(flatMembers)
    .innerJoin(flats, eq(flatMembers.flatId, flats.id))
    .where(eq(flatMembers.userId, userSession.id))
    .limit(1);

  return NextResponse.json({
    user: currentUser,
    flat: membership[0] || null,
  });
}

export async function PATCH(req: Request) {
  const userSession = await getSessionUser(req);
  if (!userSession) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name, image } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (image !== undefined) updateData.image = image;

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, userSession.id))
      .returning();

    return NextResponse.json({ user: updatedUser });
  } catch (err: any) {
    console.error('[Update Profile Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to update profile' }, { status: 500 });
  }
}
