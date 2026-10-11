import { NextResponse } from 'next/server';
import { db, flats, flatMembers, activityLog } from '@baari/db';
import { joinFlatSchema } from '@baari/shared';
import { eq, and, sql } from 'drizzle-orm';
import { getSessionUser, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = joinFlatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid invite code' }, { status: 400 });
    }

    const { inviteCode } = parsed.data;

    const [foundFlat] = await db
      .select()
      .from(flats)
      .where(eq(flats.inviteCode, inviteCode.toUpperCase().trim()));

    if (!foundFlat) {
      return NextResponse.json({ error: 'Invalid invite code. Flat not found.' }, { status: 404 });
    }

    const [existingMember] = await db
      .select()
      .from(flatMembers)
      .where(and(eq(flatMembers.flatId, foundFlat.id), eq(flatMembers.userId, user.id)));

    const [countRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(flatMembers)
      .where(eq(flatMembers.flatId, foundFlat.id));

    if (existingMember) {
      return NextResponse.json({
        message: 'Already a member of this flat',
        flat: {
          ...foundFlat,
          role: existingMember.role,
          memberCount: Number(countRes?.count || 1),
        },
      });
    }

    await db.insert(flatMembers).values({
      flatId: foundFlat.id,
      userId: user.id,
      role: 'member',
    });

    await db.insert(activityLog).values({
      flatId: foundFlat.id,
      actorId: user.id,
      type: 'member_joined',
      referenceId: foundFlat.id,
      metadata: { flatName: foundFlat.name, role: 'member' },
    });

    const [updatedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(flatMembers)
      .where(eq(flatMembers.flatId, foundFlat.id));

    return NextResponse.json({
      message: 'Successfully joined flat',
      flat: {
        ...foundFlat,
        role: 'member',
        memberCount: Number(updatedCount?.count || 1),
      },
    });
  } catch (err: any) {
    console.error('[Join Flat Error]', err);
    return NextResponse.json({ error: err?.message || 'Failed to join flat' }, { status: 500 });
  }
}
