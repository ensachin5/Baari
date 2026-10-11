import { NextResponse } from 'next/server';
import { db, flats, flatMembers } from '@baari/db';
import { eq, and, sql } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: flatId } = await params;

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, user.id)));

  if (!membership) {
    return forbiddenResponse('Forbidden. You are not a member of this flat.');
  }

  const [flat] = await db.select().from(flats).where(eq(flats.id, flatId));
  if (!flat) {
    return NextResponse.json({ error: 'Flat not found' }, { status: 404 });
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flatMembers)
    .where(eq(flatMembers.flatId, flatId));

  return NextResponse.json({
    flat: {
      ...flat,
      memberCount: Number(countRes?.count || 1),
      role: membership.role,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  const { id: flatId } = await params;

  const [membership] = await db
    .select({ role: flatMembers.role })
    .from(flatMembers)
    .where(and(eq(flatMembers.flatId, flatId), eq(flatMembers.userId, user.id)));

  if (!membership || membership.role !== 'admin') {
    return forbiddenResponse('Only flat admins can modify flat settings.');
  }

  const body = await req.json();
  const { name } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const [updatedFlat] = await db
    .update(flats)
    .set({ name: name.trim() })
    .where(eq(flats.id, flatId))
    .returning();

  return NextResponse.json({ flat: updatedFlat });
}
